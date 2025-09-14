// HUM-490: Utility functions for subscription management

import { createClient } from "@/utils/supabase/server";
import type {
    SubscriptionPlan,
    OrganizationUsage,
    ResourceType,
    ActionType,
    OrganizationWithPlan
} from "./subscription-types";
import { revalidateTag } from "next/cache";

export async function getOrganizationPlan(orgId: string): Promise<SubscriptionPlan | null> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('organizations')
            .select('plan_id')
            .eq('id', orgId)
            .single();

        if (error || !data) {
            console.error('Error fetching organization:', error);
            return null;
        }

        // If no plan_id, assume free plan
        const planId = (data as any).plan_id || 'free';

        // Return default plans if subscription_plans table doesn't exist yet
        return getDefaultPlan(planId);
    } catch (error) {
        console.error('Error fetching organization plan:', error);
        return getDefaultPlan('free');
    }
}

export async function getDefaultPlan(planId: string): Promise<SubscriptionPlan> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

    if (error || !data) {
        console.error('Error fetching default plan:', error);
        throw error;
    }

    return data as unknown as SubscriptionPlan;
}

export async function getOrganizationWithPlan(orgId: string): Promise<OrganizationWithPlan | null> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();

        if (error || !data) {
            console.error('Error fetching organization:', error);
            return null;
        }

        const plan = await getOrganizationPlan(orgId);
        const planId = (data as any).plan_id || 'free';

        return {
            ...data,
            plan_id: planId,
            plan: plan
        } as OrganizationWithPlan;
    } catch (error) {
        console.error('Error fetching organization with plan:', error);
        return null;
    }
}

export async function getCurrentUserOrganization(): Promise<OrganizationWithPlan | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('current_org_id')
        .eq('id', user.id)
        .single();

    if (!profile?.current_org_id) return null;

    return getOrganizationWithPlan(profile.current_org_id);
}

export async function getOrganizationUsage(
    orgId: string,
    resourceType?: ResourceType
): Promise<OrganizationUsage[]> {

    // TODO: Implement actual usage tracking when the tables are created
    const supabase = await createClient();
    const { data, error } = await supabase
        .rpc('get_organization_usage', {
            org_uuid: orgId,
            resource_type_param: resourceType || undefined
        });

    if (error) {
        console.error('Error fetching organization usage:', error);
        return [];
    }

    return data || [];
}

export async function canOrganizationPerformAction(
    orgId: string,
    resourceType: ResourceType,
    actionType: ActionType = 'create'
): Promise<boolean> {
    try {
        const plan = await getOrganizationPlan(orgId);
        if (!plan) return false;

        const limits = plan.limits;
        const usage = await getOrganizationUsage(orgId, resourceType);
        const resourceUsage = usage.find(u => u.resource_type === resourceType);

        if (!resourceUsage) return true;

        let currentUsage = 0;
        let limit = 0;

        switch (resourceType) {
            case 'aatx_coder':
                currentUsage = resourceUsage.current_month_count;
                limit = limits.aatx_coder_monthly;
                break;
            case 'tracking_plan':
                currentUsage = resourceUsage.total_count;
                limit = limits.tracking_plans_total;
                break;
            case 'repository':
                currentUsage = resourceUsage.total_count;
                limit = limits.repositories_total;
                break;
        }

        // -1 means unlimited
        return limit === -1 || currentUsage < limit;
    } catch (error) {
        console.error('Error checking organization permissions:', error);
        return false;
    }
}

export async function trackUsage(
    orgId: string,
    resourceType: ResourceType,
    action: ActionType,
    resourceId?: string,
    metadata?: Record<string, any>
): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('usage_tracking')
        .insert({
            org_id: orgId,
            resource_type: resourceType,
            action,
            resource_id: resourceId || null,
            metadata: metadata || {}
        });
    if (error) {
        console.error('Error tracking usage:', error);
        return false;
    }

    revalidateTag('organization-usage')

    return true;
}

export async function updateOrganizationPlan(
    orgId: string,
    planId: string
): Promise<boolean> {
    try {
        const supabase = await createClient();

        // Try to update with plan_id if the column exists, otherwise just log
        const { error } = await supabase
            .from('organizations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', orgId);

        if (error) {
            console.error('Error updating organization:', error);
            return false;
        }

        // TODO: Update plan_id when the column is added to the database
        console.log('Plan update (mocked):', { orgId, planId });
        return true;
    } catch (error) {
        console.error('Error updating organization plan:', error);
        return false;
    }
}

// Helper to get current user's organization usage with limits
export async function getCurrentUserUsageWithLimits(): Promise<{
    organization: OrganizationWithPlan;
    usage: OrganizationUsage[];
    canUseAATXCoder: boolean;
    canCreateTrackingPlan: boolean;
    canCreateRepository: boolean;
} | null> {
    const organization = await getCurrentUserOrganization();
    if (!organization) return null;

    const usage = await getOrganizationUsage(organization.id);

    const canUseAATXCoder = await canOrganizationPerformAction(
        organization.id,
        'aatx_coder'
    );

    const canCreateTrackingPlan = await canOrganizationPerformAction(
        organization.id,
        'tracking_plan'
    );

    const canCreateRepository = await canOrganizationPerformAction(
        organization.id,
        'repository'
    );

    return {
        organization,
        usage,
        canUseAATXCoder,
        canCreateTrackingPlan,
        canCreateRepository
    };
}
