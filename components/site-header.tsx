"use client"

import { LogOut, SidebarIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme_toggle"
import { useAuth } from "@/lib/auth-context"
import { useSidebar } from "@/components/ui/sidebar"

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()
  const { logout } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.replace("/auth/login")
  }

  return (
    <header className="bg-background/95 sticky top-0 z-50 flex w-full items-center border-b backdrop-blur">
      <div className="flex h-[var(--header-height)] w-full items-center gap-2 px-3">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          title="Toggle sidebar"
        >
          <SidebarIcon />
        </Button>

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
