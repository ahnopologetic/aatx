"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Eye, Trash2 } from "lucide-react";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StepProps, fadeInUp, TrackingEvent } from "./types";

interface TrackingPlanStepProps extends Pick<StepProps, 'trackingEvents' | 'onAddEvent' | 'onDeleteEvent'> {}

export const TrackingPlanStep = ({
  trackingEvents,
  onAddEvent,
  onDeleteEvent,
}: TrackingPlanStepProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<TrackingEvent>>({
    name: "",
    description: "",
    properties: {},
  });

  const handleAddEvent = () => {
    if (!newEvent.name?.trim()) {
      toast.error("Event name is required");
      return;
    }

    const event: TrackingEvent = {
      id: `new-event-${Date.now()}`,
      name: newEvent.name,
      description: newEvent.description || "",
      properties: newEvent.properties || {},
      isNew: true,
    };

    onAddEvent?.(event);
    setNewEvent({ name: "", description: "", properties: {} });
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
          Review and manage detected events from your repository scan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 my-4">
        <motion.div variants={fadeInUp} className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Detected Events ({trackingEvents.length})</h4>
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
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Implementation</TableHead>
                  <TableHead className="w-[100px] font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trackingEvents.map((event, index) => (
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
                    <TableCell colSpan={5} className="text-center py-12">
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

          <p className="text-sm text-muted-foreground">
            Review the detected events and add any missing tracking events to complete your tracking plan.
          </p>
        </motion.div>
      </CardContent>
    </>
  );
};