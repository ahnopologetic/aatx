"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BarChart, GitBranch, Home, Settings, User } from "lucide-react"

export default function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="grid items-start px-2 py-4 text-sm">
      <Link href="/dashboard" className="mb-1">
        <Button variant="ghost" className={cn("w-full justify-start", pathname === "/dashboard" && "bg-accent")}>
          <Home className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      <Link href="/repositories" className="mb-1">
        <Button
          variant="ghost"
          className={cn("w-full justify-start", pathname?.startsWith("/repositories") && "bg-accent")}
        >
          <GitBranch className="mr-2 h-4 w-4" />
          Repositories
        </Button>
      </Link>
      <Link href="/tracking-plans" className="mb-1">
        <Button
          variant="ghost"
          className={cn("w-full justify-start", pathname?.startsWith("/tracking-plans") && "bg-accent")}
        >
          <BarChart className="mr-2 h-4 w-4" />
          Tracking Plans
        </Button>
      </Link>
      <Link href="/profile" className="mb-1">
        <Button variant="ghost" className={cn("w-full justify-start", pathname === "/profile" && "bg-accent")}>
          <User className="mr-2 h-4 w-4" />
          Profile
        </Button>
      </Link>
      <Link href="/settings" className="mb-1">
        <Button variant="ghost" className={cn("w-full justify-start", pathname === "/settings" && "bg-accent")}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </Link>
    </nav>
  )
}
