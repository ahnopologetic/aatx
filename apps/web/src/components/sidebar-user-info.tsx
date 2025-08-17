"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Code2,
    BarChart3,
    Crown,
    Zap,
    Settings,
    LogOut
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import type { OrganizationWithPlan, OrganizationUsage } from "@/lib/subscription-types"
import { getUsagePercentage, isUnlimited } from "@/lib/subscription-types"

interface SidebarUserInfoProps {
    user: {
        name: string
        email: string
        image: string
    }
    organization?: OrganizationWithPlan
    usage?: OrganizationUsage[]
}

export function SidebarUserInfo({ user, organization, usage = [] }: SidebarUserInfoProps) {
    const router = useRouter()
    const supabase = createClient()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/")
    }

    const aatxCoderUsage = usage.find(u => u.resource_type === 'aatx_coder')
    const trackingPlanUsage = usage.find(u => u.resource_type === 'tracking_plan')

    const aatxCoderLimit = organization?.plan?.limits.aatx_coder_monthly || 3
    const trackingPlanLimit = organization?.plan?.limits.tracking_plans_total || 1

    const aatxCoderCurrent = aatxCoderUsage?.current_month_count || 0
    const trackingPlanCurrent = trackingPlanUsage?.total_count || 0

    const isFreePlan = organization?.plan_id === 'free'
    const planIcon = isFreePlan ? <Zap className="w-3 h-3" /> : <Crown className="w-3 h-3" />

    return (
        <div className="p-2 border-t border-border mt-auto">
            <TooltipProvider>
                <Tooltip>
                    <Card className="py-2">
                        <CardContent className="grid grid-rows-3">
                            <div className="flex items-center gap-3 mb-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.image} alt={user.name} />
                                    <AvatarFallback className="text-xs">
                                        {user.name?.charAt(0) || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{user.name}</p>
                                    <div className="flex items-center gap-1">
                                        {planIcon}
                                        <span className="text-xs text-muted-foreground">
                                            {organization?.plan?.display_name || 'Free'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <TooltipTrigger asChild>
                                {organization && isFreePlan && (
                                    <div className="space-y-2 hover:bg-accent/50 transition-colors cursor-pointer px-2 py-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1">
                                                <Code2 className="w-3 h-3" />
                                                <span>AATX Coder</span>
                                            </div>
                                            <span className="text-muted-foreground">
                                                {aatxCoderCurrent}/{isUnlimited(aatxCoderLimit) ? '∞' : aatxCoderLimit}
                                            </span>
                                        </div>
                                        {!isUnlimited(aatxCoderLimit) && (
                                            <Progress
                                                value={getUsagePercentage(aatxCoderCurrent, aatxCoderLimit)}
                                                className="h-1"
                                            />
                                        )}

                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1">
                                                <BarChart3 className="w-3 h-3" />
                                                <span>Plans</span>
                                            </div>
                                            <span className="text-muted-foreground">
                                                {trackingPlanCurrent}/{isUnlimited(trackingPlanLimit) ? '∞' : trackingPlanLimit}
                                            </span>
                                        </div>
                                        {!isUnlimited(trackingPlanLimit) && (
                                            <Progress
                                                value={getUsagePercentage(trackingPlanCurrent, trackingPlanLimit)}
                                                className="h-1"
                                            />
                                        )}
                                    </div>
                                )}
                            </TooltipTrigger>

                            <div className="flex gap-1 mt-3">
                                <Link href="/pricing" className="flex-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full h-6 text-xs"
                                    >
                                        {isFreePlan ? 'Upgrade' : 'Billing'}
                                    </Button>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2"
                                    onClick={handleSignOut}
                                >
                                    <LogOut className="w-3 h-3" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                    <TooltipContent side="right" className="max-w-80">
                        <div className="space-y-2">
                            <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>

                            {organization && (
                                <>
                                    <div className="border-t pt-2">
                                        <p className="text-sm font-medium">{organization.name}</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            {planIcon}
                                            <span className="text-sm">{organization.plan?.display_name}</span>
                                            {organization.plan?.price_monthly && organization.plan.price_monthly > 0 && (
                                                <Badge variant="outline" className="text-xs">
                                                    ${organization.plan.price_monthly}/mo
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {isFreePlan && (
                                        <div className="border-t pt-2 space-y-2">
                                            <div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span>AATX Coder (this month)</span>
                                                    <span>{aatxCoderCurrent}/{isUnlimited(aatxCoderLimit) ? '∞' : aatxCoderLimit}</span>
                                                </div>
                                                {!isUnlimited(aatxCoderLimit) && (
                                                    <Progress
                                                        value={getUsagePercentage(aatxCoderCurrent, aatxCoderLimit)}
                                                        className="h-2 mt-1"
                                                    />
                                                )}
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span>Tracking Plans</span>
                                                    <span>{trackingPlanCurrent}/{isUnlimited(trackingPlanLimit) ? '∞' : trackingPlanLimit}</span>
                                                </div>
                                                {!isUnlimited(trackingPlanLimit) && (
                                                    <Progress
                                                        value={getUsagePercentage(trackingPlanCurrent, trackingPlanLimit)}
                                                        className="h-2 mt-1"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div >
    )
}
