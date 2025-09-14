'use client'

import { Database } from "@/lib/database.types"
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { Code2, Loader2 } from "lucide-react"
import { z } from "zod"
import { AatxCoderActionButton } from "./aatx-coder-action-button"

type AatxCoderActivityProps = {
    trackingPlan: Database['public']['Tables']['plans']['Row']
    events: Database['public']['Tables']['user_events']['Row'][]
}
export default function AatxCoderActivity({ trackingPlan, events }: AatxCoderActivityProps) {
    const { object, submit, isLoading } = useObject({
        api: '/api/ai/coder/user/stream',
        schema: z.object({
            state: z.enum(['idle', 'running', 'background', 'review', 'creating-pr', 'success']),
            result: z.object({
                state: z.enum(['idle', 'running', 'background', 'review', 'creating-pr', 'success']),
                result: z.object({
                    pullRequestUrl: z.string(),
                    branchName: z.string(),
                    eventsImplemented: z.number(),
                }).nullable(),
            }),
        }),
    })

    return (
        <div>
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
                    <AatxCoderActionButton state={object?.state ?? 'idle'} result={object?.result as { pullRequestUrl: string; branchName: string; eventsImplemented: number } | null} onRun={() => {
                        submit({
                            trackingPlanId: trackingPlan.id,
                            customPrompt: 'Implement the following events in the codebase: ' + events.map(event => event.event_name).join(', '),
                        })
                    }} />
                </div>
            </div>

            {/* Live activity */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-center">
                    <p className="text-muted-foreground">Not started</p>
                </div>
                {
                    isLoading ? <div className="flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </div> : null
                }
                {object ? <pre>{JSON.stringify(object, null, 2)}</pre> : null}
            </div>
        </div>
    )
}