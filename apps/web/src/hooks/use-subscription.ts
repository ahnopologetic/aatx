"use client"

import { useState, useEffect } from "react"
import type { OrganizationWithPlan, OrganizationUsage } from "@/lib/subscription-types"

interface UseSubscriptionData {
  organization: OrganizationWithPlan | null
  usage: OrganizationUsage[]
  canUseAATXCoder: boolean
  canCreateTrackingPlan: boolean
  canCreateRepository: boolean
  isLoading: boolean
  error: string | null
}

export function useSubscription(): UseSubscriptionData {
  const [data, setData] = useState<UseSubscriptionData>({
    organization: null,
    usage: [],
    canUseAATXCoder: false,
    canCreateTrackingPlan: false,
    canCreateRepository: false,
    isLoading: true,
    error: null
  })

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        const response = await fetch("/api/user/subscription")
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch subscription data")
        }

        setData({
          ...result,
          isLoading: false,
          error: null
        })
      } catch (error) {
        console.error("Error fetching subscription data:", error)
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Unknown error"
        }))
      }
    }

    fetchSubscriptionData()
  }, [])

  return data
}

export function useUsageCheck(resourceType: 'aatx_coder' | 'tracking_plan' | 'repository') {
  const { usage, organization, isLoading } = useSubscription()
  
  const resourceUsage = usage.find(u => u.resource_type === resourceType)
  const limits = organization?.plan?.limits

  let current = 0
  let limit = 0
  let canPerform = false

  if (limits && resourceUsage) {
    switch (resourceType) {
      case 'aatx_coder':
        current = resourceUsage.current_month_count
        limit = limits.aatx_coder_monthly
        break
      case 'tracking_plan':
        current = resourceUsage.total_count
        limit = limits.tracking_plans_total
        break
      case 'repository':
        current = resourceUsage.total_count
        limit = limits.repositories_total
        break
    }

    canPerform = limit === -1 || current < limit
  }

  return {
    current,
    limit,
    canPerform,
    isUnlimited: limit === -1,
    percentage: limit === -1 ? 0 : Math.min((current / limit) * 100, 100),
    isNearLimit: limit !== -1 && ((current / limit) * 100) >= 80,
    isLoading
  }
}
