import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { RepositoriesList } from "@/components/repositories-list"
import { UsageWarningBanner } from "@/components/usage-warning-banner"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import Link from "next/link"

export default function RepositoriesPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Repositories" text="Manage your GitHub repositories for analytics scanning.">
        <Link href="/repositories/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Repository
          </Button>
        </Link>
      </DashboardHeader>
      <UsageWarningBanner resourceType="repository" className="mb-6" />
      <RepositoriesList />
    </DashboardShell>
  )
}
