export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { mastra } from '~mastra/index'
import { createClient } from "@/utils/supabase/server"
import { getProfile } from "@/app/api/user/profile/action"
import { getUserEvents } from "@/app/api/tracking-plans/[id]/events/action"
import {
    getCurrentUserOrganization,
    canOrganizationPerformAction,
    trackUsage
} from "@/lib/subscription-utils"

// Stream AATX Coder agent progress as NDJSON
export async function POST(req: NextRequest) {
    const { trackingPlanId, customPrompt } = await req.json()

    try {
        // Get current user's organization
        const organization = await getCurrentUserOrganization()
        if (!organization) {
            return new Response(
                JSON.stringify({ error: "No organization found" }) + '\n',
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/x-ndjson' }
                }
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
            return new Response(
                JSON.stringify({
                    error: "AATX Coder usage limit reached",
                    message: `You've reached your monthly limit of ${limit} uses.`
                }) + '\n',
                {
                    status: 403,
                    headers: { 'Content-Type': 'application/x-ndjson' }
                }
            )
        }

        const supabase = await createClient()
        const profile = await getProfile()

        if (!profile?.current_org_id) {
            return new Response(
                JSON.stringify({ error: "No organization selected" }) + '\n',
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/x-ndjson' }
                }
            )
        }

        // Verify tracking plan and get repository
        const { data: trackingPlan } = await supabase
            .from('plans')
            .select('id, name, org_id')
            .eq('id', trackingPlanId)
            .eq('org_id', profile.current_org_id)
            .single()

        if (!trackingPlan) {
            return new Response(
                JSON.stringify({ error: "Tracking plan not found" }) + '\n',
                {
                    status: 404,
                    headers: { 'Content-Type': 'application/x-ndjson' }
                }
            )
        }

        // Get unimplemented events
        const events = await getUserEvents(trackingPlanId)
        const unimplementedEvents = events.filter(event =>
            event.status === 'new' || event.status === 'updated'
        )

        if (unimplementedEvents.length === 0) {
            return new Response(
                JSON.stringify({ error: "No events to implement" }) + '\n',
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/x-ndjson' }
                }
            )
        }

        // Track usage
        for (const event of unimplementedEvents) {
            await trackUsage(
                organization.id,
                'aatx_coder',
                'use',
                trackingPlanId,
                {
                    repositoryId: event.repo?.id,
                    eventCount: 1,
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
        let agentContent = `Events to implement: ${JSON.stringify(eventsForAgent, null, 2)}`

        if (customPrompt) {
            agentContent += `\n\nCustom Instructions: ${customPrompt}`
        }

        const agent = mastra.getAgent('aatxCoder')

        const stream = await agent.stream([
            {
                role: 'user',
                content: agentContent,
            },
        ], {
            maxSteps: 30,
            maxRetries: 3,
            temperature: 0,
            toolChoice: 'auto',
            memory: {
                thread: `@aatx-coder/${trackingPlanId}-${new Date().toISOString()}`,
                resource: profile.id,
            },
        })
        return stream.toDataStreamResponse()

    } catch (error) {
        console.error('AATX Coder stream error:', error)
        return new Response(
            JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now()
            }) + '\n',
            {
                status: 500,
                headers: { 'Content-Type': 'application/x-ndjson' }
            }
        )
    }
}
