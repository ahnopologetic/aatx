import { notFound } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { RepositoryDetail } from "@/components/repository-detail"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, Trash2, Plus } from "lucide-react"

export default function RepositoryPage({ params }) {
  // In a real app, fetch repository data based on params.id
  const repository = {
    id: params.id,
    name: "example-repo",
    owner: "aatx-org",
    lastScanned: "2023-08-01T12:00:00Z",
    eventsCount: 42,
  }

  if (!repository) {
    notFound()
  }

  return (
    <DashboardShell>
      <DashboardHeader heading={repository.name} text={`Repository owned by ${repository.owner}`}>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Rescan
          </Button>
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </DashboardHeader>

      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">Analytics Events</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add to Tracking Plan
            </Button>
          </div>
          <RepositoryDetail repository={repository} />
        </TabsContent>
        <TabsContent value="settings">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Repository Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure scanning options and integrations for this repository.
              </p>
            </div>
            {/* Repository settings form would go here */}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
