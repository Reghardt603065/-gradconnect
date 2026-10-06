-- Allow admins to permanently hide externally discovered hackathons from the public list.
CREATE TABLE "HiddenExternalHackathon" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "hiddenById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiddenExternalHackathon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HiddenExternalHackathon_externalId_key"
ON "HiddenExternalHackathon"("externalId");

CREATE INDEX "HiddenExternalHackathon_createdAt_idx"
ON "HiddenExternalHackathon"("createdAt");
