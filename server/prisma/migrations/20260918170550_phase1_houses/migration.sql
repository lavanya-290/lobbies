-- CreateTable
CREATE TABLE "HouseMember" (
    "houseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseMember_pkey" PRIMARY KEY ("houseId","userId")
);

-- CreateIndex
CREATE INDEX "HouseMember_userId_idx" ON "HouseMember"("userId");

-- AddForeignKey
ALTER TABLE "HouseMember" ADD CONSTRAINT "HouseMember_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseMember" ADD CONSTRAINT "HouseMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
