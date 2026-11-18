// Team tool for manual Kaspi payments (T-065). Not part of the web app.
//   npm run payment -- list
//   npm run payment -- create <organizationId> <amountKzt> "<description>"
//   npm run payment -- confirm <PK-XXXXXX>
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { confirmPayment, createPayment } from "../src/server/payments/payments";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });

  try {
    const [command, ...args] = process.argv.slice(2);

    if (command === "list") {
      const rows = await prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        include: { organization: { select: { name: true } } },
      });
      for (const p of rows) {
        console.log(
          `${p.reference}  ${p.status.padEnd(9)} ${String(p.amountKzt).padStart(9)} KZT  ${p.organization.name}  ${p.description}`,
        );
      }
      if (rows.length === 0) console.log("No payments yet.");
    } else if (command === "create") {
      const [organizationId, amount, description] = args;
      const result = await createPayment(
        {
          organizationId,
          amountKzt: Number(amount),
          description,
        },
        prisma,
      );
      if (!result.ok) throw new Error(`Not created: ${result.code}`);
      console.log(
        `Created. Reference to write in the transfer: ${result.reference}`,
      );
    } else if (command === "confirm") {
      const result = await confirmPayment(args[0] ?? "", prisma);
      if (!result.ok) throw new Error(`Not confirmed: ${result.code}`);
      console.log(result.alreadyPaid ? "Was already paid." : "Marked as paid.");
    } else {
      console.log(
        "Commands: list | create <orgId> <amountKzt> <text> | confirm <PK-XXXXXX>",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
