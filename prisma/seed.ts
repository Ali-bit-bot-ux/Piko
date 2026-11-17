// Demo data for local development. Safe to run many times (upserts by fixed ids).
// All names are obviously fake; e-mails use the reserved .invalid domain.
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: [".env.local", ".env"], quiet: true });

const ids = {
  org: "11111111-1111-4111-8111-111111111111",
  director: "22222222-2222-4222-8222-222222222221",
  coach: "22222222-2222-4222-8222-222222222222",
  intake: "33333333-3333-4333-8333-333333333333",
  candidates: [
    "44444444-4444-4444-8444-444444444441",
    "44444444-4444-4444-8444-444444444442",
    "44444444-4444-4444-8444-444444444443",
  ],
} as const;

const trialTypes = [
  "sprint_20m",
  "shuttle_5_10_5",
  "dribbling",
  "passing",
  "shooting",
] as const;

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo data in production");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set (see .env.example)");
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    await prisma.organization.upsert({
      where: { id: ids.org },
      update: {},
      create: { id: ids.org, name: "Демо-академия" },
    });

    await prisma.user.upsert({
      where: { id: ids.director },
      update: {},
      create: {
        id: ids.director,
        email: "demo-director@example.invalid",
        name: "Демо Директор",
        role: "director",
        organizationId: ids.org,
      },
    });
    await prisma.user.upsert({
      where: { id: ids.coach },
      update: {},
      create: {
        id: ids.coach,
        email: "demo-coach@example.invalid",
        name: "Демо Тренер",
        role: "coach",
        organizationId: ids.org,
      },
    });

    await prisma.intake.upsert({
      where: { id: ids.intake },
      update: {},
      create: {
        id: ids.intake,
        organizationId: ids.org,
        name: "Демо-набор 2015",
        birthYear: 2015,
        ageProfile: "U10_U11",
        tryoutDate: new Date("2026-12-01"),
        status: "open",
      },
    });

    for (const type of trialTypes) {
      await prisma.trial.upsert({
        where: { intakeId_type: { intakeId: ids.intake, type } },
        update: {},
        create: { intakeId: ids.intake, type },
      });
    }

    const names = ["А", "Б", "В"];
    for (const [index, id] of ids.candidates.entries()) {
      await prisma.candidate.upsert({
        where: { id },
        update: {},
        create: {
          id,
          intakeId: ids.intake,
          fullName: `Демо Кандидат ${names[index]}`,
          birthDate: new Date(`2015-0${index + 3}-10`),
          parentName: "Демо Родитель",
          parentContact: "demo-parent@example.invalid",
          consentGrantedAt: new Date(),
          consentVersion: "demo-v0",
        },
      });
    }

    const sprint = await prisma.trial.findUniqueOrThrow({
      where: { intakeId_type: { intakeId: ids.intake, type: "sprint_20m" } },
    });
    const sprintTimes = [4.12, 4.05];
    for (const [index, value] of sprintTimes.entries()) {
      await prisma.measurement.upsert({
        where: {
          candidateId_trialId_attempt: {
            candidateId: ids.candidates[0],
            trialId: sprint.id,
            attempt: index + 1,
          },
        },
        update: {},
        create: {
          candidateId: ids.candidates[0],
          trialId: sprint.id,
          attempt: index + 1,
          value,
          source: "timer",
          recordedById: ids.coach,
        },
      });
    }

    await prisma.evaluation.upsert({
      where: {
        candidateId_criterionKey_coachId: {
          candidateId: ids.candidates[0],
          criterionKey: "ball_control",
          coachId: ids.coach,
        },
      },
      update: {},
      create: {
        candidateId: ids.candidates[0],
        coachId: ids.coach,
        criterionKey: "ball_control",
        score: 4,
      },
    });

    console.log("Seed complete: 1 organization, 2 users, 1 intake, 5 trials, 3 candidates");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
