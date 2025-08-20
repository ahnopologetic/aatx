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

        // Get connected repositories
        const { data: planRepos } = await supabase
            .from('plan_repos')
            .select('repo_id, repos(id, name, url, default_branch)')
            .eq('plan_id', trackingPlanId)

        if (!planRepos || planRepos.length === 0) {
            return new Response(
                JSON.stringify({ error: "No repositories connected" }) + '\n',
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/x-ndjson' }
                }
            )
        }

        const repository = planRepos[0].repos
        if (!repository) {
            return new Response(
                JSON.stringify({ error: "Repository not found" }) + '\n',
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
        await trackUsage(
            organization.id,
            'aatx_coder',
            'use',
            trackingPlanId,
            {
                repositoryId: repository.id,
                eventCount: unimplementedEvents.length,
                customPrompt: !!customPrompt
            }
        )

        // Prepare events for the agent
        const eventsForAgent = unimplementedEvents.map(event => ({
            name: event.event_name,
            description: event.description || undefined,
            properties: event.properties || undefined
        }))

        // Prepare agent input
        let agentContent = `Repository ID: ${repository.id}\nRepository URL: ${repository.url}\nEvents to implement: ${JSON.stringify(eventsForAgent, null, 2)}`

        if (customPrompt) {
            agentContent += `\n\nCustom Instructions: ${customPrompt}`
        }

        const agent = mastra.getAgent('aatxCoder')
        const encoder = new TextEncoder()

        const stream = agent.streamVNext([
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

        const { readable, writable } = new TransformStream()
        const writer = writable.getWriter()

        // Helper to send one NDJSON line
        const send = async (obj: unknown) => {
            await writer.write(encoder.encode(JSON.stringify(obj) + '\n'))
        }

        type Usage = { totalTokens?: number } & Record<string, unknown>
        type AgentChunk = unknown

            // Process the stream in the background
            ; (async () => {
                try {
                    for await (const chunk of stream) {
                        await send({
                            type: 'chunk',
                            data: chunk,
                            timestamp: Date.now()
                        })
                    }

                    await send({
                        type: 'done',
                        timestamp: Date.now()
                    })
                } catch (error) {
                    await send({
                        type: 'error',
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: Date.now()
                    })
                } finally {
                    await writer.close()
                }
            })()

        return new Response(readable, {
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', // Disable nginx buffering
            },
        })

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
