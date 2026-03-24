import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Tags,
  MessageSquare,
  Package,
  Send,
  LogOut,
  Bot,
  KeyRound,
  UserPlus,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/api/axios";
import { toast } from "sonner";

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAuth();

  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwLoading, setPwLoading] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: "", name: "", role: "ADMIN" });
  const [adminLoading, setAdminLoading] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const navItems = [
    { title: "Дашборд", url: "/dashboard", icon: LayoutDashboard },
    { title: "Сотрудники", url: "/users", icon: Users },
    { title: "Теги", url: "/tags", icon: Tags },
    { title: "Чаты", url: "/chats", icon: MessageSquare },
    { title: "Пакеты чатов", url: "/chat-packages", icon: Package },
    { title: "Рассылки", url: "/broadcasts", icon: Send },
    ...(admin?.role === "SUPER_ADMIN"
      ? [{ title: "Администраторы", url: "/admins", icon: ShieldCheck }]
      : []),
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("Новые пароли не совпадают");
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error("Новый пароль должен быть не менее 6 символов");
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success("Пароль успешно изменён");
      setPwOpen(false);
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Ошибка смены пароля");
    } finally {
      setPwLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!adminForm.email || !adminForm.name) {
      toast.error("Заполните все поля");
      return;
    }
    setAdminLoading(true);
    try {
      const res = await api.post("/auth/register", adminForm);
      const { generatedPassword } = res.data.data;
      if (generatedPassword) {
        setCreatedPassword(generatedPassword);
      } else {
        toast.success("Администратор создан");
        setAdminOpen(false);
        setAdminForm({ email: "", name: "", role: "ADMIN" });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Ошибка создания");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (!createdPassword) return;
    navigator.clipboard.writeText(createdPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdminDialogClose = () => {
    setAdminOpen(false);
    setCreatedPassword(null);
    setAdminForm({ email: "", name: "", role: "ADMIN" });
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-lg">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold">Ricci Bot</h1>
              <p className="text-xs text-muted-foreground">Internal Comms</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Навигация</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                    >
                      <a
                        href={item.url}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(item.url);
                        }}
                        className="flex items-center gap-2"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{admin?.name}</p>
              <p className="text-xs text-muted-foreground">{admin?.email}</p>
            </div>
            <div className="flex items-center gap-1">
              {admin?.role === "SUPER_ADMIN" && (
                <SidebarMenuButton
                  onClick={() => setAdminOpen(true)}
                  className="p-2 cursor-pointer"
                  title="Создать администратора"
                >
                  <UserPlus className="h-4 w-4" />
                </SidebarMenuButton>
              )}
              <SidebarMenuButton
                onClick={() => setPwOpen(true)}
                className="p-2 cursor-pointer"
                title="Сменить пароль"
              >
                <KeyRound className="h-4 w-4" />
              </SidebarMenuButton>
              <SidebarMenuButton
                onClick={handleLogout}
                className="p-2 cursor-pointer"
                title="Выйти"
              >
                <LogOut className="h-4 w-4" />
              </SidebarMenuButton>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <Dialog open={adminOpen} onOpenChange={handleAdminDialogClose}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Создать администратора</DialogTitle>
          </DialogHeader>

          {createdPassword ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Администратор создан. Сохраните пароль — он больше не будет показан.
              </p>
              <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
                <code className="flex-1 text-sm font-mono break-all">{createdPassword}</code>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopyPassword}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={handleAdminDialogClose}>Готово</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Имя</Label>
                <Input
                  value={adminForm.name}
                  onChange={(e) => setAdminForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Иван Иванов"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="ivan@ricci.ru"
                />
              </div>
<p className="text-xs text-muted-foreground">Пароль будет сгенерирован автоматически (24 символа)</p>
              <DialogFooter>
                <Button variant="outline" onClick={handleAdminDialogClose}>Отмена</Button>
                <Button onClick={handleCreateAdmin} disabled={adminLoading}>
                  {adminLoading ? "Создание..." : "Создать"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Смена пароля</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Текущий пароль</Label>
              <Input
                type="password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Новый пароль</Label>
              <Input
                type="password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Повторите новый пароль</Label>
              <Input
                type="password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>Отмена</Button>
            <Button onClick={handleChangePassword} disabled={pwLoading}>
              {pwLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
