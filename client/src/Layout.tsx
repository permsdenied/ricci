import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6 w-full overflow-auto">
          <SidebarTrigger className="mb-4" />
          <div>{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}