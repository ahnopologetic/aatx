import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { canOrganizationPerformAction, trackUsage, getOrganizationPlan } from "@/lib/subscription-utils"

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get user's current organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_org_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.current_org_id) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('org_id', profile.current_org_id)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ trackingPlans: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get user's current organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_org_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.current_org_id) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 })
  }


  const canCreate = await canOrganizationPerformAction(
    profile.current_org_id,
    'tracking_plan',
    'create'
  )

  if (!canCreate) {
    const plan = await getOrganizationPlan(profile.current_org_id)
    const limit = plan?.limits.tracking_plans_total || 1
    return NextResponse.json({
      error: "Tracking plan limit reached",
      message: `You've reached your limit of ${limit} tracking plan${limit === 1 ? '' : 's'}. Upgrade to Pro for unlimited tracking plans.`,
      limit,
      upgrade_url: "/pricing"
    }, { status: 403 })
  }

  const { name, description }: { name: string; description?: string } = await request.json()
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const now = new Date().toISOString()
  const insertPlan = {
    id: randomUUID(),
    name,
    description: description ?? null,
    user_id: session.user.id, // Keep for backward compatibility/audit trail
    org_id: profile.current_org_id, // Use current organization
    version: '1.0.0',
    status: 'active',
    import_source: null,
    created_at: now,
    updated_at: now,
  }
  const { data, error } = await supabase.from('plans').insert(insertPlan).select('*').single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Track usage after successful creation
  await trackUsage(
    profile.current_org_id,
    'tracking_plan',
    'create',
    data.id,
    { name, description }
  )

  return NextResponse.json({ plan: data })
}
