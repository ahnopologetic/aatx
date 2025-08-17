import { NextResponse } from "next/server"
import { getCurrentUserUsageWithLimits } from "@/lib/subscription-utils"

export async function GET() {
  try {
    const userData = await getCurrentUserUsageWithLimits()
    
    if (!userData) {
      return NextResponse.json({
        organization: null,
        usage: [],
        canUseAATXCoder: false,
        canCreateTrackingPlan: false,
        canCreateRepository: false
      })
    }

    return NextResponse.json(userData)
  } catch (error) {
    console.error("Error fetching user subscription data:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscription data" },
      { status: 500 }
    )
  }
}
