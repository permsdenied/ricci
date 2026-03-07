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
import { useAuth } from "@/contexts/AuthContext";

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAuth();

  const navItems = [
    { title: "Дашборд", url: "/dashboard", icon: LayoutDashboard },
    { title: "Сотрудники", url: "/users", icon: Users },
    { title: "Теги", url: "/tags", icon: Tags },
    { title: "Чаты", url: "/chats", icon: MessageSquare },
    { title: "Пакеты чатов", url: "/chat-packages", icon: Package },
    { title: "Рассылки", url: "/broadcasts", icon: Send },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
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
          <SidebarMenuButton
            onClick={handleLogout}
            className="p-2 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}