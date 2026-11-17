import type { Event, PrismaClient, Prisma } from "@/generated/prisma/client";
import { getPrisma } from "../db/client";
import { hashPayload } from "./canonical-json";
import {
  EventError,
  eventInputSchema,
  findPersonalDataKey,
  type EventInput,
} from "./types";

export type RecordResult = { event: Event; created: boolean };

/** Anything with an `event` table: the client itself or a transaction. */
export type EventDb = Pick<PrismaClient, "event">;

type ObjectRef = {
  organizationId: string;
  intakeId?: string | null;
  participantId?: string | null;
};

/**
 * The "object" an event is about, used to chain events together:
 * the participant if there is one, else the intake, else the academy.
 */
function objectFilter(ref: ObjectRef): Prisma.EventWhereInput {
  if (ref.participantId) {
    return {
      organizationId: ref.organizationId,
      participantId: ref.participantId,
    };
  }
  if (ref.intakeId) {
    return {
      organizationId: ref.organizationId,
      intakeId: ref.intakeId,
      participantId: null,
    };
  }
  return {
    organizationId: ref.organizationId,
    intakeId: null,
    participantId: null,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "P2002";
}

/**
 * Appends an event to the journal. Safe to call twice with the same event:
 * the second call returns the stored event and writes nothing. Reusing an id
 * for different content is an error.
 */
export async function recordEvent(
  input: EventInput,
  prisma: EventDb = getPrisma(),
): Promise<RecordResult> {
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new EventError(`Invalid event: ${details}`);
  }
  const data = parsed.data;

  const personalKey = findPersonalDataKey(data.payload);
  if (personalKey) {
    throw new EventError(
      `Event payload must not contain personal data (key "${personalKey}")`,
    );
  }

  const payloadHash = hashPayload(data.payload);

  const existingResult = async (): Promise<RecordResult | null> => {
    const existing = await prisma.event.findUnique({ where: { id: data.id } });
    if (!existing) return null;
    if (existing.payloadHash !== payloadHash || existing.type !== data.type) {
      throw new EventError(
        `Event id ${data.id} is already used by another event`,
      );
    }
    return { event: existing, created: false };
  };

  const already = await existingResult();
  if (already) return already;

  const previous = await prisma.event.findFirst({
    where: objectFilter(data),
    orderBy: [{ occurredAtServer: "desc" }, { id: "desc" }],
    select: { id: true },
  });

  try {
    const event = await prisma.event.create({
      data: {
        id: data.id,
        type: data.type,
        actorId: data.actorId,
        actorRole: data.actorRole,
        organizationId: data.organizationId,
        intakeId: data.intakeId,
        participantId: data.participantId,
        occurredAtDevice: data.occurredAtDevice,
        payload: data.payload as Prisma.InputJsonObject,
        payloadHash,
        previousEventId: previous?.id,
        source: data.source,
        ipHash: data.ipHash,
        deviceIdHash: data.deviceIdHash,
      },
    });
    return { event, created: true };
  } catch (error) {
    // Two senders delivered the same event at once: return the winner.
    if (isUniqueViolation(error)) {
      const raced = await existingResult();
      if (raced) return raced;
    }
    throw error;
  }
}

/** Events about one object (participant, intake or academy), oldest first. */
export async function listEvents(
  ref: ObjectRef,
  prisma: EventDb = getPrisma(),
): Promise<Event[]> {
  return prisma.event.findMany({
    where: objectFilter(ref),
    orderBy: [{ occurredAtServer: "asc" }, { id: "asc" }],
  });
}
