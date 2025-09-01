import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { randomUUID } from "crypto"
import { mastra } from "~mastra/index"
import z from "zod"

const generateAndProcessChanges = async (rescanJobId: string) => {
  const supabase = await createClient()
  const { data: rescanJob, error: rescanJobError } = await supabase
    .from('rescan_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', rescanJobId)

  if (rescanJobError) {
    console.error('Error updating rescan job:', rescanJobError)
    return
  }

  // const agent = mastra.getAgent("aatxAgent")
  // const changes = await agent.generate<z.ZodType<Change[]>>([{
  //   role: "user",
  //   content: `Repository URL: ${rescanJobId}`
  // }])
  // TODO: Process changes
  setTimeout(() => {
    console.log("Changes generated")
  }, 10000)

  const { error: rescanJobCompletedError } = await supabase
    .from('rescan_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', rescanJobId)

  if (rescanJobCompletedError) {
    console.error('Error updating rescan job:', rescanJobCompletedError)
    return
  }

  return []
}

export async function POST(
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

    // Check if there's already a running scan
    const { data: runningJob } = await supabase
      .from('rescan_jobs')
      .select('id')
      .eq('repo_id', id)
      .eq('status', 'running')
      .single()

    if (runningJob) {
      return NextResponse.json({ error: "A scan is already running for this repository" }, { status: 409 })
    }

    // Create new rescan job
    const rescanJobId = randomUUID()
    const { error: jobError } = await supabase
      .from('rescan_jobs')
      .insert({
        id: rescanJobId,
        repo_id: id,
        org_id: profile.current_org_id,
        status: 'pending',
        triggered_by: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (jobError) {
      console.error('Error creating rescan job:', jobError)
      return NextResponse.json({ error: "Failed to create rescan job" }, { status: 500 })
    }

    // TODO: Trigger background job processing
    // This would typically involve:
    // 1. Adding the job to a queue (Redis/Celery)
    // 2. Having a worker process pick it up
    // 3. Running the actual scan
    // 4. Updating the job status and creating results/changes
    generateAndProcessChanges(rescanJobId)

    // For now, we'll simulate the job being queued
    console.log(`Rescan job ${rescanJobId} created for repository ${repo.name}`)

    return NextResponse.json({
      message: "Rescan job created successfully",
      jobId: rescanJobId,
      status: "pending"
    })
  } catch (error) {
    console.error('Error in rescan endpoint:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
