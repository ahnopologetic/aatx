"use client"
import { Database } from "@/lib/database.types"
import { DashboardHeader } from "./dashboard-header"
import { DashboardShell } from "./dashboard-shell"
import { Button } from "./ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { RefreshCw, Trash2, Plus } from "lucide-react"
import { deleteRepository, rescanRepository } from "@/app/(dashboard)/repositories/[id]/action"
import { RepositoryDetail } from "./repository-detail"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type RepositoryDetailViewProps = {
    repository: Database['public']['Tables']['repos']['Row']
}

export const RepositoryDetailView = ({ repository }: RepositoryDetailViewProps) => {
    const router = useRouter()
    const handleRescan = async () => {
        await rescanRepository(`${repository.name}`)
    }

    const handleDelete = async () => {
        await deleteRepository(`${repository.name}`)
        toast.success("Repository deleted")
        router.push("/repositories")
    }

    return (
        <DashboardShell>
            <DashboardHeader heading={`${repository.name}`} text={`${repository.name}`}>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleRescan}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Rescan
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDelete}>
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

export default RepositoryDetailView