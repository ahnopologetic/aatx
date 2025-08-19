"use client"
import { useState } from "react";

export function EventCollapsibleList({ events }: { events: any[] }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border rounded-md my-4">
            <button
                className="w-full flex justify-between items-center px-4 py-2 bg-gray-100 hover:bg-gray-200"
                onClick={() => setOpen((prev) => !prev)}
            >
                <span className="font-medium">
                    {open ? "Hide" : "Show"} Events to Add by AATX Coder ({events.length})
                </span>
                <span>{open ? "▲" : "▼"}</span>
            </button>
            {open && (
                <ul className="px-4 py-2">
                    {events.length === 0 ? (
                        <li className="text-gray-500">No events to add.</li>
                    ) : (
                        events.map((event) => (
                            <li key={event.id} className="py-1 border-b last:border-b-0">
                                <span className="font-semibold">{event.event_name}</span>
                                {event.description && (
                                    <span className="ml-2 text-gray-500 text-sm">
                                        {event.description}
                                    </span>
                                )}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
