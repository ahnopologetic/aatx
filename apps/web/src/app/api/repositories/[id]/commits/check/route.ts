import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { checkRepositoryNeedsRescan } from "@/lib/commit-utils"

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
      .select('id, org_id, name, url')
      .eq('id', id)
      .eq('org_id', profile.current_org_id)
      .single()

    if (!repo) {
      return NextResponse.json({ error: "Repository not found or access denied" }, { status: 404 })
    }

    // Get the latest completed rescan job to get last scan commit info
    const { data: latestJob, error: jobError } = await supabase
      .from('rescan_jobs')
      .select('id, completed_at, metadata')
      .eq('repo_id', id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    if (jobError && jobError.code !== 'PGRST116') {
      console.error('Error fetching latest rescan job:', jobError)
      return NextResponse.json({ error: "Failed to fetch rescan history" }, { status: 500 })
    }

    // Extract commit hash from metadata if available
    const metadata = latestJob?.metadata as any
    const lastCommitHash = metadata?.commit_info?.hash

    // Check if repository needs rescan
    const commitComparison = await checkRepositoryNeedsRescan(
      id,
      lastCommitHash,
      latestJob?.completed_at ? new Date(latestJob.completed_at) : undefined
    )

    if (!commitComparison) {
      return NextResponse.json({ 
        error: "Failed to check repository commits",
        needsRescan: true, // Default to true if we can't check
        reason: "Unable to access repository"
      }, { status: 500 })
    }

    return NextResponse.json({
      needsRescan: commitComparison.hasChanges,
      currentCommit: commitComparison.currentCommit,
      lastScanCommit: commitComparison.lastScanCommit,
      daysSinceLastScan: commitComparison.daysSinceLastScan,
      reason: commitComparison.hasChanges 
        ? "Repository has new commits since last scan"
        : "Repository is up to date"
    })

  } catch (error) {
    console.error('Error in commit check endpoint:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
