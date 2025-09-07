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

/**
 * Trigger a rescan from a webhook event
 */
export async function triggerWebhookRescan(
  repositoryId: string,
  webhookPayload: any
): Promise<{ jobId: string; success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Get repository information
    const { data: repo, error: repoError } = await supabase
      .from('repos')
      .select('id, org_id, name, url')
      .eq('id', repositoryId)
      .single()

    if (repoError || !repo) {
      throw new Error('Repository not found')
    }

    // Check if there's already a running scan
    const { data: runningJob } = await supabase
      .from('rescan_jobs')
      .select('id')
      .eq('repo_id', repositoryId)
      .eq('status', 'running')
      .single()

    if (runningJob) {
      return {
        jobId: runningJob.id,
        success: false,
        error: 'Scan already in progress'
      }
    }

    // Create new rescan job
    const rescanJobId = randomUUID()
    const { error: jobError } = await supabase
      .from('rescan_jobs')
      .insert({
        id: rescanJobId,
        repo_id: repositoryId,
        org_id: repo.org_id,
        status: 'pending',
        triggered_by: null, // Webhook triggered
        metadata: {
          trigger_type: 'webhook',
          webhook_payload: webhookPayload
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (jobError) {
      throw new Error('Failed to create rescan job')
    }

    // Start the rescan process asynchronously
    generateAndProcessChanges(rescanJobId, repo.url || '').catch(error => {
      console.error('Webhook rescan process failed:', error)
    })

    return {
      jobId: rescanJobId,
      success: true
    }

  } catch (error) {
    console.error('Error triggering webhook rescan:', error)
    return {
      jobId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Process webhook rescan (similar to generateAndProcessChanges but for webhooks)
 */
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
      console.log(`Webhook rescan job ${rescanJobId} completed successfully`);
      return processedResult;
    } catch (error) {
      console.error("Error processing webhook rescan result:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error generating webhook rescan result:", error);

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
      console.error("Error updating webhook rescan job to failed:", failedError);
    }

    throw error;
  }
}
