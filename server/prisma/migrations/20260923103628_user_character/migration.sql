-- CreateEnum
CREATE TYPE "CharacterType" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "character" "CharacterType" NOT NULL DEFAULT 'FEMALE';
