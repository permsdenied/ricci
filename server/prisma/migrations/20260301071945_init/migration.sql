-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'PENDING');

-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('GROUP', 'SUPERGROUP', 'CHANNEL');

-- CreateEnum
CREATE TYPE "ChatMembershipStatus" AS ENUM ('ACTIVE', 'PENDING_INVITE', 'KICKED', 'LEFT');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "BroadcastTargetType" AS ENUM ('CHAT', 'TAG', 'ALL_USERS');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'VIEWER');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "phone" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "department" TEXT,
    "position" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "botStarted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "blockedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tags" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chats" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ChatType" NOT NULL,
    "botIsAdmin" BOOLEAN NOT NULL DEFAULT false,
    "canPost" BOOLEAN NOT NULL DEFAULT false,
    "canInvite" BOOLEAN NOT NULL DEFAULT false,
    "canBan" BOOLEAN NOT NULL DEFAULT false,
    "canPin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "inviteLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_package_items" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,

    CONSTRAINT "chat_package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "status" "ChatMembershipStatus" NOT NULL DEFAULT 'PENDING_INVITE',
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByTgId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "buttons" JSONB,
    "targetType" "BroadcastTargetType" NOT NULL,
    "status" "BroadcastStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_tags" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "broadcast_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_chats" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,

    CONSTRAINT "broadcast_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_recipients" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "broadcast_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_logs" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "payload" JSONB,
    "response" JSONB,
    "status" INTEGER NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramId_key" ON "users"("telegramId");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_tags_userId_tagId_key" ON "user_tags"("userId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "chats_telegramId_key" ON "chats"("telegramId");

-- CreateIndex
CREATE INDEX "chats_telegramId_idx" ON "chats"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_packages_name_key" ON "chat_packages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "chat_package_items_packageId_chatId_key" ON "chat_package_items"("packageId", "chatId");

-- CreateIndex
CREATE INDEX "chat_memberships_status_idx" ON "chat_memberships"("status");

-- CreateIndex
CREATE UNIQUE INDEX "chat_memberships_userId_chatId_key" ON "chat_memberships"("userId", "chatId");

-- CreateIndex
CREATE INDEX "invite_links_link_idx" ON "invite_links"("link");

-- CreateIndex
CREATE INDEX "invite_links_expiresAt_idx" ON "invite_links"("expiresAt");

-- CreateIndex
CREATE INDEX "broadcasts_status_idx" ON "broadcasts"("status");

-- CreateIndex
CREATE INDEX "broadcasts_scheduledAt_idx" ON "broadcasts"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_tags_broadcastId_tagId_key" ON "broadcast_tags"("broadcastId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_chats_broadcastId_chatId_key" ON "broadcast_chats"("broadcastId", "chatId");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_recipients_broadcastId_userId_key" ON "broadcast_recipients"("broadcastId", "userId");

-- CreateIndex
CREATE INDEX "api_logs_endpoint_idx" ON "api_logs"("endpoint");

-- CreateIndex
CREATE INDEX "api_logs_createdAt_idx" ON "api_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_package_items" ADD CONSTRAINT "chat_package_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "chat_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_package_items" ADD CONSTRAINT "chat_package_items_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_memberships" ADD CONSTRAINT "chat_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_memberships" ADD CONSTRAINT "chat_memberships_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_tags" ADD CONSTRAINT "broadcast_tags_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_tags" ADD CONSTRAINT "broadcast_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_chats" ADD CONSTRAINT "broadcast_chats_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_chats" ADD CONSTRAINT "broadcast_chats_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
