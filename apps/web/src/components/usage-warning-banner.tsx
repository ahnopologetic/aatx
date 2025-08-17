"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Crown } from "lucide-react"
import Link from "next/link"
import { useUsageCheck } from "@/hooks/use-subscription"

interface UsageWarningBannerProps {
  resourceType: 'aatx_coder' | 'tracking_plan' | 'repository'
  className?: string
}

export function UsageWarningBanner({ resourceType, className }: UsageWarningBannerProps) {
  const { current, limit, isNearLimit, isUnlimited, percentage } = useUsageCheck(resourceType)

  if (isUnlimited || !isNearLimit) {
    return null
  }

  const resourceLabels = {
    aatx_coder: 'AATX Coder uses',
    tracking_plan: 'Tracking Plans',
    repository: 'Repositories'
  }

  const isAtLimit = current >= limit

  return (
    <Alert className={className} variant={isAtLimit ? "destructive" : "default"}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          {isAtLimit 
            ? `You've reached your limit of ${limit} ${resourceLabels[resourceType].toLowerCase()}.`
            : `You're using ${current} of ${limit} ${resourceLabels[resourceType].toLowerCase()} (${Math.round(percentage)}%).`
          }
        </span>
        <Link href="/pricing">
          <Button size="sm" variant={isAtLimit ? "secondary" : "outline"}>
            <Crown className="mr-1 h-3 w-3" />
            Upgrade to Pro
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  )
}
