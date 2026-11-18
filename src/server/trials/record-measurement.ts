import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { isStaff, type SessionUser } from "../auth/policy";
import { getPrisma } from "../db/client";
import { findIntakeForUser } from "../db/intakes";
import { recordEvent } from "../events";

/** Tests measured with a stopwatch. */
export const timedTrialTypes = [
  "sprint_30m",
  "shuttle_5_10_5",
  "dribbling",
] as const;
export type TimedTrialType = (typeof timedTrialTypes)[number];

/** Tests counted as successes out of ATTEMPTS_OUT_OF tries. */
export const countedTrialTypes = ["passing", "shooting"] as const;
export type CountedTrialType = (typeof countedTrialTypes)[number];

export const trialTypes = [...timedTrialTypes, ...countedTrialTypes] as const;
export type TrialType = (typeof trialTypes)[number];

/** Passing and shooting: successes out of 10 tries (docs/scoring.md). */
export const COUNT_MAX = 10;

export function isTimedTrial(type: TrialType): type is TimedTrialType {
  return (timedTrialTypes as readonly string[]).includes(type);
}

/** Seconds, stored with hundredths of a second. */
export const timedValueSchema = z
  .number()
  .min(0.1)
  .max(300)
  .transform((value) => Math.round(value * 100) / 100);

/** A whole number of successes, 0..10. */
export const countedValueSchema = z.number().int().min(0).max(COUNT_MAX);

/** The value rules of one test: seconds for timed tests, a count for the rest. */
export function valueSchemaFor(type: TrialType) {
  return isTimedTrial(type) ? timedValueSchema : countedValueSchema;
}

/** Two attempts per test; the better one counts (docs/scoring.md). */
export const MAX_ATTEMPTS = 2;

const commonFields = {
  intakeId: z.uuid(),
  candidateId: z.uuid(),
  attempt: z.number().int().min(1).max(MAX_ATTEMPTS),
  /**
   * Chosen by the sender. Sending the same save again (a retry after a lost
   * connection) changes nothing: it is also the journal event id.
   */
  clientEventId: z.uuid(),
  occurredAtDevice: z.coerce.date().optional(),
};

export const recordMeasurementSchema = z.union([
  z.object({
    ...commonFields,
    trialType: z.enum(timedTrialTypes),
    value: timedValueSchema,
  }),
  z.object({
    ...commonFields,
    trialType: z.enum(countedTrialTypes),
    value: countedValueSchema,
  }),
]);

export type RecordMeasurementInput = z.input<typeof recordMeasurementSchema>;

export type RecordMeasurementResult =
  | { ok: true; duplicate: boolean; measurementId: string }
  | {
      ok: false;
      code: "invalid" | "forbidden" | "not_found" | "closed" | "attempt_taken";
    };

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "P2002";
}

/**
 * Saves one result (stopwatch time or a count of successes) for a child. Only staff of the intake's own
 * academy; the intake must be taking part (open or testing). The first result
 * of a child also marks them as arrived. Writes the journal events in the
 * same transaction.
 */
export async function recordMeasurement(
  user: Pick<SessionUser, "id" | "role" | "organizationId">,
  input: unknown,
  client?: PrismaClient,
): Promise<RecordMeasurementResult> {
  if (!isStaff(user) || user.organizationId === null) {
    return { ok: false, code: "forbidden" };
  }
  const organizationId = user.organizationId;

  const parsed = recordMeasurementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const data = parsed.data;

  // Created after the cheap checks above, so they work without a database.
  const prisma = client ?? getPrisma();

  // Another academy's intake looks exactly like a missing one.
  const intake = await findIntakeForUser(user, data.intakeId, prisma);
  if (!intake) return { ok: false, code: "not_found" };
  if (intake.status !== "open" && intake.status !== "testing") {
    return { ok: false, code: "closed" };
  }

  const [candidate, trial] = await Promise.all([
    prisma.candidate.findFirst({
      where: { id: data.candidateId, intakeId: intake.id },
      select: { id: true, status: true },
    }),
    prisma.trial.findUnique({
      where: { intakeId_type: { intakeId: intake.id, type: data.trialType } },
      select: { id: true },
    }),
  ]);
  if (!candidate || !trial) return { ok: false, code: "not_found" };

  const now = new Date();
  try {
    return await prisma.$transaction(async (tx) => {
      // A retry of a save that already went through.
      const existing = await tx.measurement.findUnique({
        where: {
          candidateId_trialId_attempt: {
            candidateId: candidate.id,
            trialId: trial.id,
            attempt: data.attempt,
          },
        },
        select: { id: true },
      });
      const already = await tx.event.findUnique({
        where: { id: data.clientEventId },
        select: { id: true },
      });
      if (already && existing) {
        return {
          ok: true,
          duplicate: true,
          measurementId: existing.id,
        } as const;
      }
      if (existing) return { ok: false, code: "attempt_taken" } as const;

      const created = await tx.measurement.create({
        data: {
          candidateId: candidate.id,
          trialId: trial.id,
          attempt: data.attempt,
          value: data.value,
          source: isTimedTrial(data.trialType) ? "timer" : "manual",
          recordedById: user.id,
        },
      });

      const base = {
        organizationId,
        intakeId: intake.id,
        participantId: candidate.id,
        actorId: user.id,
        actorRole: user.role,
        source: "web" as const,
      };

      if (candidate.status === "registered") {
        await tx.candidate.update({
          where: { id: candidate.id },
          data: { status: "checked_in" },
        });
        await recordEvent(
          {
            ...base,
            id: crypto.randomUUID(),
            type: "participant_checked_in",
            occurredAtDevice: now,
            payload: {},
          },
          tx,
        );
      }

      // Pseudonymous ids and numbers only: no names or contacts.
      await recordEvent(
        {
          ...base,
          id: data.clientEventId,
          type: "measurement_recorded",
          occurredAtDevice: data.occurredAtDevice ?? now,
          payload: {
            trialType: data.trialType,
            attempt: data.attempt,
            value: data.value,
          },
        },
        tx,
      );
      return {
        ok: true,
        duplicate: false,
        measurementId: created.id,
      } as const;
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // Two sends at the same moment. If the other one was this very save (same
    // event id, e.g. a double tap or two tabs flushing), it is a duplicate and
    // not a refusal; otherwise someone else took the attempt.
    const [sameEvent, saved] = await Promise.all([
      prisma.event.findUnique({
        where: { id: data.clientEventId },
        select: { id: true },
      }),
      prisma.measurement.findUnique({
        where: {
          candidateId_trialId_attempt: {
            candidateId: candidate.id,
            trialId: trial.id,
            attempt: data.attempt,
          },
        },
        select: { id: true },
      }),
    ]);
    if (sameEvent && saved) {
      return { ok: true, duplicate: true, measurementId: saved.id };
    }
    return { ok: false, code: "attempt_taken" };
  }
}
