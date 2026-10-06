-- Add optional Microsoft Teams scheduling fields to company projects.
ALTER TABLE "CompanyProject"
ADD COLUMN "teamsMeetingUrl" TEXT,
ADD COLUMN "teamsMeetingAt" TIMESTAMP(3);
