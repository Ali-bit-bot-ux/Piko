// Manual Kaspi payments against the real database (skipped without DATABASE_URL).
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { listPaymentsForUser } from "../db/payments";
import { confirmPayment, createPayment } from "./payments";

config({ path: [".env.local", ".env"], quiet: true });

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("manual payments (database)", () => {
  let prisma: PrismaClient;
  let orgId: string;
  let otherOrgId: string;

  beforeAll(async () => {
    prisma = (await import("../db/client")).getPrisma();
    orgId = (
      await prisma.organization.create({ data: { name: "Тест: оплата А" } })
    ).id;
    otherOrgId = (
      await prisma.organization.create({ data: { name: "Тест: оплата Б" } })
    ).id;
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({
      where: { id: { in: [orgId, otherOrgId] } },
    });
    await prisma.$disconnect();
  });

  it("creates a pending bill, confirms it once and is safe to repeat", async () => {
    const created = await createPayment(
      { organizationId: orgId, amountKzt: 110_000, description: "Набор 2026" },
      prisma,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const first = await confirmPayment(created.reference, prisma);
    expect(first).toEqual({ ok: true, alreadyPaid: false });
    const again = await confirmPayment(created.reference, prisma);
    expect(again).toEqual({ ok: true, alreadyPaid: true });

    const row = await prisma.payment.findUniqueOrThrow({
      where: { reference: created.reference },
    });
    expect(row.status).toBe("paid");
    expect(row.paidAt).not.toBeNull();
  });

  it("refuses bad input, an unknown academy, an unknown or cancelled code", async () => {
    expect(
      await createPayment(
        { organizationId: orgId, amountKzt: 0, description: "ab" },
        prisma,
      ),
    ).toEqual({ ok: false, code: "invalid" });
    expect(
      await createPayment(
        { organizationId: orgId, amountKzt: 1.5, description: "Набор" },
        prisma,
      ),
    ).toEqual({ ok: false, code: "invalid" });
    expect(
      await createPayment(
        {
          organizationId: "00000000-0000-4000-8000-000000000000",
          amountKzt: 1000,
          description: "Набор",
        },
        prisma,
      ),
    ).toEqual({ ok: false, code: "not_found" });
    expect(await confirmPayment("PK-222222", prisma)).toEqual({
      ok: false,
      code: "not_found",
    });
    expect(await confirmPayment("bad", prisma)).toEqual({
      ok: false,
      code: "invalid",
    });

    const created = await createPayment(
      { organizationId: orgId, amountKzt: 5000, description: "Отмена" },
      prisma,
    );
    if (!created.ok) throw new Error("setup");
    await prisma.payment.update({
      where: { id: created.paymentId },
      data: { status: "cancelled" },
    });
    expect(await confirmPayment(created.reference, prisma)).toEqual({
      ok: false,
      code: "cancelled",
    });
  });

  it("shows an academy only its own bills, and only to directors and admins", async () => {
    const mine = await listPaymentsForUser(
      { role: "director", organizationId: orgId },
      prisma,
    );
    expect(mine!.payments.length).toBeGreaterThanOrEqual(2);
    const other = await listPaymentsForUser(
      { role: "admin", organizationId: otherOrgId },
      prisma,
    );
    expect(other!.payments).toEqual([]);
    expect(
      await listPaymentsForUser(
        { role: "coach", organizationId: orgId },
        prisma,
      ),
    ).toBeNull();
    expect(
      await listPaymentsForUser(
        { role: "parent", organizationId: null },
        prisma,
      ),
    ).toBeNull();
  });
});
