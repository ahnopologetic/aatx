import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { RepositoriesList } from "@/components/repositories-list"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default function RepositoriesPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Repositories" text="Manage your GitHub repositories for analytics scanning.">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Repository
        </Button>
      </DashboardHeader>
      <RepositoriesList />
    </DashboardShell>
  )
}
