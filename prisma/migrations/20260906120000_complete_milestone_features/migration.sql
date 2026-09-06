ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'CODING_CHALLENGE_COMPLETED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'BADGE_EARNED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'TEAM_UPDATED';

CREATE TABLE "ProfileImage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfileImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortfolioAttachment" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortfolioAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserBadge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CodingChallengeCompletion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "challengeKey" TEXT NOT NULL,
  "notes" TEXT,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CodingChallengeCompletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfileImage_userId_key" ON "ProfileImage"("userId");
CREATE INDEX "PortfolioAttachment_projectId_idx" ON "PortfolioAttachment"("projectId");
CREATE UNIQUE INDEX "UserBadge_userId_code_key" ON "UserBadge"("userId", "code");
CREATE INDEX "UserBadge_userId_awardedAt_idx" ON "UserBadge"("userId", "awardedAt");
CREATE UNIQUE INDEX "CodingChallengeCompletion_userId_challengeKey_key" ON "CodingChallengeCompletion"("userId", "challengeKey");
CREATE INDEX "CodingChallengeCompletion_userId_completedAt_idx" ON "CodingChallengeCompletion"("userId", "completedAt");

ALTER TABLE "ProfileImage"
ADD CONSTRAINT "ProfileImage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PortfolioAttachment"
ADD CONSTRAINT "PortfolioAttachment_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "PortfolioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserBadge"
ADD CONSTRAINT "UserBadge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CodingChallengeCompletion"
ADD CONSTRAINT "CodingChallengeCompletion_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
