CREATE TYPE "HackathonCrawlResultStatus" AS ENUM ('NEW', 'REVIEWED', 'DISMISSED');

CREATE TABLE "HackathonCrawlTarget" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HackathonCrawlTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HackathonCrawlResult" (
    "id" TEXT NOT NULL,
    "targetId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "location" TEXT,
    "mode" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "status" "HackathonCrawlResultStatus" NOT NULL DEFAULT 'NEW',
    "rawData" JSONB,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    CONSTRAINT "HackathonCrawlResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HackathonCrawlTarget_url_key" ON "HackathonCrawlTarget"("url");
CREATE INDEX "HackathonCrawlTarget_active_idx" ON "HackathonCrawlTarget"("active");
CREATE UNIQUE INDEX "HackathonCrawlResult_sourceUrl_name_key" ON "HackathonCrawlResult"("sourceUrl", "name");
CREATE INDEX "HackathonCrawlResult_status_discoveredAt_idx" ON "HackathonCrawlResult"("status", "discoveredAt");
CREATE INDEX "HackathonCrawlResult_targetId_idx" ON "HackathonCrawlResult"("targetId");

ALTER TABLE "HackathonCrawlResult"
ADD CONSTRAINT "HackathonCrawlResult_targetId_fkey"
FOREIGN KEY ("targetId") REFERENCES "HackathonCrawlTarget"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
