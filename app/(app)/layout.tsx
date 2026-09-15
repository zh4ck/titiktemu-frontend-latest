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
    // h-svh (not just SidebarProvider's own min-h-svh) gives this shell a
    // DEFINITE height so the flex-1/min-h-0 chain below actually resolves
    // to "remaining viewport space" instead of growing with content --
    // required for map pages to fill exactly the space left after the
    // header, with only their own side panel scrolling (see home.tsx,
    // discovery-map.tsx). Non-map pages opt back into normal page
    // scrolling via `h-full overflow-y-auto` on their own root element.
    <SidebarProvider className="h-svh">
      <LocationBootstrap />
      <AppSidebar />
      <div className="flex flex-1 min-h-0 flex-col min-w-0">
        <ModeHeader />
        <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      </div>
    </SidebarProvider>
  );
}
