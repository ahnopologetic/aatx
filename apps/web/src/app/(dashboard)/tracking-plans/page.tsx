import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { TrackingPlansList } from "@/components/tracking-plans-list"
import { NewTrackingPlanDialog } from "@/components/new-tracking-plan-dialog"
import { UsageWarningBanner } from "@/components/usage-warning-banner"

export default function TrackingPlansPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Tracking Plans" text="Manage your analytics tracking plans and versions.">
        <NewTrackingPlanDialog />
      </DashboardHeader>
      <UsageWarningBanner resourceType="tracking_plan" className="mb-6" />
      <TrackingPlansList />
    </DashboardShell>
  )
}
