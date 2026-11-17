-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'director', 'coach', 'parent');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('pilot', 'section', 'academy', 'network', 'federation');

-- CreateEnum
CREATE TYPE "IntakeStatus" AS ENUM ('draft', 'open', 'testing', 'finished');

-- CreateEnum
CREATE TYPE "AgeProfile" AS ENUM ('U7_U9', 'U10_U11', 'U12_U14');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('registered', 'checked_in', 'evaluated', 'decided');

-- CreateEnum
CREATE TYPE "TrialType" AS ENUM ('sprint_20m', 'shuttle_5_10_5', 'dribbling', 'passing', 'shooting');

-- CreateEnum
CREATE TYPE "MeasurementSource" AS ENUM ('manual', 'timer');

-- CreateEnum
CREATE TYPE "AnalysisSource" AS ENUM ('log', 'video', 'both');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('enrolled', 'reserve', 'review', 'rejected');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('mobile_offline', 'mobile_online', 'web', 'system');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('registration_created', 'consent_granted', 'tryout_published', 'participant_checked_in', 'measurement_recorded', 'evaluation_scored', 'measurement_corrected', 'evaluation_reopened', 'decision_changed', 'report_sent', 'report_opened', 'login_attempt');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'pilot',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "organizationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intakes" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "ageProfile" "AgeProfile" NOT NULL,
    "tryoutDate" DATE NOT NULL,
    "status" "IntakeStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL,
    "intakeId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentContact" TEXT NOT NULL,
    "consentGrantedAt" TIMESTAMP(3) NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'registered',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trials" (
    "id" UUID NOT NULL,
    "intakeId" UUID NOT NULL,
    "type" "TrialType" NOT NULL,

    CONSTRAINT "trials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurements" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "trialId" UUID NOT NULL,
    "attempt" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "source" "MeasurementSource" NOT NULL DEFAULT 'manual',
    "recordedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "coachId" UUID,
    "criterionKey" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "source" "AnalysisSource" NOT NULL,
    "provider" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "total" DECIMAL(3,2) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "decision" "Decision" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "type" "EventType" NOT NULL,
    "actorId" UUID,
    "actorRole" "Role",
    "organizationId" UUID NOT NULL,
    "intakeId" UUID,
    "participantId" UUID,
    "occurredAtDevice" TIMESTAMP(3) NOT NULL,
    "occurredAtServer" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "previousEventId" UUID,
    "source" "EventSource" NOT NULL,
    "ipHash" TEXT,
    "deviceIdHash" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "intakes_organizationId_idx" ON "intakes"("organizationId");

-- CreateIndex
CREATE INDEX "candidates_intakeId_idx" ON "candidates"("intakeId");

-- CreateIndex
CREATE UNIQUE INDEX "trials_intakeId_type_key" ON "trials"("intakeId", "type");

-- CreateIndex
CREATE INDEX "measurements_candidateId_idx" ON "measurements"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "measurements_candidateId_trialId_attempt_key" ON "measurements"("candidateId", "trialId", "attempt");

-- CreateIndex
CREATE INDEX "evaluations_candidateId_idx" ON "evaluations"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_candidateId_criterionKey_coachId_key" ON "evaluations"("candidateId", "criterionKey", "coachId");

-- CreateIndex
CREATE INDEX "analyses_candidateId_idx" ON "analyses"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "scores_candidateId_key" ON "scores"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "reports_candidateId_key" ON "reports"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "reports_tokenHash_key" ON "reports"("tokenHash");

-- CreateIndex
CREATE INDEX "events_organizationId_occurredAtServer_idx" ON "events"("organizationId", "occurredAtServer");

-- CreateIndex
CREATE INDEX "events_participantId_idx" ON "events"("participantId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intakes" ADD CONSTRAINT "intakes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "intakes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trials" ADD CONSTRAINT "trials_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "intakes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
