import { getCoderState } from "@/app/api/ai/coder/user/action";
import { getUserEvents } from "@/app/api/tracking-plans/[id]/events/action";
import { getProfile } from "@/app/api/user/profile/action";
import { AatxCoderActionButton } from "@/components/aatx-coder/aatx-coder-action-button";
import { AatxCoderEventTable } from "@/components/aatx-coder/aatx-coder-event-table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/utils/supabase/server";
import { Code2 } from "lucide-react";
import { notFound } from "next/navigation";
import { getTrackingPlanRepositories } from "./actions";
import AatxCoderActivity from "@/components/aatx-coder/aatx-coder-activity";


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

    // Get connected repositories
    let repositories: any[] = [];
    try {
        repositories = await getTrackingPlanRepositories(trackingPlan.id);
    } catch (error) {
        console.error('Failed to fetch repositories:', error);
    }

    const eventsToImplement = summary.new.length + summary.updated.length;
    const repositoryName = repositories[0]?.name || "Repository";
    const { state, result } = await getCoderState(trackingPlan.id) ?? { state: 'idle', result: null }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Breadcrumb Navigation */}
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/tracking-plans">Tracking Plans</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href={`/tracking-plans/${id}`}>{trackingPlan.name || `Plan ${id}`}</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Coder</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <AatxCoderActivity trackingPlan={trackingPlan} events={summary.new} />

            {/* Event Summary Cards */}
            <p className="text-muted-foreground">Events</p>

            <Tabs className="my-2" defaultValue="new">
                <TabsList className="w-full max-w-sm">
                    <TabsTrigger value="new">New</TabsTrigger>
                    <TabsTrigger value="updated">Updated</TabsTrigger>
                    <TabsTrigger value="existing">Existing</TabsTrigger>
                </TabsList>
                <TabsContent value="new">
                    <AatxCoderEventTable events={summary.new.map(event => ({
                        ...event,
                        entryStatus: 'new',
                        repoName: repositories[0]?.name || "Repository"
                    }))} type="new" />
                </TabsContent>
                <TabsContent value="updated">
                    <AatxCoderEventTable events={summary.updated.map(event => ({
                        ...event,
                        entryStatus: 'updated',
                        repoName: repositories[0]?.name || "Repository"
                    }))} type="updated" />
                </TabsContent>
                <TabsContent value="existing">
                    <AatxCoderEventTable events={summary.existing.map(event => ({
                        ...event,
                        entryStatus: 'existing',
                        repoName: repositories[0]?.name || "Repository"
                    }))} type="existing" />
                </TabsContent>
            </Tabs>

        </div>
    );
}