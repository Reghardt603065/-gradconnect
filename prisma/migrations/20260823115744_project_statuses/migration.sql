BEGIN;

CREATE TYPE "ProjectStatus_new" AS ENUM ('ACTIVE', 'FULL', 'CLOSED');

ALTER TABLE "public"."CompanyProject"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "CompanyProject"
ALTER COLUMN "status"
TYPE "ProjectStatus_new"
USING (
  CASE
    WHEN "status"::text = 'OPEN' THEN 'ACTIVE'
    ELSE "status"::text
  END
)::"ProjectStatus_new";

ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";

ALTER TYPE "ProjectStatus_new" RENAME TO "ProjectStatus";

DROP TYPE "public"."ProjectStatus_old";

ALTER TABLE "CompanyProject"
ALTER COLUMN "status"
SET DEFAULT 'ACTIVE';

COMMIT;

ALTER TYPE "ProjectSubscriptionStatus"
ADD VALUE 'COMPLETED';