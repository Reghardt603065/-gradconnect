-- Project Listing module
ALTER TYPE "NotificationType" ADD VALUE 'PROJECT';

CREATE TYPE "ProjectStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED');
CREATE TYPE "ProjectSubscriptionStatus" AS ENUM ('ACTIVE', 'WITHDRAWN');

CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanyProject" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "expectedOutcome" TEXT,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "githubUrl" TEXT,
    "liveDemoUrl" TEXT,
    "maxParticipants" INTEGER NOT NULL DEFAULT 5,
    "status" "ProjectStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectSubscription" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "ProjectSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Company_ownerId_key" ON "Company"("ownerId");
CREATE INDEX "Company_name_idx" ON "Company"("name");

CREATE INDEX "CompanyProject_companyId_idx" ON "CompanyProject"("companyId");
CREATE INDEX "CompanyProject_category_idx" ON "CompanyProject"("category");
CREATE INDEX "CompanyProject_status_idx" ON "CompanyProject"("status");
CREATE INDEX "CompanyProject_createdAt_idx" ON "CompanyProject"("createdAt");

CREATE UNIQUE INDEX "ProjectSubscription_projectId_studentId_key" ON "ProjectSubscription"("projectId", "studentId");
CREATE INDEX "ProjectSubscription_projectId_idx" ON "ProjectSubscription"("projectId");
CREATE INDEX "ProjectSubscription_studentId_idx" ON "ProjectSubscription"("studentId");
CREATE INDEX "ProjectSubscription_status_idx" ON "ProjectSubscription"("status");

ALTER TABLE "Company"
  ADD CONSTRAINT "Company_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyProject"
  ADD CONSTRAINT "CompanyProject_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectSubscription"
  ADD CONSTRAINT "ProjectSubscription_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "CompanyProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectSubscription"
  ADD CONSTRAINT "ProjectSubscription_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
