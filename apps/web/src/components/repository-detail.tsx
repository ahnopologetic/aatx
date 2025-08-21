"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Edit, ExternalLink, MoreHorizontal, Search, Trash2 } from "lucide-react"
import { Database } from "@/lib/database.types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

type RepoEvent = { id: string; event_name: string; description?: string | null; type: 'detected' | 'manual'; file_path?: string | null; line_number?: number | null };
type RepositoryDetailProps = {
  repository: Database["public"]["Tables"]["repos"]["Row"]
}

export function RepositoryDetail({ repository }: RepositoryDetailProps) {
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [events, setEvents] = useState<RepoEvent[]>([])
  const [plans, setPlans] = useState<Array<{ id: string; name: string; version: string | null }>>([])
  const [isPlansOpen, setIsPlansOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: string; name: string; description: string } | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 10

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`/api/repositories/${repository.id}/events`)
        const data = await response.json()
        setEvents(data.events ?? [])
      } catch (e) {
        console.error(e)
      }
    }
    fetchEvents()
  }, [repository.id])

  const refreshPlans = async () => {
    try {
      const res = await fetch('/api/tracking-plans')
      const data = await res.json()
      setPlans(data.trackingPlans || [])
    } catch (e) {
      console.error(e)
    }
  }

  const filteredEvents = events.filter(
    (event) =>
      event.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Reset or clamp page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize))
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const pageStartIndex = (currentPage - 1) * pageSize
  const pageEndIndex = pageStartIndex + pageSize
  const paginatedEvents = filteredEvents.slice(pageStartIndex, pageEndIndex)

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

  const githubBlobBaseUrl = useMemo(() => {
    try {
      const url = new URL(repository.url || "")
      // enforce github host and construct base; default to main branch
      if (url.hostname.includes("github.com")) {
        const path = url.pathname.replace(/\/$/, "")
        return `https://github.com${path}/blob/main`
      }
    } catch { }
    return null
  }, [repository.url])

  const openGithubForEvent = (event: RepoEvent) => {
    if (!githubBlobBaseUrl || !event.file_path) {
      window.open(repository.url || '#', '_blank')
      return
    }
    const line = event.line_number ? `#L${event.line_number}` : ''
    window.open(`${githubBlobBaseUrl}/${event.file_path}${line}`.replace(/\/+/, '/'), '_blank')
  }

  const handleDeleteEvent = async (eventId: string) => {
    const res = await fetch(`/api/repositories/${repository.id}/events`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    })
    if (res.ok) {
      setEvents(prev => prev.filter(e => e.id !== eventId))
      setSelectedEvents(prev => prev.filter(id => id !== eventId))
      toast.success('Event deleted')
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Failed to delete event')
    }
  }

  const handleBulkAddToPlan = async (planId: string) => {
    if (selectedEvents.length === 0) {
      toast.error('Select at least one event')
      return
    }
    const res = await fetch(`/api/tracking-plans/${planId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEventIds: selectedEvents }),
    })
    if (res.ok) {
      toast.success('Added to tracking plan')
      setIsPlansOpen(false)
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Failed to add to plan')
    }
  }

  const handleSaveEdit = async () => {

  const handleAskAATXCoderClick = () => {
    posthog.capture('ask_aatx_coder_button: clicked', {
      description: 'When user clicked ask aatx coder',
    });
    // Add any other logic for the button click here
  };


    if (!editing) return
    const res = await fetch(`/api/repositories/${repository.id}/events`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: editing.id, event_name: editing.name, description: editing.description }),
    })
    if (res.ok) {
      setEvents(prev => prev.map(e => e.id === editing.id ? { ...e, event_name: editing.name, description: editing.description } : e))
      toast.success('Event updated')
      setEditing(null)
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Failed to update event')
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
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="tracked">Tracked Events</SelectItem>
              <SelectItem value="untracked">Untracked Events</SelectItem>
            </SelectContent>
          </Select>
          <Popover open={isPlansOpen} onOpenChange={(o) => { setIsPlansOpen(o); if (o) void refreshPlans() }}>
            <PopoverTrigger asChild>
              <Button variant="default" size="sm">Add to Tracking Plan</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <div className="text-sm font-medium">Select a tracking plan</div>
                <div className="max-h-60 overflow-auto border rounded">
                  {plans.length === 0 && (
                    <div className="text-sm text-muted-foreground p-3">No plans found.</div>
                  )}
                  {plans.map((p) => (
                    <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-accent text-sm" onClick={() => handleBulkAddToPlan(p.id)}>
                      {p.name}{p.version ? ` (v${p.version})` : ''}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">Adds {selectedEvents.length} selected event(s).</div>
              </div>
            </PopoverContent>
          </Popover>
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
              <TableHead className="hidden sm:table-cell">Type</TableHead>
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
              paginatedEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedEvents.includes(event.id)}
                      onCheckedChange={() => toggleEventSelection(event.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{event.event_name}</TableCell>
                  <TableCell className="hidden md:table-cell">{event.description}</TableCell>
                  <TableCell className="hidden sm:table-cell capitalize">{event.type}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openGithubForEvent(event)}>
                          <ExternalLink className="h-4 w-4" />
                          View in GitHub
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditing({ id: event.id, name: event.event_name, description: event.description || '' })}>
                          <Edit className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => handleDeleteEvent(event.id)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filteredEvents.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            Showing {Math.min(filteredEvents.length, pageStartIndex + 1)}-
            {Math.min(filteredEvents.length, pageEndIndex)} of {filteredEvents.length}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.max(1, p - 1)) }}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    href="#"
                    isActive={pageNumber === currentPage}
                    onClick={(e) => { e.preventDefault(); setCurrentPage(pageNumber) }}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.min(totalPages, p + 1)) }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Update the event name and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={editing?.name || ''}
              onChange={(e) => setEditing(prev => prev ? { ...prev, name: e.target.value } : prev)}
            />
            <Textarea
              value={editing?.description || ''}
              onChange={(e) => setEditing(prev => prev ? { ...prev, description: e.target.value } : prev)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
