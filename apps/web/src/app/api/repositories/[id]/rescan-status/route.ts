import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(
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

    // Get latest rescan job using the helper function
    const { data: latestJob, error: latestJobError } = await supabase
      .rpc('get_latest_rescan_job', { repo_uuid: id })

    // Get pending changes count
    const { data: pendingCount, error: pendingCountError } = await supabase
      .rpc('get_pending_changes_count', { repo_uuid: id })

    // Check if there's a running scan
    const { data: runningJob, error: runningJobError } = await supabase
      .from('rescan_jobs')
      .select('id, status')
      .eq('repo_id', id)
      .eq('status', 'running')
      .single()

    if (latestJobError) {
      console.error('Error fetching latest rescan job:', latestJobError)
    }

    if (pendingCountError) {
      console.error('Error fetching pending changes count:', pendingCountError)
    }

    if (runningJobError && runningJobError.code !== 'PGRST116') {
      console.error('Error checking running job:', runningJobError)
    }

    const response = {
      lastScanDate: latestJob?.[0]?.completed_at || null,
      pendingChanges: pendingCount || 0,
      isScanning: !!runningJob,
      lastScanJob: latestJob?.[0] || null
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in rescan status endpoint:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
