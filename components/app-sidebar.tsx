"use client"

import * as React from "react"
import {
  BarChart3,
  Bot,
  CreditCard,
  FileText,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  Package,
  Receipt,
  Send,
  Settings2,
  ShoppingCart,
  Users,
} from "lucide-react"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { SearchForm } from "@/components/search-form"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth-context"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      items: [],
    },
    {
      title: "Customers",
      url: "/customers",
      icon: Users,
      items: [
        {
          title: "All customers",
          url: "/customers",
        },
        {
          title: "Create customer",
          url: "/customers/new",
        },
      ],
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: Package,
      items: [],
    },
    {
      title: "Orders",
      url: "/orders",
      icon: ShoppingCart,
      items: [],
    },
    {
      title: "Invoices",
      url: "/invoices",
      icon: Receipt,
      items: [],
    },
    {
      title: "Payments",
      url: "/payments",
      icon: CreditCard,
      items: [],
    },
    {
      title: "Lora AI",
      url: "/lora-ai",
      icon: Bot,
      items: [],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [
        {
          title: "Business profile",
          url: "/settings",
        },
        {
          title: "Tax profile",
          url: "/settings/tax-profile",
        },
        {
          title: "Invoice defaults",
          url: "/settings/invoice-defaults",
        },
        {
          title: "Feature flags",
          url: "/settings/feature-flags",
        },
        {
          title: "Portal",
          url: "/settings/portal",
        },
        {
          title: "Profile Settings",
          url: "/settings/profile",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Invoice templates",
      url: "/settings/invoice-templates",
      icon: FileText,
    },
    {
      name: "Customer portal",
      url: "/settings",
      icon: Globe2,
    },
    {
      name: "Reports",
      url: "/reports",
      icon: BarChart3,
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
  user: {
    name: "Opslora Admin",
    email: "owner@opslora.app",
    avatar: "",
  },
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user } = useAuth()
  const navMain = data.navMain.map((item) => ({
    ...item,
    isActive:
      item.url === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === item.url || pathname.startsWith(`${item.url}/`),
    items: item.items?.map((subItem) => ({
      ...subItem,
      isActive:
        subItem.url === "/settings"
          ? pathname === "/settings"
          : pathname === subItem.url || pathname.startsWith(`${subItem.url}/`),
    })),
  }))
  const displayName =
    user?.display_name || user?.full_name || user?.email || data.user.name
  const sidebarUser = {
    name: displayName,
    email: user?.email || data.user.email,
    avatar: data.user.avatar,
  }

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]"
      {...props}
    >
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <img
                src="/opslora-mark.svg"
                alt=""
                className="size-8 rounded-lg shadow-[0_10px_24px_rgba(63,70,216,0.22)]"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Opslora</span>
                <span className="truncate text-xs">Business OS</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SearchForm />
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
