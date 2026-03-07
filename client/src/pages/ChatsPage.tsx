import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/api/axios";
import { toast } from "sonner";
import { MessageSquare, Users, Megaphone, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface Chat {
  id: string;
  telegramId: string;
  title: string;
  type: "GROUP" | "SUPERGROUP" | "CHANNEL";
  botIsAdmin: boolean;
  canPost: boolean;
  canInvite: boolean;
  canBan: boolean;
  canPin: boolean;
  isActive: boolean;
  membersCount: number;
}

interface Stats {
  total: number;
  groups: number;
  supergroups: number;
  channels: number;
  withIssues: number;
}

function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [chatsRes, statsRes] = await Promise.all([api.get("/chats"), api.get("/chats/stats")]);
      setChats(chatsRes.data.data);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
      toast.error("Ошибка загрузки чатов");
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "CHANNEL": return <Megaphone className="h-4 w-4" />;
      case "SUPERGROUP": return <Users className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "CHANNEL": return <Badge variant="secondary">Канал</Badge>;
      case "SUPERGROUP": return <Badge variant="secondary">Супергруппа</Badge>;
      default: return <Badge variant="outline">Группа</Badge>;
    }
  };

  const PermissionIcon = ({ allowed }: { allowed: boolean }) =>
    allowed ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />;

  const hasIssues = (chat: Chat) => !chat.botIsAdmin || !chat.canPost || !chat.canInvite;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-muted-foreground">Загрузка...</div></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Чаты и каналы</h1>

      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Всего</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Группы</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.groups + stats.supergroups}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Каналы</CardTitle>
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.channels}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">С проблемами</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-destructive">{stats.withIssues}</div></CardContent>
          </Card>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Чат</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead className="text-center">Админ</TableHead>
              <TableHead className="text-center">Посты</TableHead>
              <TableHead className="text-center">Инвайт</TableHead>
              <TableHead className="text-center">Бан</TableHead>
              <TableHead>Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="text-muted-foreground">
                    <p>Нет подключенных чатов</p>
                    <p className="text-sm mt-1">Добавьте бота в чат с правами администратора</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              chats.map((chat) => (
                <TableRow key={chat.id} className={hasIssues(chat) ? "bg-destructive/5" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(chat.type)}
                      <div>
                        <p className="font-medium">{chat.title}</p>
                        <p className="text-xs text-muted-foreground">ID: {chat.telegramId}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(chat.type)}</TableCell>
                  <TableCell className="text-center"><PermissionIcon allowed={chat.botIsAdmin} /></TableCell>
                  <TableCell className="text-center"><PermissionIcon allowed={chat.canPost} /></TableCell>
                  <TableCell className="text-center"><PermissionIcon allowed={chat.canInvite} /></TableCell>
                  <TableCell className="text-center"><PermissionIcon allowed={chat.canBan} /></TableCell>
                  <TableCell>
                    {hasIssues(chat) ? <Badge variant="destructive">Требует внимания</Badge> : <Badge variant="default">OK</Badge>}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default ChatsPage;