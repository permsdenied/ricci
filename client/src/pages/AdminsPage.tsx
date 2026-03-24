import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "@/api/axios";
import { toast } from "sonner";
import { Trash2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Admin {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "VIEWER";
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<Admin["role"], string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  VIEWER: "Viewer",
};

function AdminsPage() {
  const { admin: me } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.get("/auth/admins")
      .then((r) => setAdmins(r.data.data))
      .catch(() => toast.error("Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (admin: Admin) => {
    if (!confirm(`Удалить администратора ${admin.name} (${admin.email})?`)) return;
    setDeletingId(admin.id);
    try {
      await api.delete(`/auth/admins/${admin.id}`);
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
      toast.success("Администратор удалён");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Ошибка удаления");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-7 w-7" />
        <h1 className="text-3xl font-bold">Администраторы</h1>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Имя</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Дата создания</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell className="font-medium">
                  {admin.name}
                  {admin.id === me?.id && (
                    <span className="ml-2 text-xs text-muted-foreground">(вы)</span>
                  )}
                </TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell>
                  <Badge variant={admin.role === "SUPER_ADMIN" ? "default" : "secondary"}>
                    {ROLE_LABELS[admin.role]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(admin.createdAt).toLocaleDateString("ru-RU")}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={admin.id === me?.id || deletingId === admin.id}
                    onClick={() => handleDelete(admin)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default AdminsPage;
