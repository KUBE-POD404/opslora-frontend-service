"use client"

import { LogOut, SidebarIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme_toggle"
import { useAuth } from "@/lib/auth-context"
import { useSidebar } from "@/components/ui/sidebar"

function getBreadcrumb(pathname: string) {
  if (pathname === "/dashboard") {
    return ["Dashboard", "/dashboard", "Overview"] as const
  }

  if (pathname === "/customers/new") {
    return ["Customers", "/customers", "Create Customer"] as const
  }

  if (/^\/customers\/\d+\/edit$/.test(pathname)) {
    const customerId = pathname.split("/")[2]
    return ["Customers", "/customers", `Edit Customer #${customerId}`] as const
  }

  if (pathname.startsWith("/customers")) {
    return ["Customers", "/customers", "Manage Customers"] as const
  }

  if (pathname === "/inventory") {
    return ["Inventory", "/inventory", "Products And Stock"] as const
  }

  if (pathname === "/orders") {
    return ["Orders", "/orders", "Manage Orders"] as const
  }

  if (/^\/orders\/\d+\/create-invoice$/.test(pathname)) {
    const orderId = pathname.split("/")[2]
    return ["Orders", "/orders", `Create Invoice for Order #${orderId}`] as const
  }

  if (pathname === "/invoices") {
    return ["Invoices", "/invoices", "All Invoices"] as const
  }

  if (/^\/invoices\/\d+\/pay$/.test(pathname)) {
    const invoiceId = pathname.split("/")[2]
    return ["Invoices", `/invoices/${invoiceId}`, `Add Payment (Invoice #${invoiceId})`] as const
  }

  if (/^\/invoices\/\d+$/.test(pathname)) {
    const invoiceId = pathname.split("/")[2]
    return ["Invoices", "/invoices", `Invoice #${invoiceId}`] as const
  }

  if (pathname === "/payments") {
    return ["Payments", "/payments", "Reconciliation"] as const
  }

  if (pathname === "/settings") {
    return ["Settings", "/settings", "Business Profile"] as const
  }

  if (pathname === "/settings/tax-profile") {
    return ["Settings", "/settings", "Tax Profile"] as const
  }

  if (pathname === "/settings/invoice-defaults") {
    return ["Settings", "/settings", "Invoice Defaults"] as const
  }

  if (pathname === "/settings/feature-flags") {
    return ["Settings", "/settings", "Feature Flags"] as const
  }

  if (pathname === "/settings/portal") {
    return ["Settings", "/settings", "Portal"] as const
  }

  if (pathname === "/settings/profile") {
    return ["Settings", "/settings", "Profile Settings"] as const
  }

  return ["Opslora", "/dashboard", "Workspace"] as const
}

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()
  const { logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [parentLabel, parentHref, pageLabel] = getBreadcrumb(pathname)

  async function handleLogout() {
    await logout()
    router.replace("/auth/login")
  }

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-[var(--header-height)] w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          title="Toggle sidebar"
        >
          <SidebarIcon />
        </Button>

        <Separator orientation="vertical" className="mr-2 h-4" />

        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={parentHref}>
                {parentLabel}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Button
            className="h-8 w-8"
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut />
          </Button>
        </div>
      </div>
    </header>
  )
}
