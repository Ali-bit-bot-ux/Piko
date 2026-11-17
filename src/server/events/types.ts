import { z } from "zod";

export const eventTypes = [
  "registration_created",
  "consent_granted",
  "tryout_published",
  "participant_checked_in",
  "measurement_recorded",
  "evaluation_scored",
  "measurement_corrected",
  "evaluation_reopened",
  "decision_changed",
  "report_sent",
  "report_opened",
  "login_attempt",
] as const;

export const eventSources = [
  "mobile_offline",
  "mobile_online",
  "web",
  "system",
] as const;

export const eventRoles = ["admin", "director", "coach", "parent"] as const;

export class EventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventError";
  }
}

// Key names that suggest personal data. The journal keeps only pseudonymous
// ids (D-020); this guard catches the obvious mistakes, it is not a proof.
const PERSONAL_DATA_KEYS = new Set([
  "name",
  "fullname",
  "firstname",
  "lastname",
  "parentname",
  "email",
  "phone",
  "parentcontact",
  "birthdate",
  "address",
]);

/** Returns the first personal-data-looking key found in a payload, if any. */
export function findPersonalDataKey(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPersonalDataKey(item);
      if (found) return found;
    }
    return undefined;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (PERSONAL_DATA_KEYS.has(key.toLowerCase().replace(/[_-]/g, ""))) {
        return key;
      }
      const found = findPersonalDataKey(item);
      if (found) return found;
    }
  }
  return undefined;
}

export const eventInputSchema = z.object({
  /** Supplied by the sender (UUID): resending the same id changes nothing. */
  id: z.uuid(),
  type: z.enum(eventTypes),
  actorId: z.uuid().optional(),
  actorRole: z.enum(eventRoles).optional(),
  organizationId: z.uuid(),
  intakeId: z.uuid().optional(),
  participantId: z.uuid().optional(),
  /** Time on the sender's device (an offline phone may send it much later). */
  occurredAtDevice: z.coerce.date(),
  payload: z.record(z.string(), z.unknown()),
  source: z.enum(eventSources),
  ipHash: z.string().min(1).optional(),
  deviceIdHash: z.string().min(1).optional(),
});

export type EventInput = z.input<typeof eventInputSchema>;
