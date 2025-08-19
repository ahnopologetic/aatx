"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Search, Edit, Trash2, Upload, Plus, X, Settings, Badge } from "lucide-react"
import { Database } from "@/lib/database.types"
import { toast } from "sonner"
import { Badge as BadgeComponent } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type EventProperty = {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
}

type PlanEvent = {
  id: string;
  event_name: string;
  description?: string | null;
  repo?: { id: string; name: string } | null;
  file_path?: string | null;
  line_number?: number | null;
  properties?: EventProperty[] | null;
  status?: 'detected' | 'new' | 'updated' | 'validated' | 'deprecated' | null;
}

type TrackingPlanDetailProps = {
  trackingPlan: Database["public"]["Tables"]["plans"]["Row"]
}

export function TrackingPlanDetail({ trackingPlan }: TrackingPlanDetailProps) {
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<'view' | 'edit'>("view")
  const [events, setEvents] = useState<PlanEvent[]>([])
  const [manualNewEvent, setManualNewEvent] = useState({ name: "", description: "", repoId: "" })
  const [importRepoId, setImportRepoId] = useState<string>("")
  const [repos, setRepos] = useState<Array<{ id: string; name: string }>>([])
  const [addFromRepoOpen, setAddFromRepoOpen] = useState(false)
  const [repoQuery, setRepoQuery] = useState("")
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([])
  const [editingEvent, setEditingEvent] = useState<PlanEvent | null>(null)
  const [editingProperties, setEditingProperties] = useState<EventProperty[]>([])
  const [propertiesDialogOpen, setPropertiesDialogOpen] = useState(false)
  const [manualEventDialogOpen, setManualEventDialogOpen] = useState(false)
  const [manualEventProperties, setManualEventProperties] = useState<EventProperty[]>([])

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

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'detected': return 'secondary'
      case 'new': return 'default'
      case 'updated': return 'outline'
      case 'validated': return 'success'
      case 'deprecated': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status?: string | null) => {
    return status || 'detected'
  }

  const openPropertiesEditor = (event: PlanEvent) => {
    setEditingEvent(event)
    // Ensure properties is always an array and handle various data types
    let properties: EventProperty[] = []
    if (Array.isArray(event.properties)) {
      properties = event.properties
    } else if (event.properties && typeof event.properties === 'object') {
      // If properties is an object, try to convert it to array format
      properties = Object.entries(event.properties).map(([key, value]) => ({
        key,
        type: typeof value as EventProperty['type'],
        required: false,
        description: ''
      }))
    }
    setEditingProperties(properties)
    setPropertiesDialogOpen(true)
  }

  const addProperty = () => {
    setEditingProperties(prev => [...prev, { key: '', type: 'string', required: false, description: '' }])
  }

  const updateProperty = (index: number, property: Partial<EventProperty>) => {
    setEditingProperties(prev => prev.map((p, i) => i === index ? { ...p, ...property } : p))
  }

  const removeProperty = (index: number) => {
    setEditingProperties(prev => prev.filter((_, i) => i !== index))
  }

  const saveEventProperties = async () => {
    if (!editingEvent) return

    try {
      const response = await fetch(`/api/tracking-plans/${trackingPlan.id}/events`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: editingEvent.id,
          updates: {
            properties: editingProperties,
            status: 'updated'
          }
        })
      })

      if (response.ok) {
        // Refresh events
        const eventsRes: { events: PlanEvent[] } = await fetch(`/api/tracking-plans/${trackingPlan.id}/events`).then(r => r.json())
        setEvents(eventsRes.events || [])
        setPropertiesDialogOpen(false)
        setEditingEvent(null)
        setEditingProperties([])
        toast.success('Properties updated successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update properties')
      }
    } catch (error) {
      toast.error('Failed to update properties')
    }
  }

  const updateEventStatus = async (eventId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tracking-plans/${trackingPlan.id}/events`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          updates: { status: newStatus }
        })
      })

      if (response.ok) {
        // Update local state
        setEvents(prev => prev.map(event =>
          event.id === eventId ? { ...event, status: newStatus as any } : event
        ))
        toast.success('Status updated')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update status')
      }
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const addManualEventProperty = () => {
    setManualEventProperties(prev => [...prev, { key: '', type: 'string', required: false, description: '' }])
  }

  const updateManualEventProperty = (index: number, property: Partial<EventProperty>) => {
    setManualEventProperties(prev => prev.map((p, i) => i === index ? { ...p, ...property } : p))
  }

  const removeManualEventProperty = (index: number) => {
    setManualEventProperties(prev => prev.filter((_, i) => i !== index))
  }

  const createManualEvent = async () => {
    if (!manualNewEvent.name.trim()) {
      toast.error('Event name is required')
      return
    }
    
    try {
      // Create the user event using the new API
      const createEventRes = await fetch('/api/user-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: manualNewEvent.name,
          description: manualNewEvent.description,
          repo_id: (manualNewEvent.repoId && manualNewEvent.repoId !== "none") ? manualNewEvent.repoId : null
        })
      })
      
      if (!createEventRes.ok) {
        const error = await createEventRes.json()
        throw new Error(error.error || 'Failed to create event')
      }
      
      const { event } = await createEventRes.json()
      
      // Update event with properties if any are defined
      if (manualEventProperties.length > 0) {
        await fetch(`/api/tracking-plans/${trackingPlan.id}/events`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: event.id,
            updates: {
              properties: manualEventProperties
            }
          })
        })
      }
      
      // Add the event to the current tracking plan
      const addToPlanRes = await fetch(`/api/tracking-plans/${trackingPlan.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEventIds: [event.id] })
      })
      
      if (!addToPlanRes.ok) {
        const error = await addToPlanRes.json()
        throw new Error(error.error || 'Failed to add event to plan')
      }
      
      // Refresh the events list
      const refreshed: { events: PlanEvent[] } = await fetch(`/api/tracking-plans/${trackingPlan.id}/events`).then(r => r.json())
      setEvents(refreshed.events || [])
      
      // Reset form
      setManualNewEvent({ name: '', description: '', repoId: '' })
      setManualEventProperties([])
      setManualEventDialogOpen(false)
      toast.success('Event created successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create event')
      console.error('Error creating manual event:', error)
    }
  }

  const deleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/tracking-plans/${trackingPlan.id}/events`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      })
      if (response.ok) {
        setEvents(prev => prev.filter(e => e.id !== eventId))
        toast.success('Event deleted')
      } else {
        toast.error('Failed to delete event')
      }
    } catch (error) {
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
          <Button variant="outline" onClick={() => setManualEventDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Manual Event
          </Button>
          <Button variant="outline" onClick={() => setAddFromRepoOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add from Repos
          </Button>
          {viewMode === 'view' ? (
            <Button onClick={() => setViewMode('edit')} variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
          ) : (
            <>
              <Button onClick={() => setViewMode('view')} variant="ghost">Cancel</Button>
              <div className="flex gap-2">
                <Button onClick={async () => {
                  const res = await fetch(`/api/tracking-plans/${trackingPlan.id}/version`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level: 'patch' }) })
                  const data: { version?: string; error?: string } = await res.json()
                  if (res.ok) {
                    const ev: { events: PlanEvent[] } = await fetch(`/api/tracking-plans/${trackingPlan.id}/events`).then(r => r.json())
                    setEvents(ev.events || [])
                    toast.success(`Saved new version: ${data.version}`)
                  } else {
                    toast.error(data.error || 'Failed to save version')
                  }
                }}>Save Patch</Button>
                <Button onClick={async () => {
                  const res = await fetch(`/api/tracking-plans/${trackingPlan.id}/version`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level: 'minor' }) })
                  const data: { version?: string; error?: string } = await res.json()
                  if (res.ok) {
                    const ev: { events: PlanEvent[] } = await fetch(`/api/tracking-plans/${trackingPlan.id}/events`).then(r => r.json())
                    setEvents(ev.events || [])
                    toast.success(`Saved new minor: ${data.version}`)
                  } else {
                    toast.error(data.error || 'Failed to save version')
                  }
                }} variant="secondary">Save Minor</Button>
                <Button onClick={async () => {
                  const res = await fetch(`/api/tracking-plans/${trackingPlan.id}/version`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level: 'major' }) })
                  const data: { version?: string; error?: string } = await res.json()
                  if (res.ok) {
                    const ev: { events: PlanEvent[] } = await fetch(`/api/tracking-plans/${trackingPlan.id}/events`).then(r => r.json())
                    setEvents(ev.events || [])
                    toast.success(`Saved new major: ${data.version}`)
                  } else {
                    toast.error(data.error || 'Failed to save version')
                  }
                }} variant="destructive">Save Major</Button>
              </div>
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
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Repository</TableHead>
              <TableHead className="hidden lg:table-cell">Properties</TableHead>
              <TableHead className="hidden md:table-cell">File Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
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
                  <TableCell>
                    <Select
                      value={getStatusLabel(event.status)}
                      onValueChange={(value) => updateEventStatus(event.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue>
                          <BadgeComponent variant={getStatusColor(event.status) as any}>
                            {getStatusLabel(event.status)}
                          </BadgeComponent>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="detected">Detected</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="updated">Updated</SelectItem>
                        <SelectItem value="validated">Validated</SelectItem>
                        <SelectItem value="deprecated">Deprecated</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{event.repo?.name ?? '-'}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {event.properties?.length || 0} properties
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openPropertiesEditor(event)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {event.file_path ? `${event.file_path}${event.line_number ? `:${event.line_number}` : ''}` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteEvent(event.id)}>
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
        <div className="grid gap-4 md:grid-cols-2">
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

      {addFromRepoOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-background w-full max-w-2xl rounded-md shadow-lg border">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-medium">Add events from repositories</div>
              <Button variant="ghost" size="icon" onClick={() => setAddFromRepoOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <Input placeholder="Search repositories..." value={repoQuery} onChange={(e) => setRepoQuery(e.target.value)} />
              <div className="max-h-64 overflow-auto border rounded">
                {repos.filter(r => r.name.toLowerCase().includes(repoQuery.toLowerCase())).map(r => (
                  <label key={r.id} className="flex items-center gap-3 p-2 border-b last:border-b-0">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedRepoIds.includes(r.id)}
                      onChange={(e) => {
                        setSelectedRepoIds(prev => e.target.checked ? [...prev, r.id] : prev.filter(id => id !== r.id))
                      }}
                    />
                    <span>{r.name}</span>
                  </label>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">Selected: {selectedRepoIds.length}</div>
            </div>
            <div className="p-4 border-t flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setAddFromRepoOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                if (selectedRepoIds.length === 0) return
                // Fetch all events in parallel
                const results = await Promise.all(
                  selectedRepoIds.map(repoId => fetch(`/api/repositories/${repoId}/events`).then(r => r.json()).catch(() => ({ events: [] as Array<{ id: string }> })))
                )
                const allIds = results.flatMap(res => (res.events || []).map((e: any) => e.id))
                if (allIds.length > 0) {
                  await fetch(`/api/tracking-plans/${trackingPlan.id}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEventIds: allIds }) })
                }
                const refreshed: { events: PlanEvent[] } = await fetch(`/api/tracking-plans/${trackingPlan.id}/events`).then(r => r.json())
                setEvents(refreshed.events || [])
                setSelectedRepoIds([])
                setRepoQuery("")
                setAddFromRepoOpen(false)
                toast.success('Added events from selected repositories')
              }}>Add Selected</Button>
            </div>
          </div>
        </div>
      )}

      {/* Properties Editor Dialog */}
      <Dialog open={propertiesDialogOpen} onOpenChange={setPropertiesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Properties - {editingEvent?.event_name}</DialogTitle>
            <DialogDescription>
              Manage properties for this event. Properties define the data structure that should be sent with the event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Properties ({editingProperties.length})</h4>
              <Button onClick={addProperty} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Property
              </Button>
            </div>

            {editingProperties.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No properties defined. Click "Add Property" to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {editingProperties.map((property, index) => (
                  <div key={index} className="flex items-end gap-3 p-3 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`key-${index}`} className="text-xs">Property Key</Label>
                          <Input
                            id={`key-${index}`}
                            placeholder="e.g., user_id"
                            value={property.key}
                            onChange={(e) => updateProperty(index, { key: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`type-${index}`} className="text-xs">Type</Label>
                          <Select
                            value={property.type}
                            onValueChange={(value) => updateProperty(index, { type: value as EventProperty['type'] })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="string">String</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="boolean">Boolean</SelectItem>
                              <SelectItem value="object">Object</SelectItem>
                              <SelectItem value="array">Array</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Required</Label>
                          <div className="flex items-center space-x-2 h-10">
                            <Checkbox
                              checked={property.required}
                              onCheckedChange={(checked) => updateProperty(index, { required: !!checked })}
                            />
                            <span className="text-sm">Required field</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`description-${index}`} className="text-xs">Description (optional)</Label>
                        <Input
                          id={`description-${index}`}
                          placeholder="Describe what this property represents..."
                          value={property.description || ''}
                          onChange={(e) => updateProperty(index, { description: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProperty(index)}
                      className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setPropertiesDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveEventProperties}>
                Save Properties
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Event Creation Dialog */}
      <Dialog open={manualEventDialogOpen} onOpenChange={setManualEventDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Manual Event</DialogTitle>
            <DialogDescription>
              Create a new event manually and define its properties. This event will be marked as "new" and can be assigned to a repository.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Event Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-event-name">Event Name*</Label>
                <Input
                  id="manual-event-name"
                  placeholder="e.g., user_clicked_signup"
                  value={manualNewEvent.name}
                  onChange={(e) => setManualNewEvent(v => ({ ...v, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manual-event-description">Description</Label>
                <Textarea
                  id="manual-event-description"
                  placeholder="Describe what this event tracks..."
                  value={manualNewEvent.description}
                  onChange={(e) => setManualNewEvent(v => ({ ...v, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-event-repo">Repository (optional)</Label>
                <Select 
                  value={manualNewEvent.repoId || "none"} 
                  onValueChange={(value) => setManualNewEvent(v => ({ ...v, repoId: value === "none" ? "" : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select repository..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No repository</SelectItem>
                    {repos.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Properties Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Event Properties ({manualEventProperties.length})</h4>
                <Button onClick={addManualEventProperty} size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add Property
                </Button>
              </div>

              {manualEventProperties.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                  No properties defined. Click "Add Property" to add event properties.
                </div>
              ) : (
                <div className="space-y-3">
                  {manualEventProperties.map((property, index) => (
                    <div key={index} className="flex items-end gap-3 p-3 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor={`manual-key-${index}`} className="text-xs">Property Key</Label>
                            <Input
                              id={`manual-key-${index}`}
                              placeholder="e.g., user_id"
                              value={property.key}
                              onChange={(e) => updateManualEventProperty(index, { key: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`manual-type-${index}`} className="text-xs">Type</Label>
                            <Select 
                              value={property.type} 
                              onValueChange={(value) => updateManualEventProperty(index, { type: value as EventProperty['type'] })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="object">Object</SelectItem>
                                <SelectItem value="array">Array</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Required</Label>
                            <div className="flex items-center space-x-2 h-10">
                              <Checkbox
                                checked={property.required}
                                onCheckedChange={(checked) => updateManualEventProperty(index, { required: !!checked })}
                              />
                              <span className="text-sm">Required field</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`manual-description-${index}`} className="text-xs">Description (optional)</Label>
                          <Input
                            id={`manual-description-${index}`}
                            placeholder="Describe what this property represents..."
                            value={property.description || ''}
                            onChange={(e) => updateManualEventProperty(index, { description: e.target.value })}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeManualEventProperty(index)}
                        className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setManualEventDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createManualEvent}>
                Create Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
