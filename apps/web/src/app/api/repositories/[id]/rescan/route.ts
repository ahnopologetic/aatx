import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { randomUUID } from "crypto"
import { mastra } from "~mastra/index"
import {
  AatxAgentRescanResultSchema
} from "@/lib/rescan-schemas"
import {
  processRescanResult,
  generateRescanPrompt
} from "@/lib/rescan-utils"

const generateAndProcessChanges = async (rescanJobId: string, repositoryUrl: string) => {
  const supabase = await createClient()

  try {
    // Update job status to running
    const { error: rescanJobError } = await supabase
      .from('rescan_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', rescanJobId)

    if (rescanJobError) {
      console.error('Error updating rescan job to running:', rescanJobError)
      throw rescanJobError
    }

    // Get the agent and generate rescan result
    const agent = mastra.getAgent("aatxAgent")
    const prompt = generateRescanPrompt(repositoryUrl, rescanJobId)

    const result = await agent.generate(
      [
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        output: AatxAgentRescanResultSchema,
      }
    );
    const resultObject = result.object
    try {
      const processedResult = await processRescanResult(rescanJobId, resultObject);
      console.log(`Rescan job ${rescanJobId} completed successfully`);
      return processedResult;
    } catch (error) {
      console.error("Error processing rescan result:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error generating rescan result:", error);

    // Update job status to failed
    const { error: failedError } = await supabase
      .from("rescan_jobs")
      .update({
        status: "failed",
        error_message:
          error instanceof Error ? error.message : "Unknown error occurred",
        updated_at: new Date().toISOString(),
      })
      .eq("id", rescanJobId);

    if (failedError) {
      console.error("Error updating rescan job to failed:", failedError);
    }

    throw error;
  }
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

    // Start the rescan process asynchronously
    generateAndProcessChanges(rescanJobId, repo.url || '').catch(error => {
      console.error('Background rescan process failed:', error)
    })

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
