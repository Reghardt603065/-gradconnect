ALTER TABLE "Hackathon"
ADD COLUMN "createdById" TEXT;

CREATE INDEX "Hackathon_createdById_idx"
ON "Hackathon"("createdById");

ALTER TABLE "Hackathon"
ADD CONSTRAINT "Hackathon_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
