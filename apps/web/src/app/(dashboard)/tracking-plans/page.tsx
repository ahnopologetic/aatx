import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { TrackingPlansList } from "@/components/tracking-plans-list"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default function TrackingPlansPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Tracking Plans" text="Manage your analytics tracking plans and versions.">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Tracking Plan
        </Button>
      </DashboardHeader>
      <TrackingPlansList />
    </DashboardShell>
  )
}
