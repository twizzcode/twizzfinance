/*
  Warnings:

  - You are about to drop the `auth_session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auth_user` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auth_verification` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "auth_account" DROP CONSTRAINT "auth_account_userId_fkey";

-- DropForeignKey
ALTER TABLE "auth_session" DROP CONSTRAINT "auth_session_userId_fkey";

-- DropTable
DROP TABLE "auth_session";

-- DropTable
DROP TABLE "auth_user";

-- DropTable
DROP TABLE "auth_verification";

-- CreateTable
CREATE TABLE "Auth_User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auth_User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auth_Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Auth_Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auth_Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auth_Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Auth_User_email_key" ON "Auth_User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Auth_Session_token_key" ON "Auth_Session"("token");

-- CreateIndex
CREATE INDEX "Auth_Session_userId_idx" ON "Auth_Session"("userId");

-- CreateIndex
CREATE INDEX "Auth_Verification_identifier_idx" ON "Auth_Verification"("identifier");

-- AddForeignKey
ALTER TABLE "Auth_Session" ADD CONSTRAINT "Auth_Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Auth_User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Auth_User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
