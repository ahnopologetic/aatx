"use client"
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Activity, Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EventCollapsibleList({ events }: { events: any[] }) {
    const [isOpen, setIsOpen] = useState(true);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "new":
                return <Plus className="h-3 w-3 text-green-600" />;
            case "updated":
                return <Edit className="h-3 w-3 text-orange-600" />;
            default:
                return <Activity className="h-3 w-3 text-blue-600" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "new":
                return <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">New</Badge>;
            case "updated":
                return <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">Updated</Badge>;
            default:
                return <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Existing</Badge>;
        }
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
                <Button 
                    variant="ghost" 
                    className="w-full justify-between p-0 h-auto font-normal hover:bg-transparent"
                >
                    <div className="flex items-center gap-2">
                        {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">
                            {isOpen ? "Hide" : "Show"} Events to Add by AATX Coder
                        </span>
                        <Badge variant="secondary">{events.length}</Badge>
                    </div>
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
                {events.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No events to add.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {events.map((event) => (
                            <Card key={event.id} className="border-l-4 border-l-primary/20">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className="mt-1">
                                                {getStatusIcon(event.status)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-sm truncate">
                                                        {event.event_name}
                                                    </h3>
                                                    {getStatusBadge(event.status)}
                                                </div>
                                                {event.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {event.description}
                                                    </p>
                                                )}
                                                {event.properties && Object.keys(event.properties).length > 0 && (
                                                    <div className="mt-2">
                                                        <p className="text-xs text-muted-foreground mb-1">Properties:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {Object.keys(event.properties).slice(0, 5).map((prop) => (
                                                                <Badge key={prop} variant="outline" className="text-xs">
                                                                    {prop}
                                                                </Badge>
                                                            ))}
                                                            {Object.keys(event.properties).length > 5 && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    +{Object.keys(event.properties).length - 5} more
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}
