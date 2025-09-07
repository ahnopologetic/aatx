import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

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

    // Verify repository belongs to current organization
    const { data: repo } = await supabase
      .from('repos')
      .select('id, org_id')
      .eq('id', id)
      .eq('org_id', profile.current_org_id)
      .single()

    if (!repo) {
      return NextResponse.json({ error: "Repository not found or access denied" }, { status: 404 })
    }

    // Build query for rescan changes
    let query = supabase
      .from('rescan_changes')
      .select(`
        id,
        change_type,
        event_name,
        old_data,
        new_data,
        status,
        created_at,
        rescan_jobs!inner(id, repo_id)
      `)
      .eq('rescan_jobs.repo_id', id)

    // Add status filter if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: changes, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching rescan changes:', error)
      return NextResponse.json({ error: "Failed to fetch rescan changes" }, { status: 500 })
    }

    return NextResponse.json({ changes: changes || [] })
  } catch (error) {
    console.error('Error in rescan changes endpoint:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
