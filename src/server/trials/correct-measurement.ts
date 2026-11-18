import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { isStaff, type SessionUser } from "../auth/policy";
import { getPrisma } from "../db/client";
import { findIntakeForUser } from "../db/intakes";
import { recordEvent } from "../events";
import { correctionReasons } from "@/lib/correction-reasons";
import { valueSchemaFor, trialTypes } from "./record-measurement";

export const correctMeasurementSchema = z.object({
  intakeId: z.uuid(),
  measurementId: z.uuid(),
  /** Checked against the rules of the test once the measurement is loaded. */
  value: z.number().finite(),
  reason: z.enum(correctionReasons),
  /** Chosen by the sender; a retry with the same id changes nothing. */
  clientEventId: z.uuid(),
  occurredAtDevice: z.coerce.date().optional(),
});

export type CorrectMeasurementInput = z.input<typeof correctMeasurementSchema>;

export type CorrectMeasurementResult =
  | { ok: true; duplicate: boolean; value: number }
  | {
      ok: false;
      code:
        | "invalid"
        | "forbidden"
        | "not_found"
        | "closed"
        | "unchanged"
        | "conflict";
    };

/**
 * Corrects an already saved result. The journal is append-only: the old value
 * stays in the `measurement_corrected` event together with the reason, the
 * author and the time. Only staff of the intake's own academy, while the
 * intake is taking part (open or testing).
 */
export async function correctMeasurement(
  user: Pick<SessionUser, "id" | "role" | "organizationId">,
  input: unknown,
  client?: PrismaClient,
): Promise<CorrectMeasurementResult> {
  if (!isStaff(user) || user.organizationId === null) {
    return { ok: false, code: "forbidden" };
  }
  const organizationId = user.organizationId;

  const parsed = correctMeasurementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const data = parsed.data;

  const prisma = client ?? getPrisma();

  const intake = await findIntakeForUser(user, data.intakeId, prisma);
  if (!intake) return { ok: false, code: "not_found" };
  if (intake.status !== "open" && intake.status !== "testing") {
    return { ok: false, code: "closed" };
  }

  return prisma.$transaction(async (tx) => {
    // A retry of a correction that already went through.
    const already = await tx.event.findUnique({
      where: { id: data.clientEventId },
      select: { id: true },
    });
    if (already)
      return { ok: true, duplicate: true, value: data.value } as const;

    const measurement = await tx.measurement.findFirst({
      where: { id: data.measurementId, candidate: { intakeId: intake.id } },
      select: {
        id: true,
        attempt: true,
        value: true,
        candidateId: true,
        trial: { select: { type: true } },
      },
    });
    if (!measurement) return { ok: false, code: "not_found" } as const;

    const type = z.enum(trialTypes).safeParse(measurement.trial.type);
    if (!type.success) return { ok: false, code: "invalid" } as const;
    const value = valueSchemaFor(type.data).safeParse(data.value);
    if (!value.success) return { ok: false, code: "invalid" } as const;
    if (value.data === measurement.value) {
      return { ok: false, code: "unchanged" } as const;
    }

    // Someone else changed it between the read and the write: do not overwrite.
    const updated = await tx.measurement.updateMany({
      where: { id: measurement.id, value: measurement.value },
      data: { value: value.data },
    });
    if (updated.count !== 1) return { ok: false, code: "conflict" } as const;

    // Pseudonymous ids and numbers only: no names or contacts.
    await recordEvent(
      {
        id: data.clientEventId,
        type: "measurement_corrected",
        organizationId,
        intakeId: intake.id,
        participantId: measurement.candidateId,
        actorId: user.id,
        actorRole: user.role,
        source: "web",
        occurredAtDevice: data.occurredAtDevice ?? new Date(),
        payload: {
          trialType: type.data,
          attempt: measurement.attempt,
          previousValue: measurement.value,
          value: value.data,
          reason: data.reason,
        },
      },
      tx,
    );
    return { ok: true, duplicate: false, value: value.data } as const;
  });
}
