CREATE TYPE "HackathonSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "HackathonSubmission" (
    "id" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "publishedHackathonId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'ONLINE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "registrationDeadline" TIMESTAMP(3),
    "websiteUrl" TEXT,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "HackathonSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    CONSTRAINT "HackathonSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HackathonSubmission_publishedHackathonId_key"
ON "HackathonSubmission"("publishedHackathonId");

CREATE INDEX "HackathonSubmission_status_submittedAt_idx"
ON "HackathonSubmission"("status", "submittedAt");

CREATE INDEX "HackathonSubmission_submittedById_status_idx"
ON "HackathonSubmission"("submittedById", "status");

ALTER TABLE "HackathonSubmission"
ADD CONSTRAINT "HackathonSubmission_submittedById_fkey"
FOREIGN KEY ("submittedById") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HackathonSubmission"
ADD CONSTRAINT "HackathonSubmission_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HackathonSubmission"
ADD CONSTRAINT "HackathonSubmission_publishedHackathonId_fkey"
FOREIGN KEY ("publishedHackathonId") REFERENCES "Hackathon"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
