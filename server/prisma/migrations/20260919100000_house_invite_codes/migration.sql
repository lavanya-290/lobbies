-- Add invite codes without breaking houses that already exist.
ALTER TABLE "House" ADD COLUMN "inviteCode" TEXT;

UPDATE "House"
SET "inviteCode" = UPPER(SUBSTRING(MD5("id" || RANDOM()::text) FROM 1 FOR 10))
WHERE "inviteCode" IS NULL;

ALTER TABLE "House" ALTER COLUMN "inviteCode" SET NOT NULL;
CREATE UNIQUE INDEX "House_inviteCode_key" ON "House"("inviteCode");
