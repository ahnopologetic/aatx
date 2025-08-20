"use server"

import { createClient } from "@/utils/supabase/server"
import { getProfile } from "@/app/api/user/profile/action"
import {
    getCurrentUserOrganization,
    canOrganizationPerformAction,
    trackUsage
} from "@/lib/subscription-utils"
import { Database } from "@/lib/database.types"

export interface StartCoderParams {
    trackingPlanId: string
    customPrompt?: string
}

export interface CoderSession {
    id: string
    trackingPlanId: string
    status: 'running' | 'background' | 'completed' | 'failed' | 'stopped'
    repositoryId?: string
    branchName?: string
    pullRequestUrl?: string
    createdAt: string
    updatedAt: string
}

export async function startAatxCoder(params: StartCoderParams): Promise<{ sessionId: string }> {
    const supabase = await createClient()
    const profile = await getProfile()

    if (!profile?.current_org_id) {
        throw new Error("No organization selected")
    }

    // Verify tracking plan belongs to current organization
    const { data: trackingPlan, error: planError } = await supabase
        .from('plans')
        .select('id, name, org_id')
        .eq('id', params.trackingPlanId)
        .eq('org_id', profile.current_org_id)
        .single()

    if (planError || !trackingPlan) {
        throw new Error("Tracking plan not found or access denied")
    }

    // Get current user's organization and check permissions
    const organization = await getCurrentUserOrganization()
    if (!organization) {
        throw new Error("No organization found")
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
        throw new Error(`AATX Coder usage limit reached. You've reached your monthly limit of ${limit} uses. Upgrade to Pro for unlimited usage.`)
    }

    // Get connected repositories for this tracking plan
    const { data: userEventWithRepos } = await supabase.from('user_event_plans').select('user_event_id, user_events(repo_id)').eq('plan_id', trackingPlan.id)
    const eventRepos = userEventWithRepos?.map(ue => ue.user_events?.repo_id).filter(Boolean) as string[] || []
    const { data: repos, error } = await supabase.from('repos').select('*').in('id', eventRepos)

    if (error) {
        throw new Error(`Failed to fetch repositories: ${error.message}`)
    }

    // Track usage before processing
    for (const repo of repos) {
        await trackUsage(
            organization.id,
            'aatx_coder',
            'use',
            params.trackingPlanId,
            { repositoryId: repo.id, customPrompt: !!params.customPrompt }
        )
    }

    // Create a coder session record
    const sessionId = crypto.randomUUID()

    // In a real implementation, you would store the session in the database
    // For now, we'll return the session ID and let the client handle the rest

    return { sessionId }
}

export async function stopAatxCoder(sessionId: string): Promise<void> {
    // Implementation to stop the running AATX Coder session
    // This would update the session status and stop any running processes
    console.log('Stopping AATX Coder session:', sessionId)
}

export async function runAatxCoderInBackground(sessionId: string): Promise<void> {
    // Implementation to move the AATX Coder session to background
    // This would update the session status and continue processing in background
    console.log('Running AATX Coder session in background:', sessionId)
}

export async function getCoderSession(sessionId: string): Promise<CoderSession | null> {
    // Implementation to get the current status of a coder session
    // This would query the database for the session details
    return null
}

export async function getTrackingPlanRepositories(trackingPlanId: string): Promise<Database['public']['Tables']['repos']['Row'][]> {
    const supabase = await createClient()
    const profile = await getProfile()

    if (!profile?.current_org_id) {
        throw new Error("No organization selected")
    }

    // Verify tracking plan belongs to current organization
    const { data: trackingPlan, error: planError } = await supabase
        .from('plans')
        .select('id, name, org_id')
        .eq('id', trackingPlanId)
        .eq('org_id', profile.current_org_id)
        .single()

    if (planError || !trackingPlan) {
        throw new Error("Tracking plan not found or access denied")
    }

    // Get connected repositories
    const { data: userEventWithRepos } = await supabase.from('user_event_plans').select('user_event_id, user_events(repo_id)').eq('plan_id', trackingPlan.id)
    const eventRepos = userEventWithRepos?.map(ue => ue.user_events?.repo_id).filter(Boolean) as string[] || []
    const { data: repos, error } = await supabase.from('repos').select('*').in('id', eventRepos)

    if (error) {
        throw new Error(`Failed to fetch repositories: ${error.message}`)
    }

    return repos || []
}
