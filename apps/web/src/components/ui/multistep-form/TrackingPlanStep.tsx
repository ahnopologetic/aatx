"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Eye, Trash2 } from "lucide-react";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StepProps, fadeInUp, TrackingEvent } from "./types";

type RepoOption = { id: string; name?: string; url: string };
type TrackingPlanStepProps = Pick<StepProps, 'trackingEvents' | 'onAddEvent' | 'onDeleteEvent'> & {
  repositories?: RepoOption[];
}

export const TrackingPlanStep = ({
  trackingEvents,
  onAddEvent,
  onDeleteEvent,
  repositories,
}: TrackingPlanStepProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<TrackingEvent>>({
    name: "",
    description: "",
    properties: {},
  });
  const [newEventRepoId, setNewEventRepoId] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const repoIdToDisplayName = useMemo(() => {
    const mapping: Record<string, string> = {};
    (repositories || []).forEach(r => {
      mapping[r.id] = r.name || r.url;
    });
    return mapping;
  }, [repositories]);

  // Pagination calculations
  const totalItems = trackingEvents.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedEvents = trackingEvents.slice(startIndex, endIndex);

  // Reset to page 1 when rowsPerPage changes
  const handleRowsPerPageChange = (newRowsPerPage: string) => {
    setRowsPerPage(parseInt(newRowsPerPage));
    setCurrentPage(1);
  };

  // Handle page navigation
  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleAddEvent = () => {
    if (!newEvent.name?.trim()) {
      toast.error("Event name is required");
      return;
    }
    if (repositories && repositories.length > 0) {
      const repo = repositories.find(r => r.id === (newEventRepoId || repositories[0]?.id));
      if (!repo) {
        toast.error("Please select a repository for this event");
        return;
      }
      newEvent.sourceRepoId = repo.id;
      newEvent.sourceRepoUrl = repo.url;
      newEvent.sourceRepoName = repo.name;
    }

    const event: TrackingEvent = {
      id: `new-event-${Date.now()}`,
      name: newEvent.name,
      description: newEvent.description || "",
      properties: newEvent.properties || {},
      isNew: true,
      sourceRepoId: newEvent.sourceRepoId,
      sourceRepoUrl: newEvent.sourceRepoUrl,
      sourceRepoName: newEvent.sourceRepoName,
    };

    onAddEvent?.(event);
    setNewEvent({ name: "", description: "", properties: {} });
    setNewEventRepoId(undefined);
    setIsDialogOpen(false);
    toast.success("New event added successfully!");
  };

  const handleDeleteEvent = (eventId: string) => {
    onDeleteEvent?.(eventId);
    toast.success("Event deleted successfully!");
  };

  const handleViewEvent = (event: TrackingEvent) => {
    console.log("View event:", event);
    toast.info("Event details logged to console");
  };

  return (
    <>
      <CardHeader>
        <CardTitle>Tracking Plan</CardTitle>
        <CardDescription>
          Review and manage detected events from your repositories scan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 my-4">
        <motion.div variants={fadeInUp} className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Detected Events ({totalItems})</h4>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Event</DialogTitle>
                  <DialogDescription>
                    Create a new tracking event for your analytics plan.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-name">Event Name</Label>
                    <Input
                      id="event-name"
                      placeholder="e.g., button_clicked"
                      value={newEvent.name || ""}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  {repositories && repositories.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="event-repo">Repository</Label>
                      <Select value={newEventRepoId ?? repositories[0]?.id} onValueChange={setNewEventRepoId}>
                        <SelectTrigger id="event-repo">
                          <SelectValue placeholder="Select a repository" />
                        </SelectTrigger>
                        <SelectContent>
                          {repositories.map((r) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.name || r.url}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="event-description">Description</Label>
                    <Textarea
                      id="event-description"
                      placeholder="Describe what this event tracks..."
                      value={newEvent.description || ""}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddEvent}>
                    Add Event
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Event Name</TableHead>
                  {repositories && (
                    <TableHead className="font-semibold">Repository</TableHead>
                  )}
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Implementation</TableHead>
                  <TableHead className="w-[100px] font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEvents.map((event, index) => (
                  <motion.tr
                    key={event.id}
                    className="hover:bg-muted/30 transition-colors border-b"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {event.isNew && (
                          <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-2 py-1 rounded-full font-medium">
                            New
                          </span>
                        )}
                        <span className="text-foreground">{event.name}</span>
                      </div>
                    </TableCell>
                    {repositories && (
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {event.sourceRepoId ? (repoIdToDisplayName[event.sourceRepoId] || event.sourceRepoName || event.sourceRepoUrl) : "-"}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {event.description || "No description"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-xs px-2 py-1 rounded font-medium",
                        event.isNew
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                      )}>
                        {event.isNew ? "Manual" : "Detected"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {event.implementation && event.implementation.length > 0 ? (
                        <div className="space-y-1">
                          {event.implementation.slice(0, 2).map((impl, idx) => (
                            <div key={idx} className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                              {impl.path}:{impl.line}
                              {impl.function && (
                                <span className="text-primary"> in {impl.function}()</span>
                              )}
                            </div>
                          ))}
                          {event.implementation.length > 2 && (
                            <div className="text-xs text-muted-foreground font-medium">
                              +{event.implementation.length - 2} more locations
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No implementation found</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewEvent(event)}
                          className="h-8 w-8 p-0"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete event"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
                {trackingEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={repositories ? 6 : 5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="p-3 bg-muted/50 rounded-full">
                          <Plus className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium">No events found</p>
                          <p className="text-sm">Click &quot;Add New Event&quot; to create your first tracking event.</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalItems > 0 && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="rows-per-page" className="text-sm text-muted-foreground">
                  Rows per page:
                </Label>
                <Select value={rowsPerPage.toString()} onValueChange={handleRowsPerPageChange}>
                  <SelectTrigger id="rows-per-page" className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground">
                  {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
                </div>
              </div>

              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(currentPage - 1)}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>

                    {/* Page numbers */}
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            onClick={() => handlePageChange(pageNumber)}
                            isActive={currentPage === pageNumber}
                            className="cursor-pointer"
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => handlePageChange(totalPages)}
                            className="cursor-pointer"
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(currentPage + 1)}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Review the detected events and add any missing tracking events to complete your tracking plan.
          </p>
        </motion.div>
      </CardContent>
    </>
  );
};