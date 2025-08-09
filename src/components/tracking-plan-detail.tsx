"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Edit, Trash2, Upload } from "lucide-react"
import { Database } from "@/lib/database.types"
import { toast } from "sonner"

type PlanEvent = { id: string; event_name: string; description?: string | null; repo?: { id: string; name: string } | null }

type TrackingPlanDetailProps = {
  trackingPlan: Database["public"]["Tables"]["plans"]["Row"]
}

export function TrackingPlanDetail({ trackingPlan }: TrackingPlanDetailProps) {
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<'view' | 'edit'>("view")
  const [events, setEvents] = useState<PlanEvent[]>([])
  const [manualNewEvent, setManualNewEvent] = useState({ name: "", description: "" })
  const [importRepoId, setImportRepoId] = useState<string>("")
  const [repos, setRepos] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    const fetchAll = async () => {
      const [eventsRes, reposRes]: [{ events: PlanEvent[] }, { repositories: Array<{ id: string; name: string }> }] = await Promise.all([
        fetch(`/api/tracking-plans/${trackingPlan.id}/events`).then(r => r.json()),
        fetch('/api/repositories').then(r => r.json()).catch(() => ({ repositories: [] as Array<{ id: string; name: string }> })),
      ])
      setEvents(eventsRes.events || [])
      setRepos((reposRes.repositories || []).map((r) => ({ id: r.id, name: r.name })))
    }
    fetchAll()
  }, [trackingPlan.id])

  const filteredEvents = useMemo(() => events.filter(
    (event) =>
      event.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
  ), [events, searchQuery])

  const toggleEventSelection = (eventId: string) => {
    setSelectedEvents((prev) => (prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]))
  }

  const toggleAllEvents = () => {
    if (selectedEvents.length === filteredEvents.length) {
      setSelectedEvents([])
    } else {
      setSelectedEvents(filteredEvents.map((event) => event.id))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 md:w-[300px]"
          />
        </div>
        <div className="flex items-center gap-2">
          {viewMode === 'view' ? (
            <Button onClick={() => setViewMode('edit')} variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
          ) : (
            <>
              <Button onClick={() => setViewMode('view')} variant="ghost">Cancel</Button>
              <Button onClick={async () => {
                const res = await fetch(`/api/tracking-plans/${trackingPlan.id}/version`, { method: 'POST' })
                const data: { version?: string; error?: string } = await res.json()
                if (res.ok) {
                  const ev: { events: PlanEvent[] } = await fetch(`/api/tracking-plans/${trackingPlan.id}/events`).then(r => r.json())
                  setEvents(ev.events || [])
                  toast.success(`Saved new version: ${data.version}`)
                } else {
                  toast.error(data.error || 'Failed to save version')
                }
              }}>Save New Version</Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedEvents.length === filteredEvents.length && filteredEvents.length > 0}
                  onCheckedChange={toggleAllEvents}
                />
              </TableHead>
              <TableHead>Event Name</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="hidden sm:table-cell">Repository</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No events found.
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedEvents.includes(event.id)}
                      onCheckedChange={() => toggleEventSelection(event.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{event.event_name}</TableCell>
                  <TableCell className="hidden md:table-cell">{event.description}</TableCell>
                  <TableCell className="hidden sm:table-cell">{event.repo?.name ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {viewMode === 'edit' && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-3 p-4 border rounded-md">
            <div className="font-medium">Add manually</div>
            <Input placeholder="event_name" value={manualNewEvent.name} onChange={(e) => setManualNewEvent(v => ({ ...v, name: e.target.value }))} />
            <Textarea placeholder="Description" value={manualNewEvent.description} onChange={(e) => setManualNewEvent(v => ({ ...v, description: e.target.value }))} />
            <Button onClick={async () => {
              if (!manualNewEvent.name.trim()) return
              const createRes = await fetch('/api/repositories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repositoryUrl: 'manual://event', analyticsProviders: [], events: [{ name: manualNewEvent.name, description: manualNewEvent.description, isNew: true }] }) })
              const repo: { repository: { id: string } } = await createRes.json()
              const evRes: { events: Array<{ id: string }> } = await fetch(`/api/repositories/${repo.repository.id}/events`).then(r => r.json())
              const last = evRes.events[evRes.events.length - 1]
              await fetch(`/api/tracking-plans/${trackingPlan.id}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEventIds: [last.id] }) })
              const refreshed: { events: PlanEvent[] } = await fetch(`/api/tracking-plans/${trackingPlan.id}/events`).then(r => r.json())
              setEvents(refreshed.events || [])
              setManualNewEvent({ name: '', description: '' })
              toast.success('Event added')
            }}>Add</Button>
          </div>
          <div className="space-y-3 p-4 border rounded-md">
            <div className="font-medium">Import CSV</div>
            <Button variant="outline" disabled>
              <Upload className="mr-2 h-4 w-4" /> Upload CSV (coming soon)
            </Button>
          </div>
          <div className="space-y-3 p-4 border rounded-md">
            <div className="font-medium">Import from repository</div>
            <select className="border rounded px-2 py-1 w-full" value={importRepoId} onChange={(e) => setImportRepoId(e.target.value)}>
              <option value="">Select repository…</option>
              {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {importRepoId && (
              <Button onClick={async () => {
                const ev: { events: Array<{ id: string }> } = await fetch(`/api/repositories/${importRepoId}/events`).then(r => r.json())
                const ids = (ev.events || []).map((e) => e.id)
                await fetch(`/api/tracking-plans/${trackingPlan.id}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEventIds: ids }) })
                const refreshed: { events: PlanEvent[] } = await fetch(`/api/tracking-plans/${trackingPlan.id}/events`).then(r => r.json())
                setEvents(refreshed.events || [])
                setImportRepoId("")
                toast.success('Imported events from repository')
              }}>Import All</Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
