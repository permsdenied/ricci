-- AlterEnum
ALTER TYPE "BroadcastTargetType" ADD VALUE 'SPECIFIC_USERS';

-- CreateTable
CREATE TABLE "broadcast_users" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "broadcast_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_users_broadcastId_userId_key" ON "broadcast_users"("broadcastId", "userId");

-- AddForeignKey
ALTER TABLE "broadcast_users" ADD CONSTRAINT "broadcast_users_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_users" ADD CONSTRAINT "broadcast_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
