import { AppSidebar } from "@/app/components/ui/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/app/components/ui/sidebar";
import { ModeHeader } from "@/app/components/layout/mode-header";
import { LocationBootstrap } from "@/app/components/layout/location-bootstrap";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <LocationBootstrap />
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <ModeHeader />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}
