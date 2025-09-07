"use client"
import { deleteRepository, rescanRepository } from "@/app/(dashboard)/repositories/[id]/action"
import { Database } from "@/lib/database.types"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { RepositoryRescanButton } from "./agent/repository-rescan-button"
import { RescanStatusBadge } from "./rescan-status-badge"
import { RescanHistoryTab } from "./rescan-history-tab"
import { RescanNudge } from "./rescan-nudge"
import { WebhookConfig } from "./webhook-config"
import { DashboardHeader } from "./dashboard-header"
import { DashboardShell } from "./dashboard-shell"
import { RepositoryDetail } from "./repository-detail"
import { Button } from "./ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import { useState, useEffect } from "react"

type RepositoryDetailViewProps = {
    repository: Database['public']['Tables']['repos']['Row']
}

export const RepositoryDetailView = ({ repository }: RepositoryDetailViewProps) => {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("events")
    const [pendingChangesCount, setPendingChangesCount] = useState(0)

    const handleRescan = async () => {
        await rescanRepository(`${repository.name}`)
    }

    const handleDelete = async () => {
        await deleteRepository(`${repository.name}`)
        toast.success("Repository deleted")
        router.push("/repositories")
    }

    const handleRescanComplete = () => {
        // Switch to rescan history tab when rescan completes
        setActiveTab("rescan-history")
    }

    const fetchPendingChangesCount = async () => {
        try {
            const response = await fetch(`/api/repositories/${repository.id}/rescan-changes?status=pending`)
            if (response.ok) {
                const data = await response.json()
                setPendingChangesCount(data.changes?.length || 0)
            }
        } catch (error) {
            console.error('Failed to fetch pending changes count:', error)
        }
    }

    useEffect(() => {
        fetchPendingChangesCount()
    }, [repository.id])

    return (
        <DashboardShell>
            <DashboardHeader heading={`${repository.name}`} text={`${repository.description || repository.name}`}>
                <div className="flex items-center gap-4">
                    {/* Rescan Status Badge */}
                    <RescanStatusBadge repositoryId={repository.id} />
                    
                    {/* Enhanced Rescan Button */}
                    <RepositoryRescanButton 
                        repositoryId={repository.id}
                        onRescanComplete={handleRescanComplete}
                    />
                    
                    {/* Delete Button */}
                    <Button variant="destructive" size="sm" onClick={handleDelete}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                </div>
            </DashboardHeader>

            {/* Rescan Nudge - shows when repository has new commits */}
            <RescanNudge 
                repositoryId={repository.id}
                repositoryUrl={repository.url || undefined}
                onRescanClick={handleRescan}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList>
                    <TabsTrigger value="events">Analytics Events</TabsTrigger>
                    <TabsTrigger value="rescan-history">
                        Rescan History
                        {pendingChangesCount > 0 && (
                            <Badge variant="destructive" className="ml-2">
                                {pendingChangesCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="events" className="space-y-4">
                    <RepositoryDetail repository={repository} />
                </TabsContent>
                <TabsContent value="rescan-history" className="space-y-4">
                    <RescanHistoryTab repositoryId={repository.id} />
                </TabsContent>
                <TabsContent value="settings">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-lg font-medium">Repository Settings</h3>
                            <p className="text-sm text-muted-foreground">
                                Configure scanning options and integrations for this repository.
                            </p>
                        </div>
                        
                        {/* Webhook Configuration */}
                        <WebhookConfig 
                            repositoryId={repository.id}
                            repositoryName={repository.name}
                            repositoryUrl={repository.url || undefined}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </DashboardShell>
    )
}

export default RepositoryDetailView