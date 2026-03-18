import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Search, UserX, UserCheck, Edit, Trash2, Download, Send } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ChatPackage {
  id: string;
  name: string;
  isDefault: boolean;
}

interface User {
  id: string;
  telegramId: string;
  username: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  department: string | null;
  position: string | null;
  status: "ACTIVE" | "BLOCKED" | "PENDING";
  tags: Array<{ id: string; name: string; color: string }>;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<"all" | "name" | "username" | "phone">("username");
  const [tagFilter, setTagFilter] = useState<string>("all");

  // Reference data
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [allPackages, setAllPackages] = useState<ChatPackage[]>([]);

  // Создание
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    telegramId: "",
    username: "",
    firstName: "",
    lastName: "",
    department: "",
    position: "",
    phone: "",
    chatPackageId: "",
    tagIds: [] as string[],
  });

  // Отправка инвайтов
  const [isSendPackageOpen, setIsSendPackageOpen] = useState(false);
  const [sendPackageUserId, setSendPackageUserId] = useState<string | null>(null);
  const [sendPackageId, setSendPackageId] = useState("");
  const [sendPackageSaving, setSendPackageSaving] = useState(false);

  // Редактирование
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    username: "",
    phone: "",
    firstName: "",
    lastName: "",
    department: "",
    position: "",
  });

  useEffect(() => {
    fetchRefData();
    fetchUsers();
  }, []);

  const fetchRefData = async () => {
    try {
      const [tagsRes, pkgsRes] = await Promise.all([
        api.get("/tags"),
        api.get("/chat-packages"),
      ]);
      setAllTags(tagsRes.data.data);
      setAllPackages(pkgsRes.data.data);

      // Pre-select default package
      const defaultPkg = pkgsRes.data.data.find((p: ChatPackage) => p.isDefault);
      if (defaultPkg) {
        setNewUser((prev) => ({ ...prev, chatPackageId: defaultPkg.id }));
      }
    } catch (err) {
      console.error("Failed to fetch reference data:", err);
    }
  };

  const fetchUsers = async (page = 1, currentTagFilter = tagFilter) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", "20");
      if (search) {
        params.append("search", search);
        if (searchField !== "all") params.append("searchField", searchField);
      }
      if (currentTagFilter !== "all") params.append("tagId", currentTagFilter);

      const response = await api.get(`/users?${params}`);
      setUsers(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Ошибка загрузки пользователей");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchUsers();
  };

  const toggleNewUserTag = (tagId: string) => {
    setNewUser((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const handleCreateUser = async () => {
    try {
      await api.post("/users", {
        telegramId: Number(newUser.telegramId),
        username: newUser.username || undefined,
        firstName: newUser.firstName || undefined,
        lastName: newUser.lastName || undefined,
        department: newUser.department || undefined,
        position: newUser.position || undefined,
        phone: newUser.phone || undefined,
        tagIds: newUser.tagIds.length > 0 ? newUser.tagIds : undefined,
        chatPackageId: (newUser.chatPackageId && newUser.chatPackageId !== "none") ? newUser.chatPackageId : undefined,
      });
      toast.success("Сотрудник создан");
      setIsCreateOpen(false);
      setNewUser({
        telegramId: "",
        username: "",
        firstName: "",
        lastName: "",
        department: "",
        position: "",
        phone: "",
        chatPackageId: allPackages.find((p) => p.isDefault)?.id || "",
        tagIds: [],
      });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Ошибка создания");
    }
  };

  const handleEditOpen = (user: User) => {
    setEditingUser(user);
    setEditForm({
      username: user.username || "",
      phone: user.phone || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      department: user.department || "",
      position: user.position || "",
    });
    setIsEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingUser) return;

    try {
      await api.put(`/users/${editingUser.id}`, {
        username: editForm.username || undefined,
        phone: editForm.phone || undefined,
        firstName: editForm.firstName || undefined,
        lastName: editForm.lastName || undefined,
        department: editForm.department || undefined,
        position: editForm.position || undefined,
      });
      toast.success("Сотрудник обновлён");
      setIsEditOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Ошибка обновления");
    }
  };

  const handleBlock = async (userId: string) => {
    if (!confirm("Вы уверены, что хотите заблокировать сотрудника? Бот удалит его из всех чатов.")) return;

    try {
      await api.post(`/users/${userId}/block`);
      toast.success("Сотрудник заблокирован и удалён из всех чатов");
      fetchUsers();
    } catch (error) {
      toast.error("Ошибка блокировки");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Удалить сотрудника навсегда? Это действие нельзя отменить.")) return;

    try {
      await api.delete(`/users/${userId}`);
      toast.success("Сотрудник удалён");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Ошибка удаления");
    }
  };

  const handleSendPackageOpen = (userId: string) => {
    setSendPackageUserId(userId);
    setSendPackageId(allPackages.find((p) => p.isDefault)?.id || "");
    setIsSendPackageOpen(true);
  };

  const handleSendPackage = async () => {
    if (!sendPackageUserId || !sendPackageId) return;
    setSendPackageSaving(true);
    try {
      const res = await api.post(`/users/${sendPackageUserId}/send-package`, { packageId: sendPackageId });
      toast.success(res.data.data.message);
      setIsSendPackageOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Ошибка отправки");
    } finally {
      setSendPackageSaving(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await api.post(`/users/${userId}/unblock`);
      toast.success("Сотрудник разблокирован");
      fetchUsers();
    } catch (error) {
      toast.error("Ошибка разблокировки");
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (tagFilter !== "all") params.append("tagId", tagFilter);
      if (search) {
        params.append("search", search);
        if (searchField !== "all") params.append("searchField", searchField);
      }
      const response = await api.get(`/users/export?${params}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `employees_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Ошибка экспорта");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="default">Активен</Badge>;
      case "PENDING":
        return <Badge variant="secondary">Ожидает</Badge>;
      case "BLOCKED":
        return <Badge variant="destructive">Заблокирован</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Сотрудники</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Экспорт CSV
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (open) fetchRefData(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Новый сотрудник</DialogTitle>
                <DialogDescription>
                  Добавьте нового сотрудника в систему
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="telegramId">Telegram ID *</Label>
                  <Input
                    id="telegramId"
                    type="number"
                    placeholder="123456789"
                    value={newUser.telegramId}
                    onChange={(e) => setNewUser({ ...newUser, telegramId: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="username"
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser({ ...newUser, username: e.target.value.startsWith("@") ? e.target.value.slice(1) : e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">Имя</Label>
                    <Input
                      id="firstName"
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Фамилия</Label>
                    <Input
                      id="lastName"
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    placeholder="+7 900 000 00 00"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="department">Отдел</Label>
                  <Input
                    id="department"
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Должность</Label>
                  <Input
                    id="position"
                    value={newUser.position}
                    onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                  />
                </div>

                {/* Tags */}
                <div className="grid gap-2">
                  <Label>
                    Теги (рассылочные списки)
                    {newUser.tagIds.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        выбрано: {newUser.tagIds.length}
                      </span>
                    )}
                  </Label>
                  {allTags.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Нет созданных тегов</p>
                  ) : (
                    <div className="border rounded-md divide-y max-h-36 overflow-y-auto">
                      {allTags.map((tag) => (
                        <label
                          key={tag.id}
                          className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 shrink-0"
                            checked={newUser.tagIds.includes(tag.id)}
                            onChange={() => toggleNewUserTag(tag.id)}
                          />
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: tag.color || "#6b7280" }}
                          />
                          <span className="text-sm">{tag.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chat package */}
                <div className="grid gap-2">
                  <Label htmlFor="chatPackage">Пакет чатов</Label>
                  <Select
                    value={newUser.chatPackageId}
                    onValueChange={(v) => setNewUser({ ...newUser, chatPackageId: v })}
                  >
                    <SelectTrigger id="chatPackage">
                      <SelectValue placeholder="Без пакета" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без пакета</SelectItem>
                      {allPackages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name}{pkg.isDefault ? " ★" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Бот автоматически отправит инвайт-ссылки на все чаты из пакета
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleCreateUser} disabled={!newUser.telegramId}>Создать</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
          <Select value={searchField} onValueChange={(v) => setSearchField(v as typeof searchField)}>
            <SelectTrigger className="w-40 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все поля</SelectItem>
              <SelectItem value="name">Имя / Фамилия</SelectItem>
              <SelectItem value="username">Username</SelectItem>
              <SelectItem value="phone">Телефон</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={
                searchField === "username" ? "@username" :
                searchField === "phone" ? "+7 900 000 00 00" :
                searchField === "name" ? "Иван Иванов" :
                "Поиск..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">
            Найти
          </Button>
        </form>

        {/* Tag filter */}
        <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); fetchUsers(1, v); }}>
          <SelectTrigger className="w-44 shrink-0">
            <SelectValue placeholder="Фильтр по тегу" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все теги</SelectItem>
            {allTags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 inline-block"
                    style={{ backgroundColor: tag.color || "#6b7280" }}
                  />
                  {tag.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[160px]">Сотрудник</TableHead>
              <TableHead className="min-w-[140px]">Telegram</TableHead>
              <TableHead className="min-w-[120px]">Отдел</TableHead>
              <TableHead className="min-w-[140px]">Теги</TableHead>
              <TableHead className="min-w-[100px]">Статус</TableHead>
              <TableHead className="text-right min-w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Нет сотрудников
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="max-w-[180px]">
                    <div>
                      <p className="font-medium truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.position || "—"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[160px]">
                    <div>
                      <p className="truncate">@{user.username || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {user.telegramId}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[140px]">
                    <p className="truncate">{user.department || "—"}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          style={{
                            borderColor: tag.color,
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                      {user.tags.length > 3 && (
                        <Badge variant="secondary">
                          +{user.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditOpen(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.status !== "BLOCKED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Отправить инвайт-ссылки"
                          onClick={() => handleSendPackageOpen(user.id)}
                        >
                          <Send className="h-4 w-4 text-blue-500" />
                        </Button>
                      )}
                      {user.status === "BLOCKED" ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUnblock(user.id)}
                          >
                            <UserCheck className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleBlock(user.id)}
                        >
                          <UserX className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Показано {users.length} из {pagination.total}
          </p>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => fetchUsers(pagination.page - 1)}
              >
                ←
              </Button>
              {(() => {
                const { page, totalPages } = pagination;
                const pages: (number | "...")[] = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (page > 3) pages.push("...");
                  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
                  if (page < totalPages - 2) pages.push("...");
                  pages.push(totalPages);
                }
                return pages.map((p, i) =>
                  p === "..." ? (
                    <span key={`e${i}`} className="px-1 text-sm text-muted-foreground">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className="w-8"
                      onClick={() => fetchUsers(p as number)}
                    >
                      {p}
                    </Button>
                  )
                );
              })()}
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => fetchUsers(pagination.page + 1)}
              >
                →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Send invites dialog */}
      <Dialog open={isSendPackageOpen} onOpenChange={setIsSendPackageOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Отправить инвайт-ссылки</DialogTitle>
            <DialogDescription>
              Выберите пакет чатов — бот отправит сотруднику ссылки на все чаты из пакета.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Пакет чатов</Label>
            {allPackages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет созданных пакетов</p>
            ) : (
              <Select value={sendPackageId} onValueChange={setSendPackageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите пакет" />
                </SelectTrigger>
                <SelectContent>
                  {allPackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}{pkg.isDefault ? " ★" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendPackageOpen(false)} disabled={sendPackageSaving}>
              Отмена
            </Button>
            <Button onClick={handleSendPackage} disabled={sendPackageSaving || !sendPackageId}>
              {sendPackageSaving ? "Отправка..." : "Отправить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать сотрудника</DialogTitle>
            <DialogDescription>
              {editingUser && (
                <span>Telegram ID: {editingUser.telegramId}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editingUser && (
              <div className="grid gap-2">
                <Label>Telegram ID</Label>
                <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                  {editingUser.telegramId}
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                placeholder="username"
                value={editForm.username}
                onChange={(e) =>
                  setEditForm({ ...editForm, username: e.target.value.startsWith("@") ? e.target.value.slice(1) : e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Телефон</Label>
              <Input
                id="edit-phone"
                placeholder="+7 900 000 00 00"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-firstName">Имя</Label>
                <Input
                  id="edit-firstName"
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, firstName: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-lastName">Фамилия</Label>
                <Input
                  id="edit-lastName"
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-department">Отдел</Label>
              <Input
                id="edit-department"
                value={editForm.department}
                onChange={(e) =>
                  setEditForm({ ...editForm, department: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-position">Должность</Label>
              <Input
                id="edit-position"
                value={editForm.position}
                onChange={(e) =>
                  setEditForm({ ...editForm, position: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleEditSave}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UsersPage;
