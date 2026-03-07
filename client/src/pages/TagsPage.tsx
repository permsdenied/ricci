import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import api from "@/api/axios";
import { toast } from "sonner";
import { Plus, Trash2, Users, X, UserPlus, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Tag {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  usersCount: number;
}

interface TagUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface AllUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: string;
}

function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTag, setNewTag] = useState({ name: "", description: "", color: "#3B82F6" });

  // Управление пользователями тега
  const [managingTag, setManagingTag] = useState<Tag | null>(null);
  const [tagUsers, setTagUsers] = useState<TagUser[]>([]);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchField, setUserSearchField] = useState<"all" | "name" | "username" | "phone">("username");
  const [isManageOpen, setIsManageOpen] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await api.get("/tags");
      setTags(response.data.data);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
      toast.error("Ошибка загрузки тегов");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post("/tags", {
        name: newTag.name,
        description: newTag.description || undefined,
        color: newTag.color,
      });
      toast.success("Тег создан");
      setIsCreateOpen(false);
      setNewTag({ name: "", description: "", color: "#3B82F6" });
      fetchTags();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Ошибка создания");
    }
  };

  const handleManageOpen = async (tag: Tag) => {
    setManagingTag(tag);
    setUserSearch("");
    setIsManageOpen(true);

    try {
      const [tagRes, allRes] = await Promise.all([
        api.get(`/tags/${tag.id}`),
        api.get("/users?limit=500&status=ACTIVE"),
      ]);
      setTagUsers(tagRes.data.data.users);
      setAllUsers(allRes.data.data);
    } catch (error) {
      toast.error("Ошибка загрузки пользователей");
    }
  };

  const handleAddUserToTag = async (userId: string) => {
    if (!managingTag) return;
    try {
      await api.post(`/users/${userId}/tags`, { tagIds: [managingTag.id] });
      const res = await api.get(`/tags/${managingTag.id}`);
      setTagUsers(res.data.data.users);
      fetchTags();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Ошибка добавления");
    }
  };

  const handleRemoveUserFromTag = async (userId: string) => {
    if (!managingTag) return;
    try {
      await api.delete(`/users/${userId}/tags`, { data: { tagIds: [managingTag.id] } });
      setTagUsers((prev) => prev.filter((u) => u.id !== userId));
      fetchTags();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Ошибка удаления");
    }
  };

  const handleDelete = async (tagId: string, tagName: string) => {
    if (!confirm(`Удалить тег "${tagName}"?`)) return;
    try {
      await api.delete(`/tags/${tagId}`);
      toast.success("Тег удален");
      fetchTags();
    } catch (error) {
      toast.error("Ошибка удаления");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-muted-foreground">Загрузка...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Теги</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Создать тег</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый тег</DialogTitle>
              <DialogDescription>Создайте новый тег для сегментации сотрудников</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Название *</Label>
                <Input id="name" placeholder="IT-отдел" value={newTag.name} onChange={(e) => setNewTag({ ...newTag, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Описание</Label>
                <Input id="description" placeholder="Сотрудники IT отдела" value={newTag.description} onChange={(e) => setNewTag({ ...newTag, description: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="color">Цвет</Label>
                <div className="flex gap-2">
                  <Input id="color" type="color" value={newTag.color} onChange={(e) => setNewTag({ ...newTag, color: e.target.value })} className="w-16 h-9 p-1" />
                  <Input value={newTag.color} onChange={(e) => setNewTag({ ...newTag, color: e.target.value })} placeholder="#3B82F6" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Отмена</Button>
              <Button onClick={handleCreate} disabled={!newTag.name}>Создать</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tags.map((tag) => (
          <Card key={tag.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color || "#gray" }} />
                {tag.name}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleManageOpen(tag)}>
                  <UserPlus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(tag.id, tag.name)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{tag.description || "Без описания"}</p>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{tag.usersCount} сотрудников</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {tags.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">Нет тегов. Создайте первый тег.</div>}
      </div>
      {/* Диалог управления пользователями тега */}
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Сотрудники тега «{managingTag?.name}»</DialogTitle>
            <DialogDescription>Добавляйте и удаляйте сотрудников из тега</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2" style={{ maxHeight: "60vh" }}>
            {/* Левая колонка: текущие пользователи тега */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">В теге ({tagUsers.length})</p>
              <div className="border rounded-md overflow-y-auto" style={{ maxHeight: "45vh" }}>
                {tagUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3">Нет сотрудников</p>
                ) : (
                  tagUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted">
                      <div>
                        <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground">@{u.username || u.telegramId}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveUserFromTag(u.id)}>
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Правая колонка: все активные пользователи */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Добавить сотрудника</p>
              <Select value={userSearchField} onValueChange={(v) => setUserSearchField(v as typeof userSearchField)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все поля</SelectItem>
                  <SelectItem value="name">Имя / Фамилия</SelectItem>
                  <SelectItem value="username">Username</SelectItem>
                  <SelectItem value="phone">Телефон</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  className="pl-7 h-8 text-sm"
                  placeholder={
                    userSearchField === "username" ? "@username" :
                    userSearchField === "phone" ? "+7 900 000 00 00" :
                    userSearchField === "name" ? "Иван Иванов" :
                    "Поиск..."
                  }
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <div className="border rounded-md overflow-y-auto" style={{ maxHeight: "35vh" }}>
                {allUsers
                  .filter((u) => !tagUsers.some((tu) => tu.id === u.id))
                  .filter((u) => {
                    const q = userSearch.toLowerCase();
                    if (!q) return true;
                    if (userSearchField === "username") return u.username?.toLowerCase().includes(q);
                    if (userSearchField === "phone") return u.phone?.includes(q);
                    if (userSearchField === "name") return u.firstName?.toLowerCase().includes(q) || u.lastName?.toLowerCase().includes(q);
                    return u.firstName?.toLowerCase().includes(q) || u.lastName?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q);
                  })
                  .map((u) => (
                    <div key={u.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted">
                      <div>
                        <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground">@{u.username || u.telegramId}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleAddUserToTag(u.id)}>
                        <Plus className="h-3 w-3 text-primary" />
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TagsPage;