import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import api from "@/api/axios";
import { toast } from "sonner";
import { Plus, Trash2, Package, Star } from "lucide-react";

interface ChatPackage {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  chats: Array<{ id: string; telegramId: string; title: string; type: string }>;
}

function ChatPackagesPage() {
  const [packages, setPackages] = useState<ChatPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: "", description: "", isDefault: false });

  useEffect(() => {
    fetchPackages();
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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-muted-foreground">Загрузка...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Пакеты чатов</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Создать пакет</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый пакет чатов</DialogTitle>
              <DialogDescription>Создайте набор чатов для автоматического добавления сотрудников</DialogDescription>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <Card key={pkg.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                {pkg.name}
                {pkg.isDefault && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg.id, pkg.name)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{pkg.description || "Без описания"}</p>
              {pkg.isDefault && <Badge variant="secondary" className="mb-4">По умолчанию</Badge>}
              <div className="space-y-2">
                <p className="text-sm font-medium">Чаты ({pkg.chats.length}):</p>
                {pkg.chats.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {pkg.chats.slice(0, 5).map((chat) => <Badge key={chat.id} variant="outline">{chat.title}</Badge>)}
                    {pkg.chats.length > 5 && <Badge variant="secondary">+{pkg.chats.length - 5}</Badge>}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Нет добавленных чатов</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {packages.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">Нет пакетов чатов. Создайте первый пакет.</div>}
      </div>
    </div>
  );
}

export default ChatPackagesPage;