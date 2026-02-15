/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `link_token` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[authUserId,platform]` on the table `link_token` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "link_token" DROP COLUMN "expiresAt";

-- CreateIndex
CREATE UNIQUE INDEX "link_token_authUserId_platform_key" ON "link_token"("authUserId", "platform");
