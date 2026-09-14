"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileChartColumnIncreasing,
  FilePenLine,
  Home,
  LogOut,
  Map,
  MapPinned,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useAuth, type UserRole } from "@/app/lib/auth";
import { Button } from "./button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./sidebar";

const ROLE_LABELS: Record<UserRole, string> = {
  pemda_admin: "Admin Pemda",
  operator_tod: "Operator TOD",
  umkm: "Pelaku Usaha",
  public_user: "Pengguna",
};

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: readonly UserRole[];
};

const navigationItems: readonly NavigationItem[] = [
  {
    label: "Beranda",
    href: "/beranda/",
    icon: Home,
    roles: ["umkm", "operator_tod", "pemda_admin", "public_user"],
  },
  {
    label: "UMKM Self-Tracker",
    href: "/umkm-self-tracker/",
    icon: FilePenLine,
    roles: ["umkm", "operator_tod", "pemda_admin"],
  },
  {
    label: "Profil Usaha",
    href: "/profil-usaha/",
    icon: UserRound,
    roles: ["umkm"],
  },
  {
    label: "Lihat Realokasi",
    href: "/reallocation/",
    icon: MapPinned,
    roles: ["umkm"],
  },
  {
    label: "ESG Dashboard",
    href: "/esg-dashboard/",
    icon: FileChartColumnIncreasing,
    roles: ["operator_tod", "pemda_admin"],
  },
  {
    label: "Laporan Alokasi",
    href: "/report-allocation/",
    icon: FileChartColumnIncreasing,
    roles: ["operator_tod", "pemda_admin"],
  },
  {
    label: "Tenant Matching",
    href: "/tenant-matching/",
    icon: UsersRound,
    roles: ["operator_tod", "pemda_admin"],
  },
  {
    label: "Discovery Map",
    href: "/discovery-map/",
    icon: Map,
    roles: ["operator_tod", "pemda_admin"],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, signOut } = useAuth();

  const currentRole = role ?? "umkm";

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-neutral-50">
      <SidebarHeader className="px-6 pb-8 pt-8 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pt-8">
        <Link
          href="/beranda/"
          className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary-300 group-data-[collapsible=icon]:justify-center"
        >
          <span className="flex size-15 shrink-0 items-center justify-center rounded-lg text-neutral-0">
            <img src="./titiktemu.png" className="w-[128px]"/>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-4 py-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
          <SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <SidebarMenu className="gap-8 group-data-[collapsible=icon]:items-center">
              {navigationItems
                .filter((item) => item.roles.includes(currentRole))
                .map(({ label, href, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href);

                return (
                  <SidebarMenuItem
                    key={href}
                    className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
                  >
                    <SidebarMenuButton
                      render={<Link href={href} aria-label={label} />}
                      isActive={isActive}
                      size="lg"
                      tooltip={label}
                      className="h-14 rounded-xl px-4 font-sans text-b7 text-primary-600 hover:bg-primary-50 hover:text-primary-700 data-active:bg-primary-700 data-active:text-neutral-0 data-active:hover:bg-primary-700 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-14 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 [&>svg]:size-6"
                    >
                      <Icon strokeWidth={1.8} />
                      <span className="group-data-[collapsible=icon]:hidden">
                        {label}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 px-4 pb-6 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
        {user && (
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate font-sans text-b7 font-medium text-secondary-800">
              {user.email}
            </span>
            {role && (
              <span className="font-sans text-b9 text-neutral-500">
                {ROLE_LABELS[role]}
              </span>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void signOut().then(() => router.push("/login"));
          }}
          className="w-full justify-start gap-3 px-2 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <LogOut className="size-5" strokeWidth={1.8} />
          <span className="group-data-[collapsible=icon]:hidden">Keluar</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
