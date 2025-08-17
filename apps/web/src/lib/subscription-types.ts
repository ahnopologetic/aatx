// HUM-490: Types for subscription plans and usage tracking

export interface SubscriptionPlan {
    id: string;
    name: string;
    display_name: string;
    description?: string;
    price_monthly: number;
    price_yearly: number;
    features: PlanFeatures;
    limits: PlanLimits;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PlanFeatures {
    basic_analytics?: boolean;
    unlimited_analytics?: boolean;
    repository_scanning?: boolean;
    tracking_plans?: boolean;
    community_support?: boolean;
    priority_support?: boolean;
    advanced_integrations?: boolean;
    team_collaboration?: boolean;
    custom_exports?: boolean;
}

export interface PlanLimits {
    aatx_coder_monthly: number; // -1 for unlimited
    tracking_plans_total: number; // -1 for unlimited
    repositories_total: number; // -1 for unlimited
    events_per_plan: number; // -1 for unlimited
}

export interface UsageTracking {
    id: string;
    org_id: string;
    resource_type: string;
    resource_id?: string;
    action: string;
    metadata: Record<string, any>;
    created_at: string;
    date_key: string;
}

export interface OrganizationUsage {
    resource_type: string;
    total_count: number;
    current_month_count: number;
    current_date_count: number;
}

export interface OrganizationWithPlan {
    id: string;
    name: string;
    plan_id: string;
    plan?: SubscriptionPlan;
    created_at: string;
    updated_at: string;
    created_by: string;
}

export type ResourceType = 'aatx_coder' | 'tracking_plan' | 'repository';
export type ActionType = 'create' | 'use' | 'scan' | 'delete';

// Helper functions
export function isUnlimited(limit: number): boolean {
    return limit === -1;
}

export function canPerformAction(
    currentUsage: number,
    limit: number
): boolean {
    return isUnlimited(limit) || currentUsage < limit;
}

export function getUsagePercentage(
    currentUsage: number,
    limit: number
): number {
    if (isUnlimited(limit)) return 0;
    return Math.min((currentUsage / limit) * 100, 100);
}

export function isNearLimit(
    currentUsage: number,
    limit: number,
    threshold: number = 80
): boolean {
    if (isUnlimited(limit)) return false;
    return getUsagePercentage(currentUsage, limit) >= threshold;
}
