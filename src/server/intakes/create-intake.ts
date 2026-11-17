import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { ageProfileFor } from "@/lib/age-profile";
import { parseIsoDate } from "@/lib/iso-date";
import { canManageIntakes, type SessionUser } from "../auth/policy";
import { getPrisma } from "../db/client";

/** Error codes returned in `issue.message`; the interface maps them to texts. */
export const intakeErrorCodes = [
  "name_required",
  "birth_year_invalid",
  "tryout_date_invalid",
  "tryout_date_past",
  "age_out_of_range",
] as const;
export type IntakeErrorCode = (typeof intakeErrorCodes)[number];

const TRIAL_TYPES = [
  "sprint_20m",
  "shuttle_5_10_5",
  "dribbling",
  "passing",
  "shooting",
] as const;

/** Schema for the new-intake form. `today` is passed in so tests control time. */
export function createIntakeSchema(today: Date) {
  const startOfToday = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  return z
    .object({
      name: z.string().trim().min(1, "name_required").max(100, "name_required"),
      birthYear: z.coerce
        .number("birth_year_invalid")
        .int("birth_year_invalid")
        .min(1990, "birth_year_invalid")
        .max(2100, "birth_year_invalid"),
      tryoutDate: z
        .string("tryout_date_invalid")
        .transform((value) => parseIsoDate(value))
        // zod keeps running later checks after a failed one, so they must accept null.
        .refine((date) => date !== null, "tryout_date_invalid")
        .refine(
          (date) => date === null || date.getTime() >= startOfToday,
          "tryout_date_past",
        )
        .transform((date) => date as Date),
    })
    .superRefine((value, ctx) => {
      // Field errors are reported separately; check the age only when both
      // fields are usable (zod runs this even if a field above failed).
      const date: unknown = value.tryoutDate;
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return;
      if (typeof value.birthYear !== "number") return;
      if (!ageProfileFor(value.birthYear, date.getUTCFullYear())) {
        ctx.addIssue({
          code: "custom",
          path: ["birthYear"],
          message: "age_out_of_range",
        });
      }
    });
}

export type CreateIntakeInput = z.input<ReturnType<typeof createIntakeSchema>>;

export class ForbiddenError extends Error {
  constructor() {
    super("Not allowed to manage intakes");
    this.name = "ForbiddenError";
  }
}

export type CreateIntakeResult =
  | { ok: true; intakeId: string }
  | {
      ok: false;
      errors: Partial<
        Record<"name" | "birthYear" | "tryoutDate", IntakeErrorCode>
      >;
    };

/**
 * Creates a draft intake with its five trials for the user's own academy.
 * The academy always comes from the signed-in user, never from the input.
 */
export async function createIntake(
  user: Pick<SessionUser, "role" | "organizationId">,
  input: unknown,
  options: { prisma?: PrismaClient; today?: Date } = {},
): Promise<CreateIntakeResult> {
  if (!canManageIntakes(user) || user.organizationId === null) {
    throw new ForbiddenError();
  }
  const parsed = createIntakeSchema(options.today ?? new Date()).safeParse(
    input,
  );
  if (!parsed.success) {
    const errors: Partial<
      Record<"name" | "birthYear" | "tryoutDate", IntakeErrorCode>
    > = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        (field === "name" || field === "birthYear" || field === "tryoutDate") &&
        !errors[field]
      ) {
        errors[field] = issue.message as IntakeErrorCode;
      }
    }
    return { ok: false, errors };
  }

  const prisma = options.prisma ?? getPrisma();
  const { name, birthYear, tryoutDate } = parsed.data;
  // Cannot be null: the schema already rejected ages outside U7..U14.
  const ageProfile = ageProfileFor(birthYear, tryoutDate.getUTCFullYear())!;

  const intake = await prisma.intake.create({
    data: {
      organizationId: user.organizationId,
      name,
      birthYear,
      ageProfile,
      tryoutDate,
      status: "draft",
      trials: { create: TRIAL_TYPES.map((type) => ({ type })) },
    },
  });
  return { ok: true, intakeId: intake.id };
}
