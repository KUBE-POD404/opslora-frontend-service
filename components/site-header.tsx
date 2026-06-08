"use client"

import { LogOut, SidebarIcon } from "lucide-react"
import Link from "next/link"
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
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"

type HeaderNavItem = {
  label: string
  href: string
  isActive?: (pathname: string) => boolean
}

type HeaderRoute = {
  parentLabel: string
  parentHref: string
  pageLabel: string
  subNav: HeaderNavItem[]
}

const customerNav: HeaderNavItem[] = [
  { label: "Customers", href: "/customers", isActive: (path) => path === "/customers" },
  { label: "Create", href: "/customers/new" },
]

const orderNav: HeaderNavItem[] = [
  { label: "Orders", href: "/orders", isActive: (path) => path === "/orders" },
]

const settingsNav: HeaderNavItem[] = [
  { label: "Business", href: "/settings" },
  { label: "Tax", href: "/settings/tax-profile" },
  { label: "Invoice Defaults", href: "/settings/invoice-defaults" },
  { label: "Feature Flags", href: "/settings/feature-flags" },
  { label: "Portal", href: "/settings/portal" },
  { label: "Profile", href: "/settings/profile" },
]

function getHeaderRoute(pathname: string): HeaderRoute {
  if (pathname === "/dashboard") {
    return {
      parentLabel: "Dashboard",
      parentHref: "/dashboard",
      pageLabel: "Overview",
      subNav: [{ label: "Overview", href: "/dashboard" }],
    }
  }

  if (pathname === "/customers/new") {
    return {
      parentLabel: "Customers",
      parentHref: "/customers",
      pageLabel: "Create Customer",
      subNav: customerNav,
    }
  }

  if (/^\/customers\/\d+\/edit$/.test(pathname)) {
    const customerId = pathname.split("/")[2]
    return {
      parentLabel: "Customers",
      parentHref: "/customers",
      pageLabel: `Edit Customer #${customerId}`,
      subNav: [
        ...customerNav,
        { label: "Editing", href: pathname, isActive: (path) => path === pathname },
      ],
    }
  }

  if (pathname.startsWith("/customers")) {
    return {
      parentLabel: "Customers",
      parentHref: "/customers",
      pageLabel: "Manage Customers",
      subNav: customerNav,
    }
  }

  if (pathname === "/inventory") {
    return {
      parentLabel: "Inventory",
      parentHref: "/inventory",
      pageLabel: "Products And Stock",
      subNav: [{ label: "Products & Stock", href: "/inventory" }],
    }
  }

  if (pathname === "/orders") {
    return {
      parentLabel: "Orders",
      parentHref: "/orders",
      pageLabel: "Manage Orders",
      subNav: orderNav,
    }
  }

  if (/^\/orders\/\d+\/create-invoice$/.test(pathname)) {
    const orderId = pathname.split("/")[2]
    return {
      parentLabel: "Orders",
      parentHref: "/orders",
      pageLabel: `Create Invoice for Order #${orderId}`,
      subNav: [
        ...orderNav,
        { label: "Create Invoice", href: pathname, isActive: (path) => path === pathname },
      ],
    }
  }

  if (pathname === "/invoices") {
    return {
      parentLabel: "Invoices",
      parentHref: "/invoices",
      pageLabel: "All Invoices",
      subNav: [{ label: "Invoices", href: "/invoices" }],
    }
  }

  if (/^\/invoices\/\d+\/pay$/.test(pathname)) {
    const invoiceId = pathname.split("/")[2]
    return {
      parentLabel: "Invoices",
      parentHref: `/invoices/${invoiceId}`,
      pageLabel: `Add Payment (Invoice #${invoiceId})`,
      subNav: [
        { label: "Invoices", href: "/invoices" },
        { label: `Invoice #${invoiceId}`, href: `/invoices/${invoiceId}` },
        { label: "Add Payment", href: pathname },
      ],
    }
  }

  if (/^\/invoices\/\d+$/.test(pathname)) {
    const invoiceId = pathname.split("/")[2]
    return {
      parentLabel: "Invoices",
      parentHref: "/invoices",
      pageLabel: `Invoice #${invoiceId}`,
      subNav: [
        { label: "Invoices", href: "/invoices" },
        { label: `Invoice #${invoiceId}`, href: pathname },
        { label: "Add Payment", href: `${pathname}/pay` },
      ],
    }
  }

  if (pathname === "/payments") {
    return {
      parentLabel: "Payments",
      parentHref: "/payments",
      pageLabel: "Reconciliation",
      subNav: [{ label: "Reconciliation", href: "/payments" }],
    }
  }

  if (pathname === "/settings") {
    return {
      parentLabel: "Settings",
      parentHref: "/settings",
      pageLabel: "Business Profile",
      subNav: settingsNav,
    }
  }

  if (pathname === "/settings/tax-profile") {
    return {
      parentLabel: "Settings",
      parentHref: "/settings",
      pageLabel: "Tax Profile",
      subNav: settingsNav,
    }
  }

  if (pathname === "/settings/invoice-defaults") {
    return {
      parentLabel: "Settings",
      parentHref: "/settings",
      pageLabel: "Invoice Defaults",
      subNav: settingsNav,
    }
  }

  if (pathname === "/settings/feature-flags") {
    return {
      parentLabel: "Settings",
      parentHref: "/settings",
      pageLabel: "Feature Flags",
      subNav: settingsNav,
    }
  }

  if (pathname === "/settings/portal") {
    return {
      parentLabel: "Settings",
      parentHref: "/settings",
      pageLabel: "Portal",
      subNav: settingsNav,
    }
  }

  if (pathname === "/settings/profile") {
    return {
      parentLabel: "Settings",
      parentHref: "/settings",
      pageLabel: "Profile Settings",
      subNav: settingsNav,
    }
  }

  return {
    parentLabel: "Opslora",
    parentHref: "/dashboard",
    pageLabel: "Workspace",
    subNav: [],
  }
}

function isSubNavActive(pathname: string, item: HeaderNavItem) {
  return item.isActive ? item.isActive(pathname) : pathname === item.href
}

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()
  const { logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const route = getHeaderRoute(pathname)

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
              <BreadcrumbLink asChild>
                <Link href={route.parentHref}>
                  {route.parentLabel}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{route.pageLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {route.subNav.length > 0 ? (
          <>
            <Separator orientation="vertical" className="mx-2 hidden h-4 md:block" />
            <nav
              className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex"
              aria-label={`${route.parentLabel} navigation`}
            >
              {route.subNav.map((item) => {
                const active = isSubNavActive(pathname, item)

                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={cn(
                      "text-muted-foreground hover:text-foreground shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                      active && "bg-muted text-foreground"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </>
        ) : null}

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
