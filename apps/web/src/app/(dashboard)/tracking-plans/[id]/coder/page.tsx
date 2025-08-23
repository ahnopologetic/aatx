import { getUserEvents } from "@/app/api/tracking-plans/[id]/events/action";
import { getProfile } from "@/app/api/user/profile/action";
import { AatxCoderActionButton } from "@/components/aatx-coder/aatx-coder-action-button";
import { AatxCoderPlanCard } from "@/components/aatx-coder/aatx-coder-plan-card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { createClient } from "@/utils/supabase/server";
import { Badge, Code2 } from "lucide-react";
import { notFound } from "next/navigation";
import { getTrackingPlanRepositories } from "./actions";
import { getCoderState } from "@/app/api/ai/coder/user/action";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AatxCoderEventTable } from "@/components/aatx-coder/aatx-coder-event-table";

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

            {/* Header Section */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                        <Code2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">AATX Coder</h1>
                        <p className="text-muted-foreground">Implement analytics tracking events in your codebase</p>
                    </div>
                </div>
                <div className="flex items-center justify-end">
                    <AatxCoderActionButton state={state} result={result} />
                </div>
            </div>

            {/* tracking plan card */}
            <AatxCoderPlanCard trackingPlan={trackingPlan} />

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


            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-green-200 bg-green-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New Events</CardTitle>
                        <Plus className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{summary.new.length}</div>
                        <p className="text-xs text-green-600 mt-1">
                            Ready to be added to your tracking plan
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Updated Events</CardTitle>
                        <Edit className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-700">{summary.updated.length}</div>
                        <p className="text-xs text-orange-600 mt-1">
                            Existing events with changes detected
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Existing Events</CardTitle>
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">{summary.existing.length}</div>
                        <p className="text-xs text-blue-600 mt-1">
                            Already tracked and up to date
                        </p>
                    </CardContent>
                </Card>
            </div> */}

            {/* AATX Coder Section */}
            {/* <AatxCoderClientWrapper
                trackingPlanId={trackingPlan.id}
                eventsToImplement={eventsToImplement}
                repositoryName={repositoryName}
                hasRepositories={repositories.length > 0}
            /> */}

            {/* Events List Section */}
            {/* <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            <CardTitle>Events to Review</CardTitle>
                        </div>
                        <Badge variant="secondary" className="text-sm">
                            {summary.new.length + summary.updated.length} events
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {summary.new.length + summary.updated.length > 0 ? (
                        <EventCollapsibleList events={summary.new.concat(summary.updated)} />
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">No events to review</p>
                            <p className="text-sm">All events are up to date with your tracking plan.</p>
                        </div>
                    )}
                </CardContent>
            </Card> */}

        </div>
    );
}