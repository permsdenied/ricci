import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/api/axios";
import { Users, MessageSquare, Send, AlertTriangle } from "lucide-react";

interface DashboardData {
  users: {
    total: number;
    active: number;
    pending: number;
    blocked: number;
  };
  chats: {
    total: number;
    groups: number;
    channels: number;
    withIssues: number;
  };
  broadcasts: {
    total: number;
    sent: number;
    scheduled: number;
    draft: number;
    sentLastWeek: number;
  };
  recentUsers: Array<{
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    status: string;
    createdAt: string;
  }>;
  chatsWithIssues: Array<{
    id: string;
    title: string;
    type: string;
    issues: string[];
  }>;
}

function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get("/dashboard");
      setData(response.data.data);
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Ошибка загрузки данных</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Дашборд</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Сотрудники</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.users.total}</div>
            <p className="text-xs text-muted-foreground">
              {data.users.active} активных, {data.users.pending} ожидают
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Чаты</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.chats.total}</div>
            <p className="text-xs text-muted-foreground">
              {data.chats.groups} групп, {data.chats.channels} каналов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Рассылки</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.broadcasts.sent}</div>
            <p className="text-xs text-muted-foreground">
              {data.broadcasts.sentLastWeek} за последнюю неделю
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Проблемы</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.chats.withIssues}</div>
            <p className="text-xs text-muted-foreground">
              чатов требуют внимания
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Новые сотрудники</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{user.username || "—"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      user.status === "ACTIVE"
                        ? "default"
                        : user.status === "PENDING"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {user.status}
                  </Badge>
                </div>
              ))}
              {data.recentUsers.length === 0 && (
                <p className="text-muted-foreground text-sm">Нет новых сотрудников</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Чаты с проблемами</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.chatsWithIssues.map((chat) => (
                <div key={chat.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{chat.title}</p>
                    <Badge variant="outline">{chat.type}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {chat.issues.map((issue, idx) => (
                      <Badge key={idx} variant="destructive" className="text-xs">
                        {issue}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              {data.chatsWithIssues.length === 0 && (
                <p className="text-muted-foreground text-sm">Все чаты работают корректно</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DashboardPage;