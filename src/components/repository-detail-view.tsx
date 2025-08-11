"use client"
import { Database } from "@/lib/database.types"
import * as React from "react"
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
                    <TabsTrigger value="add-to-plan">Add to Tracking Plan</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="events" className="space-y-4">
                    <div className="flex justify-end">
                        <Button size="sm" onClick={() => { (document.getElementById('add-to-plan-tab') as HTMLButtonElement)?.click() }}>
                            <Plus className="mr-2 h-4 w-4" /> Add to Tracking Plan
                        </Button>
                    </div>
                    <RepositoryDetail repository={repository} />
                </TabsContent>
                <TabsContent value="add-to-plan" className="space-y-4">
                    <AddToTrackingPlan repoId={repository.id} />
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

function AddToTrackingPlan({ repoId }: { repoId: string }) {
    const [plans, setPlans] = React.useState<Array<{ id: string; name: string; version: string | null }>>([])
    const [selectedPlanId, setSelectedPlanId] = React.useState<string | 'new'>('new')
    const [newPlanName, setNewPlanName] = React.useState("")
    const [events, setEvents] = React.useState<Array<{ id: string; event_name: string }>>([])
    const [selectedEventIds, setSelectedEventIds] = React.useState<string[]>([])

    React.useEffect(() => {
        const load = async () => {
            const [plansRes, eventsRes] = await Promise.all([
                fetch('/api/tracking-plans').then(r => r.json()),
                fetch(`/api/repositories/${repoId}/events`).then(r => r.json()),
            ])
            setPlans(plansRes.trackingPlans || [])
            setEvents((eventsRes.events || []).map((e: { id: string; event_name: string }) => ({ id: e.id, event_name: e.event_name })))
        }
        load()
    }, [repoId])

    const toggleEvent = (id: string) => {
        setSelectedEventIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const handleSave = async () => {
        let planId = selectedPlanId
        if (planId === 'new') {
            const res = await fetch('/api/tracking-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newPlanName }) })
            const data = await res.json()
            planId = data?.plan?.id
        }
        await fetch(`/api/tracking-plans/${planId}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEventIds: selectedEventIds }) })
        toast.success('Added to tracking plan')
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <select className="border rounded px-2 py-1" value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value as unknown as 'new' | string)} id="add-to-plan-tab">
                    <option value="new">Create new plan…</option>
                    {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (v{p.version || '1.0.0'})</option>
                    ))}
                </select>
                {selectedPlanId === 'new' && (
                    <input className="border rounded px-2 py-1" placeholder="New plan name" value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} />
                )}
            </div>
            <div className="rounded border">
                <div className="p-3 text-sm font-medium">Select events to add</div>
                <div className="max-h-72 overflow-auto divide-y">
                    {events.map(e => (
                        <label key={e.id} className="flex items-center gap-2 p-2">
                            <input type="checkbox" checked={selectedEventIds.includes(e.id)} onChange={() => toggleEvent(e.id)} />
                            <span className="text-sm">{e.event_name}</span>
                        </label>
                    ))}
                    {events.length === 0 && <div className="p-3 text-sm text-muted-foreground">No events available from this repo.</div>}
                </div>
            </div>
            <div className="flex justify-end">
                <Button size="sm" onClick={handleSave}>Add Selected</Button>
            </div>
        </div>
    )
}