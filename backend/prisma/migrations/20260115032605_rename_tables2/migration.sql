/*
  Warnings:

  - You are about to drop the `auth_account` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "auth_account" DROP CONSTRAINT "auth_account_userId_fkey";

-- DropTable
DROP TABLE "auth_account";

-- CreateTable
CREATE TABLE "Auth_Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auth_Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Auth_Account_userId_idx" ON "Auth_Account"("userId");

-- AddForeignKey
ALTER TABLE "Auth_Account" ADD CONSTRAINT "Auth_Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Auth_User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
