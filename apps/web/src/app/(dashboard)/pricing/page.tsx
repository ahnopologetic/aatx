import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { PricingSection } from "@/components/blocks/pricing-section"
import { getCurrentUserUsageWithLimits } from "@/lib/subscription-utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
    Zap,
    Crown,
    BarChart3,
    GitBranch,
    Users,
    Download,
    Headphones,
    Shield,
    Code2,
    Infinity
} from "lucide-react"
import { getUsagePercentage, isUnlimited } from "@/lib/subscription-types"

export default async function PricingPage() {
    const userData = await getCurrentUserUsageWithLimits()

    const getAATXCoderUsage = () => {
        if (!userData) return { current: 0, limit: 3, percentage: 0 }
        const usage = userData.usage.find(u => u.resource_type === 'aatx_coder')
        const limit = userData.organization.plan?.limits.aatx_coder_monthly || 3
        const current = usage?.current_month_count || 0
        return {
            current,
            limit,
            percentage: getUsagePercentage(current, limit)
        }
    }

    const getTrackingPlanUsage = () => {
        if (!userData) return { current: 0, limit: 1, percentage: 0 }
        const usage = userData.usage.find(u => u.resource_type === 'tracking_plan')
        const limit = userData.organization.plan?.limits.tracking_plans_total || 1
        const current = usage?.total_count || 0
        return {
            current,
            limit,
            percentage: getUsagePercentage(current, limit)
        }
    }

    const aatxCoderUsage = getAATXCoderUsage()
    const trackingPlanUsage = getTrackingPlanUsage()

    const pricingTiers = [
        {
            name: "Free",
            price: { monthly: 0, yearly: 0 },
            description: "Perfect for getting started with analytics tracking",
            highlight: userData?.organization.plan_id === 'free',
            badge: userData?.organization.plan_id === 'free' ? "Current Plan" : undefined,
            icon: <Zap className="w-6 h-6" />,
            features: [
                {
                    name: "Basic Analytics",
                    description: "Essential tracking capabilities",
                    included: true,
                },
                {
                    name: "Repository Scanning",
                    description: "Analyze your code for tracking events",
                    included: true,
                },
                {
                    name: "Community Support",
                    description: "Access to community forums",
                    included: true,
                },
                {
                    name: "3 AATX Coder Uses/Month",
                    description: "AI-powered code generation",
                    included: true,
                },
                {
                    name: "1 Tracking Plan",
                    description: "Organize your analytics events",
                    included: true,
                },
                {
                    name: "5 Repositories",
                    description: "Connect up to 5 repositories",
                    included: true,
                },
                {
                    name: "10 Events per Plan",
                    description: "Track up to 10 events per plan",
                    included: true,
                },
            ],
        },
        {
            name: "Pro",
            price: { monthly: 29, yearly: 290 },
            description: "For teams that need advanced analytics and unlimited usage",
            highlight: true,
            badge: userData?.organization.plan_id === 'pro' ? "Current Plan" : "Most Popular",
            icon: <Crown className="w-6 h-6" />,
            features: [
                {
                    name: "Everything in Free",
                    description: "All free plan features included",
                    included: true,
                },
                {
                    name: "Unlimited AATX Coder",
                    description: "No limits on AI code generation",
                    included: true,
                },
                {
                    name: "Unlimited Tracking Plans",
                    description: "Create as many plans as you need",
                    included: true,
                },
                {
                    name: "Unlimited Repositories",
                    description: "Connect unlimited repositories",
                    included: true,
                },
                {
                    name: "Unlimited Events",
                    description: "Track unlimited events per plan",
                    included: true,
                },
                {
                    name: "Priority Support",
                    description: "Get help when you need it most",
                    included: true,
                },
                {
                    name: "Advanced Integrations",
                    description: "Connect with more analytics tools",
                    included: true,
                },
                {
                    name: "Team Collaboration",
                    description: "Work together on tracking plans",
                    included: true,
                },
                {
                    name: "Custom Exports",
                    description: "Export data in your preferred format",
                    included: true,
                },
            ],
        },
    ]

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Pricing Plans"
                text="Choose the plan that works best for your team."
            />

            {userData && (
                <div className="mb-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                Current Usage
                                <Badge variant="outline" className="ml-2">
                                    {userData.organization.plan?.display_name}
                                </Badge>
                            </CardTitle>
                            <CardDescription>
                                Your current usage for {userData.organization.name}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Code2 className="w-4 h-4" />
                                            <span className="text-sm font-medium">AATX Coder (This Month)</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {aatxCoderUsage.current} / {isUnlimited(aatxCoderUsage.limit) ? '∞' : aatxCoderUsage.limit}
                                        </span>
                                    </div>
                                    {!isUnlimited(aatxCoderUsage.limit) && (
                                        <Progress value={aatxCoderUsage.percentage} className="h-2" />
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4" />
                                            <span className="text-sm font-medium">Tracking Plans</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {trackingPlanUsage.current} / {isUnlimited(trackingPlanUsage.limit) ? '∞' : trackingPlanUsage.limit}
                                        </span>
                                    </div>
                                    {!isUnlimited(trackingPlanUsage.limit) && (
                                        <Progress value={trackingPlanUsage.percentage} className="h-2" />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <PricingSection
                tiers={pricingTiers}
                className="bg-background"
            />
        </DashboardShell>
    )
}
