import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import api from "@/api/axios";
import { toast } from "sonner";
import { Plus, Trash2, Package, Star, Edit, MessageSquare } from "lucide-react";

interface Chat {
  id: string;
  telegramId: string;
  title: string;
  type: string;
  isActive: boolean;
}

interface ChatPackage {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  chats: Array<{ id: string; telegramId: string; title: string; type: string }>;
}

function ChatPackagesPage() {
  const [packages, setPackages] = useState<ChatPackage[]>([]);
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: "", description: "", isDefault: false });

  // Edit dialog
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<ChatPackage | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [editSelectedChatIds, setEditSelectedChatIds] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetchPackages();
    fetchChats();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await api.get("/chat-packages");
      setPackages(response.data.data);
    } catch (error) {
      console.error("Failed to fetch packages:", error);
      toast.error("Ошибка загрузки пакетов");
    } finally {
      setLoading(false);
    }
  };

  const fetchChats = async () => {
    try {
      const response = await api.get("/chats");
      setAllChats(response.data.data.filter((c: Chat) => c.isActive));
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post("/chat-packages", {
        name: newPackage.name,
        description: newPackage.description || undefined,
        isDefault: newPackage.isDefault,
      });
      toast.success("Пакет создан");
      setIsCreateOpen(false);
      setNewPackage({ name: "", description: "", isDefault: false });
      fetchPackages();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Ошибка создания");
    }
  };

  const handleDelete = async (packageId: string, packageName: string) => {
    if (!confirm(`Удалить пакет "${packageName}"?`)) return;
    try {
      await api.delete(`/chat-packages/${packageId}`);
      toast.success("Пакет удален");
      fetchPackages();
    } catch (error) {
      toast.error("Ошибка удаления");
    }
  };

  const handleEditOpen = (pkg: ChatPackage) => {
    setEditingPkg(pkg);
    setEditName(pkg.name);
    setEditDescription(pkg.description || "");
    setEditIsDefault(pkg.isDefault);
    setEditSelectedChatIds(pkg.chats.map((c) => c.id));
    setIsEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingPkg) return;
    setEditSaving(true);
    try {
      // Update name/description/isDefault
      await api.patch(`/chat-packages/${editingPkg.id}`, {
        name: editName,
        description: editDescription || undefined,
        isDefault: editIsDefault,
      });
      // Update chats
      await api.put(`/chat-packages/${editingPkg.id}/chats`, {
        chatIds: editSelectedChatIds,
      });
      toast.success("Пакет обновлён");
      setIsEditOpen(false);
      setEditingPkg(null);
      fetchPackages();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Ошибка сохранения");
    } finally {
      setEditSaving(false);
    }
  };

  const toggleChatInEdit = (chatId: string) => {
    setEditSelectedChatIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId],
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-muted-foreground">Загрузка...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Пакеты чатов</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Набор чатов, которые автоматически назначаются сотруднику при онбординге
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Создать пакет</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый пакет чатов</DialogTitle>
              <DialogDescription>
                Создайте набор чатов для автоматического добавления сотрудников.
                После создания откройте редактирование пакета, чтобы добавить чаты.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Название *</Label>
                <Input id="name" placeholder="Базовый пакет" value={newPackage.name} onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Описание</Label>
                <Input id="description" placeholder="Обязательные чаты для всех" value={newPackage.description} onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isDefault" checked={newPackage.isDefault} onChange={(e) => setNewPackage({ ...newPackage, isDefault: e.target.checked })} className="h-4 w-4" />
                <Label htmlFor="isDefault">Пакет по умолчанию для новых сотрудников</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Отмена</Button>
              <Button onClick={handleCreate} disabled={!newPackage.name}>Создать</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* How it works hint */}
      <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Как работают пакеты чатов:</p>
        <p>1. Создайте пакет и добавьте в него нужные чаты через кнопку <strong>Редактировать</strong>.</p>
        <p>2. При создании сотрудника выберите пакет — бот автоматически отправит ему инвайт-ссылки на все чаты из пакета.</p>
        <p>3. Пакет <strong>«По умолчанию»</strong> подставляется автоматически при создании нового сотрудника.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <Card key={pkg.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                {pkg.name}
                {pkg.isDefault && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleEditOpen(pkg)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg.id, pkg.name)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{pkg.description || "Без описания"}</p>
              {pkg.isDefault && <Badge variant="secondary" className="mb-3">По умолчанию</Badge>}
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  Чаты ({pkg.chats.length}):
                </p>
                {pkg.chats.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {pkg.chats.slice(0, 5).map((chat) => (
                      <Badge key={chat.id} variant="outline">{chat.title}</Badge>
                    ))}
                    {pkg.chats.length > 5 && <Badge variant="secondary">+{pkg.chats.length - 5}</Badge>}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Нет чатов — нажмите «Редактировать»
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {packages.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Нет пакетов чатов. Создайте первый пакет.
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать пакет</DialogTitle>
            <DialogDescription>Измените название, описание и состав чатов</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Название *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Необязательно" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editIsDefault"
                checked={editIsDefault}
                onChange={(e) => setEditIsDefault(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="editIsDefault">Пакет по умолчанию</Label>
            </div>

            <div className="grid gap-2">
              <Label>
                Чаты в пакете
                <span className="ml-2 text-xs text-muted-foreground">
                  ({editSelectedChatIds.length} выбрано)
                </span>
              </Label>
              {allChats.length === 0 ? (
                <p className="text-sm text-muted-foreground border rounded-md p-3">
                  Нет доступных чатов. Добавьте бота в чаты сначала.
                </p>
              ) : (
                <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                  {allChats.map((chat) => (
                    <label
                      key={chat.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0"
                        checked={editSelectedChatIds.includes(chat.id)}
                        onChange={() => toggleChatInEdit(chat.id)}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{chat.title}</p>
                        <p className="text-xs text-muted-foreground">{chat.type}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={editSaving}>
              Отмена
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving || !editName}>
              {editSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ChatPackagesPage;
