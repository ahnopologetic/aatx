import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get user's current organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_org_id')
      .eq('id', session.user.id)
      .single()

    if (!profile?.current_org_id) {
      return NextResponse.json({ error: "No organization selected" }, { status: 400 })
    }

    // Get the change and verify it belongs to user's organization
    const { data: change, error: changeError } = await supabase
      .from('rescan_changes')
      .select(`
        id,
        status,
        change_type,
        event_name,
        rescan_jobs!inner(id, org_id)
      `)
      .eq('id', id)
      .eq('rescan_jobs.org_id', profile.current_org_id)
      .single()

    if (changeError || !change) {
      return NextResponse.json({ error: "Change not found or access denied" }, { status: 404 })
    }

    if (change.status !== 'pending') {
      return NextResponse.json({ error: "Change is not in pending status" }, { status: 400 })
    }

    // Update the change status to rejected
    const { error: updateError } = await supabase
      .from('rescan_changes')
      .update({
        status: 'rejected',
        approved_by: session.user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating change status:', updateError)
      return NextResponse.json({ error: "Failed to reject change" }, { status: 500 })
    }

    console.log(`Change ${id} rejected by user ${session.user.id}`)

    return NextResponse.json({ 
      message: "Change rejected successfully",
      changeId: id
    })
  } catch (error) {
    console.error('Error in reject change endpoint:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
