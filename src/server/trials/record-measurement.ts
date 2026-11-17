import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { isStaff, type SessionUser } from "../auth/policy";
import { getPrisma } from "../db/client";
import { findIntakeForUser } from "../db/intakes";
import { recordEvent } from "../events";

/** Tests measured with a stopwatch (the others are counts, added in T-031). */
export const timedTrialTypes = [
  "sprint_20m",
  "shuttle_5_10_5",
  "dribbling",
] as const;
export type TimedTrialType = (typeof timedTrialTypes)[number];

/** Two attempts per test; the better one counts (docs/scoring.md). */
export const MAX_ATTEMPTS = 2;

export const recordMeasurementSchema = z.object({
  intakeId: z.uuid(),
  trialType: z.enum(timedTrialTypes),
  candidateId: z.uuid(),
  attempt: z.number().int().min(1).max(MAX_ATTEMPTS),
  /** Seconds. Stored with hundredths of a second. */
  value: z
    .number()
    .min(0.1)
    .max(300)
    .transform((value) => Math.round(value * 100) / 100),
  /**
   * Chosen by the sender. Sending the same save again (a retry after a lost
   * connection) changes nothing: it is also the journal event id.
   */
  clientEventId: z.uuid(),
  occurredAtDevice: z.coerce.date().optional(),
});

export type RecordMeasurementInput = z.input<typeof recordMeasurementSchema>;

export type RecordMeasurementResult =
  | { ok: true; duplicate: boolean }
  | {
      ok: false;
      code: "invalid" | "forbidden" | "not_found" | "closed" | "attempt_taken";
    };

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "P2002";
}

/**
 * Saves one stopwatch result for a child. Only staff of the intake's own
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
      const already = await tx.event.findUnique({
        where: { id: data.clientEventId },
        select: { id: true },
      });
      if (already) return { ok: true, duplicate: true } as const;

      const taken = await tx.measurement.findUnique({
        where: {
          candidateId_trialId_attempt: {
            candidateId: candidate.id,
            trialId: trial.id,
            attempt: data.attempt,
          },
        },
        select: { id: true },
      });
      if (taken) return { ok: false, code: "attempt_taken" } as const;

      await tx.measurement.create({
        data: {
          candidateId: candidate.id,
          trialId: trial.id,
          attempt: data.attempt,
          value: data.value,
          source: "timer",
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
      return { ok: true, duplicate: false } as const;
    });
  } catch (error) {
    // Two people saved the same attempt at the same moment.
    if (isUniqueViolation(error)) return { ok: false, code: "attempt_taken" };
    throw error;
  }
}
