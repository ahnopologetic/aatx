"use client"

import { notFound } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { TrackingPlanDetail } from "@/components/tracking-plan-detail"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Code, History, Plus } from "lucide-react"
// import { Database } from "@/lib/database.types"
import { createClient } from "@/utils/supabase/client"

export default async function TrackingPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()
  const { data: trackingPlan, error } = await supabase.from('plans').select('*').eq('id', id).single()

  if (error || !trackingPlan) {
    notFound()
  }

  return (
    <DashboardShell>
      <DashboardHeader heading={trackingPlan.name} text={`Version ${trackingPlan.version}`}>
        <div className="flex items-center gap-2">
          <Button onClick={async () => { await fetch(`/api/tracking-plans/${trackingPlan.id}/version`, { method: 'POST' }) }}>
            <Plus className="mr-2 h-4 w-4" /> New Version
          </Button>
          <Button variant="outline">
            <Code className="mr-2 h-4 w-4" />
            Ask AATX Coder
          </Button>
        </div>
      </DashboardHeader>

      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="versions">Version History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="events" className="space-y-4">
          <TrackingPlanDetail trackingPlan={trackingPlan} />
        </TabsContent>
        <TabsContent value="versions">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Version History</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="font-medium">Version 1.2.0</p>
                  <p className="text-sm text-muted-foreground">Updated July 28, 2023</p>
                </div>
                <Button variant="outline" size="sm">
                  <History className="mr-2 h-4 w-4" />
                  View
                </Button>
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="font-medium">Version 1.1.0</p>
                  <p className="text-sm text-muted-foreground">Updated June 15, 2023</p>
                </div>
                <Button variant="outline" size="sm">
                  <History className="mr-2 h-4 w-4" />
                  View
                </Button>
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="font-medium">Version 1.0.0</p>
                  <p className="text-sm text-muted-foreground">Updated May 3, 2023</p>
                </div>
                <Button variant="outline" size="sm">
                  <History className="mr-2 h-4 w-4" />
                  View
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="settings">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Tracking Plan Settings</h3>
              <p className="text-sm text-muted-foreground">Configure settings for this tracking plan.</p>
            </div>
            {/* Tracking plan settings form would go here */}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
