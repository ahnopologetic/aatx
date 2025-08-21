import { NextResponse } from "next/server"
import { mastra } from "~mastra/index"
import {
    getCurrentUserOrganization,
    canOrganizationPerformAction,
    trackUsage
} from "@/lib/subscription-utils"
import { createClient } from "@/utils/supabase/server"
import { getProfile } from "@/app/api/user/profile/action"
import { getUserEvents } from "@/app/api/tracking-plans/[id]/events/action"

export async function POST(request: Request) {
    try {
        // Get current user's organization
        const organization = await getCurrentUserOrganization()
        if (!organization) {
            console.log("No organization found. Please select an organization.")
            return NextResponse.json(
                { error: "No organization found. Please select an organization." },
                { status: 400 }
            )
        }

        // Check if organization can use AATX Coder
        const canUse = await canOrganizationPerformAction(
            organization.id,
            'aatx_coder',
            'use'
        )

        if (!canUse) {
            const plan = organization.plan
            const limit = plan?.limits.aatx_coder_monthly || 3
            return NextResponse.json({
                error: "AATX Coder usage limit reached",
                message: `You've reached your monthly limit of ${limit} AATX Coder uses. Upgrade to Pro for unlimited usage.`,
                limit,
                upgrade_url: "/pricing"
            }, { status: 403 })
        }

        const { trackingPlanId, customPrompt } = await request.json()

        const supabase = await createClient()
        const profile = await getProfile()

        if (!profile?.current_org_id) {
            return NextResponse.json(
                { error: "No organization selected" },
                { status: 400 }
            )
        }

        // Verify tracking plan belongs to current organization
        const { data: trackingPlan, error: planError } = await supabase
            .from('plans')
            .select('id, name, org_id')
            .eq('id', trackingPlanId)
            .eq('org_id', profile.current_org_id)
            .single()

        if (planError || !trackingPlan) {
            return NextResponse.json(
                { error: "Tracking plan not found or access denied" },
                { status: 404 }
            )
        }

        // Get connected repositories for this tracking plan
        const { data: userEventWithRepos } = await supabase.from('user_event_plans').select('user_event_id, user_events(repo_id)').eq('plan_id', trackingPlan.id)
        const eventRepos = userEventWithRepos?.map(ue => ue.user_events?.repo_id).filter(Boolean) as string[] || []
        const { data: repos, error } = await supabase.from('repos').select('*').in('id', eventRepos)

        if (error) {
            throw new Error(`Failed to fetch repositories: ${error.message}`)
        }

        // Get unimplemented events from tracking plan
        const events = await getUserEvents(trackingPlanId)
        const unimplementedEvents = events.filter(event =>
            event.status === 'new' || event.status === 'updated'
        )

        if (unimplementedEvents.length === 0) {
            return NextResponse.json(
                { error: "No events to implement" },
                { status: 400 }
            )
        }

        // Track usage before processing
        for (const repo of repos) {
            await trackUsage(
                organization.id,
                'aatx_coder',
                'use',
                trackingPlanId,
                {
                    repositoryId: repo.id,
                    eventCount: unimplementedEvents.length,
                    customPrompt: !!customPrompt
                }
            )
        }

        // Prepare events for the agent
        const eventsForAgent = unimplementedEvents.map(event => ({
            name: event.event_name,
            description: event.description || undefined,
            properties: event.properties || undefined
        }))

        // Prepare agent input
        const agentInputs = []
        for (const repo of repos) {
            const agentInput = {
                repositoryId: repo.id,
                repoUrl: repo.url,
                events: eventsForAgent,
                ...(customPrompt && { customInstructions: customPrompt })
            }
            agentInputs.push(agentInput)
        }

        const aatxCoderAgent = mastra.getAgent('aatxCoder')
        const results = await Promise.all(agentInputs.map(async (agentInput) => {
            await aatxCoderAgent.generate([{
                role: "user",
                content: JSON.stringify(agentInput)
            }], {
                maxSteps: 30,
                maxRetries: 3,
                temperature: 0,
            })
        }))

        return NextResponse.json({
            success: true,
            results,
            trackingPlanId,
            eventsImplemented: unimplementedEvents.length,
            events: eventsForAgent
        })

    } catch (error) {
        console.error('AATX Coder error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "An unexpected error occurred" },
            { status: 500 }
        )
    }
}
