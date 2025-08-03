import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  // const { data: trackingPlans, error } = await supabase.from('tracking_plans').select('*')
  // if (error) {
  //   return NextResponse.json({ error: error.message }, { status: 500 })
  // }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // In a real app, fetch tracking plans from database
    const trackingPlans = [
      { id: "1", name: "Web Analytics", version: "1.2.0", lastUpdated: "2023-07-28T15:30:00Z", eventsCount: 24 },
      { id: "2", name: "Mobile Analytics", version: "0.9.0", lastUpdated: "2023-07-15T10:45:00Z", eventsCount: 18 },
      { id: "3", name: "Backend Metrics", version: "2.0.1", lastUpdated: "2023-08-02T09:20:00Z", eventsCount: 31 },
    ]

    return NextResponse.json({ trackingPlans })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
