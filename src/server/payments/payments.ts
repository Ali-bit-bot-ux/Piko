// Manual B2B payments through Kaspi (transfer or QR), T-065. There is no
// payment gateway: the team creates a bill, the academy pays by hand writing
// the reference in the comment, the team confirms it (`npm run payment`).
import { randomInt } from "node:crypto";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { getPrisma } from "../db/client";

/** No 0/O/1/I/L: the code is read from a bank comment and typed by hand. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const REFERENCE_LENGTH = 6;
export const REFERENCE_PATTERN = /^PK-[2-9A-HJKMNP-Z]{6}$/;

export function generateReference(
  pick: (max: number) => number = randomInt,
): string {
  let code = "";
  for (let i = 0; i < REFERENCE_LENGTH; i += 1) {
    code += ALPHABET[pick(ALPHABET.length)];
  }
  return `PK-${code}`;
}

export const MAX_AMOUNT_KZT = 100_000_000;

const createSchema = z.object({
  organizationId: z.uuid(),
  amountKzt: z.number().int().min(1).max(MAX_AMOUNT_KZT),
  description: z.string().trim().min(3).max(200),
});

export type CreatePaymentResult =
  | { ok: true; reference: string; paymentId: string }
  | { ok: false; code: "invalid" | "not_found" };

/** Creates a pending bill for an academy. Called by the team's script only. */
export async function createPayment(
  input: unknown,
  prisma: PrismaClient = getPrisma(),
): Promise<CreatePaymentResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const data = parsed.data;

  const organization = await prisma.organization.findUnique({
    where: { id: data.organizationId },
    select: { id: true },
  });
  if (!organization) return { ok: false, code: "not_found" };

  // The code is random; a clash is very unlikely, a few retries make it safe.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = generateReference();
    try {
      const payment = await prisma.payment.create({
        data: { ...data, reference },
        select: { id: true },
      });
      return { ok: true, reference, paymentId: payment.id };
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? error.code
          : undefined;
      if (code !== "P2002") throw error;
    }
  }
  throw new Error("Could not find a free payment reference");
}

export type ConfirmPaymentResult =
  | { ok: true; alreadyPaid: boolean }
  | { ok: false; code: "invalid" | "not_found" | "cancelled" };

/** Marks a bill as paid once the money has arrived. Safe to repeat. */
export async function confirmPayment(
  reference: string,
  prisma: PrismaClient = getPrisma(),
  now: Date = new Date(),
): Promise<ConfirmPaymentResult> {
  if (!REFERENCE_PATTERN.test(reference)) {
    return { ok: false, code: "invalid" };
  }
  const payment = await prisma.payment.findUnique({
    where: { reference },
    select: { id: true, status: true },
  });
  if (!payment) return { ok: false, code: "not_found" };
  if (payment.status === "cancelled") return { ok: false, code: "cancelled" };
  if (payment.status === "paid") return { ok: true, alreadyPaid: true };

  // Only a pending bill turns paid, so two confirmations cannot clash.
  await prisma.payment.updateMany({
    where: { id: payment.id, status: "pending" },
    data: { status: "paid", paidAt: now },
  });
  return { ok: true, alreadyPaid: false };
}
