import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { CONSENT_VERSION } from "@/lib/consent";
import { parseIsoDate } from "@/lib/iso-date";
import { getPrisma } from "../db/client";
import { recordEvent } from "../events";
import { hashIdentifier } from "../events/hash";
import {
  createLoginThrottle,
  type LoginThrottle,
} from "../auth/login-throttle";

/** Error codes returned in `issue.message`; the interface maps them to texts. */
export const registrationErrorCodes = [
  "name_required",
  "birth_date_invalid",
  "birth_year_mismatch",
  "parent_name_required",
  "contact_invalid",
  "consent_required",
] as const;
export type RegistrationErrorCode = (typeof registrationErrorCodes)[number];

export type RegistrationField =
  "fullName" | "birthDate" | "parentName" | "parentContact" | "consent";

/** Most children one intake accepts through the public form. */
export const MAX_CANDIDATES_PER_INTAKE = 500;

const PHONE = /^\+?[0-9][0-9\s().-]{5,19}$/;

function isContact(value: string): boolean {
  if (z.email().safeParse(value).success) return true;
  const digits = value.replace(/\D/g, "").length;
  return PHONE.test(value) && digits >= 7 && digits <= 15;
}

/** Schema for the public registration form. `today` is passed in for tests. */
export function createRegistrationSchema(today: Date) {
  const endOfToday =
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) +
    24 * 60 * 60 * 1000 -
    1;

  return z.object({
    fullName: z
      .string()
      .trim()
      .min(2, "name_required")
      .max(120, "name_required"),
    birthDate: z
      .string("birth_date_invalid")
      .transform((value) => parseIsoDate(value))
      // zod keeps running later checks after a failed one, so they must accept null.
      .refine((date) => date !== null, "birth_date_invalid")
      .refine(
        (date) => date === null || date.getTime() <= endOfToday,
        "birth_date_invalid",
      )
      .transform((date) => date as Date),
    parentName: z
      .string()
      .trim()
      .min(2, "parent_name_required")
      .max(120, "parent_name_required"),
    parentContact: z
      .string()
      .trim()
      .max(120, "contact_invalid")
      .refine(isContact, "contact_invalid"),
    // A checked checkbox is sent as "on".
    consent: z.literal("on", "consent_required"),
  });
}

export type RegistrationResult =
  | { ok: true }
  | {
      ok: false;
      code?: "closed" | "duplicate" | "full" | "throttled";
      errors?: Partial<Record<RegistrationField, RegistrationErrorCode>>;
    };

// Up to 60 submissions per hour per address and intake. Parents at a venue
// share one network, so the limit is generous; it only stops floods.
const defaultThrottle = createLoginThrottle({
  maxFailures: 60,
  windowMs: 60 * 60 * 1000,
});

type Options = {
  prisma?: PrismaClient;
  throttle?: LoginThrottle;
  today?: Date;
  /** Visitor address, used only for the limiter and a keyed hash in the journal. */
  ip?: string;
};

/**
 * Public registration of a child by a parent (no account). The academy and
 * everything else comes from the intake, never from the form.
 */
export async function registerCandidate(
  intakeId: string,
  form: Record<string, unknown>,
  options: Options = {},
): Promise<RegistrationResult> {
  if (!z.uuid().safeParse(intakeId).success) {
    return { ok: false, code: "closed" };
  }

  // Bots fill the hidden "website" field. Pretend it worked, store nothing.
  if (typeof form.website === "string" && form.website.trim() !== "") {
    return { ok: true };
  }

  const throttle = options.throttle ?? defaultThrottle;
  const throttleKey = `${options.ip ?? "unknown"}:${intakeId}`;
  if (throttle.isBlocked(throttleKey)) return { ok: false, code: "throttled" };
  throttle.recordFailure(throttleKey);

  const parsed = createRegistrationSchema(
    options.today ?? new Date(),
  ).safeParse(form);
  if (!parsed.success) {
    const errors: Partial<Record<RegistrationField, RegistrationErrorCode>> =
      {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as RegistrationField;
      if (!errors[field])
        errors[field] = issue.message as RegistrationErrorCode;
    }
    return { ok: false, errors };
  }
  const { fullName, birthDate, parentName, parentContact } = parsed.data;

  const prisma = options.prisma ?? getPrisma();
  const intake = await prisma.intake.findUnique({ where: { id: intakeId } });
  if (!intake || intake.status !== "open") return { ok: false, code: "closed" };

  if (birthDate.getUTCFullYear() !== intake.birthYear) {
    return { ok: false, errors: { birthDate: "birth_year_mismatch" } };
  }

  const [count, duplicate] = await Promise.all([
    prisma.candidate.count({ where: { intakeId } }),
    prisma.candidate.findFirst({
      where: {
        intakeId,
        birthDate,
        parentContact,
        fullName: { equals: fullName, mode: "insensitive" },
      },
      select: { id: true },
    }),
  ]);
  if (count >= MAX_CANDIDATES_PER_INTAKE) return { ok: false, code: "full" };
  if (duplicate) return { ok: false, code: "duplicate" };

  const now = new Date();
  const ipHash = options.ip ? hashIdentifier(options.ip) : undefined;

  await prisma.$transaction(async (tx) => {
    const candidate = await tx.candidate.create({
      data: {
        intakeId,
        fullName,
        birthDate,
        parentName,
        parentContact,
        consentGrantedAt: now,
        consentVersion: CONSENT_VERSION,
      },
    });
    const base = {
      organizationId: intake.organizationId,
      intakeId,
      participantId: candidate.id,
      actorRole: "parent" as const,
      occurredAtDevice: now,
      source: "web" as const,
      ipHash,
    };
    // Pseudonymous ids and the consent version only: no names or contacts.
    await recordEvent(
      {
        ...base,
        id: crypto.randomUUID(),
        type: "registration_created",
        payload: {},
      },
      tx,
    );
    await recordEvent(
      {
        ...base,
        id: crypto.randomUUID(),
        type: "consent_granted",
        payload: { consentVersion: CONSENT_VERSION },
      },
      tx,
    );
  });

  return { ok: true };
}
