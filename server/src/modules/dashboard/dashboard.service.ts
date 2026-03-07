import prisma from "../../db/client";

class DashboardService {
  async getOverview() {
    const [
      usersStats,
      chatsStats,
      broadcastsStats,
      recentUsers,
      chatsWithIssues,
    ] = await Promise.all([
      this.getUsersStats(),
      this.getChatsStats(),
      this.getBroadcastsStats(),
      this.getRecentUsers(),
      this.getChatsWithIssues(),
    ]);

    return {
      users: usersStats,
      chats: chatsStats,
      broadcasts: broadcastsStats,
      recentUsers,
      chatsWithIssues,
    };
  }

  private async getUsersStats() {
    const [total, active, pending, blocked] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { status: "BLOCKED" } }),
    ]);

    return { total, active, pending, blocked };
  }

  private async getChatsStats() {
    const [total, groups, channels, withIssues] = await Promise.all([
      prisma.chat.count({ where: { isActive: true } }),
      prisma.chat.count({
        where: { isActive: true, type: { in: ["GROUP", "SUPERGROUP"] } },
      }),
      prisma.chat.count({ where: { isActive: true, type: "CHANNEL" } }),
      prisma.chat.count({
        where: {
          isActive: true,
          OR: [{ botIsAdmin: false }, { canPost: false }, { canInvite: false }],
        },
      }),
    ]);

    return { total, groups, channels, withIssues };
  }

  private async getBroadcastsStats() {
    const [total, sent, scheduled, draft] = await Promise.all([
      prisma.broadcast.count(),
      prisma.broadcast.count({ where: { status: "SENT" } }),
      prisma.broadcast.count({ where: { status: "SCHEDULED" } }),
      prisma.broadcast.count({ where: { status: "DRAFT" } }),
    ]);

    // Сообщений за последние 7 дней
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const sentLastWeek = await prisma.broadcast.count({
      where: {
        status: "SENT",
        sentAt: { gte: lastWeek },
      },
    });

    return { total, sent, scheduled, draft, sentLastWeek };
  }

  private async getRecentUsers() {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
      },
    });

    return users.map((u) => ({
      ...u,
      telegramId: u.telegramId.toString(),
    }));
  }

  private async getChatsWithIssues() {
    const chats = await prisma.chat.findMany({
      where: {
        isActive: true,
        OR: [{ botIsAdmin: false }, { canPost: false }, { canInvite: false }],
      },
      take: 5,
      select: {
        id: true,
        telegramId: true,
        title: true,
        type: true,
        botIsAdmin: true,
        canPost: true,
        canInvite: true,
        canBan: true,
      },
    });

    return chats.map((c) => ({
      ...c,
      telegramId: c.telegramId.toString(),
      issues: this.detectIssues(c),
    }));
  }

  private detectIssues(chat: {
    botIsAdmin: boolean;
    canPost: boolean;
    canInvite: boolean;
    canBan: boolean;
  }): string[] {
    const issues: string[] = [];

    if (!chat.botIsAdmin) issues.push("Bot is not admin");
    if (!chat.canPost) issues.push("Cannot post messages");
    if (!chat.canInvite) issues.push("Cannot invite users");
    if (!chat.canBan) issues.push("Cannot ban users");

    return issues;
  }
}

export const dashboardService = new DashboardService();