import { getUserEvents } from "@/app/api/tracking-plans/[id]/events/action";
import { getProfile } from "@/app/api/user/profile/action";
import { EventCollapsibleList } from "@/components/blocks/event-collapsible-list";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { useState } from "react";

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient()
    const profile = await getProfile()
    const { data: trackingPlan, error } = await supabase.from('plans').select('*').eq('id', id).eq('org_id', profile?.current_org_id ?? '').single()

    if (error || !trackingPlan) {
        notFound()
    }


    function groupEventsByStatus(events: any[]) {
        const summary = {
            new: [] as any[],
            updated: [] as any[],
            existing: [] as any[],
        };
        for (const event of events) {
            if (event.status === "new") summary.new.push(event);
            else if (event.status === "updated") summary.updated.push(event);
            else summary.existing.push(event);
        }
        return summary;
    }

    const events = await getUserEvents(trackingPlan.id);
    const summary = groupEventsByStatus(events);

    return (
        // TODO: add breadcrumbs
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Coder {id}</h1>
            <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Event Summary</h2>
                <ul className="list-disc ml-6 text-gray-700">
                    <li>
                        <span className="font-medium">New events:</span> {summary.new.length}
                    </li>
                    <li>
                        <span className="font-medium">Updated events:</span> {summary.updated.length}
                    </li>
                    <li>
                        <span className="font-medium">Existing events:</span> {summary.existing.length}
                    </li>
                </ul>
            </div>
            <EventCollapsibleList events={summary.new.concat(summary.updated)} />
        </div>
    );
}