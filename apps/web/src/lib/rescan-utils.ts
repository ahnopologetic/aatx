import { createClient } from "@/utils/supabase/server"
import {
    type AatxAgentRescanResult,
    type RescanChange,
    type DetectedEvent,
    validateRescanResult
} from "./rescan-schemas"
import { randomUUID } from "crypto"
import { getCurrentCommitHash, getCommitInfo } from "./commit-utils"

/**
 * Process the agent's rescan result and store it in the database
 */
export async function processRescanResult(
    rescanJobId: string,
    agentResult: unknown,
): Promise<AatxAgentRescanResult> {
    const supabase = await createClient()

    try {
        // Validate the agent result
        const validatedResult = validateRescanResult(agentResult)

        // Get the repository ID from the job
        const { data: job } = await supabase
            .from('rescan_jobs')
            .select('repo_id')
            .eq('id', rescanJobId)
            .single()

        if (!job) {
            throw new Error('Rescan job not found')
        }

        // Get previous events for comparison
        const { data: previousEvents } = await supabase
            .from('user_events')
            .select('id, event_name, context, file_path, line_number')
            .eq('repo_id', job.repo_id)

        // Process changes and create rescan_changes records
        const changesToInsert = validatedResult.changes.map(change => ({
            id: randomUUID(),
            rescan_job_id: rescanJobId,
            change_type: change.change_type,
            event_name: change.event_name,
            old_data: change.old_data || null,
            new_data: change.new_data,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }))

        // Insert changes if any
        if (changesToInsert.length > 0) {
            const { error: changesError } = await supabase
                .from('rescan_changes')
                .insert(changesToInsert)

            if (changesError) {
                console.error('Error inserting rescan changes:', changesError)
                throw changesError
            }
        }

        // Create rescan results record
        const { error: resultsError } = await supabase
            .from('rescan_results')
            .insert({
                id: randomUUID(),
                rescan_job_id: rescanJobId,
                total_events_found: validatedResult.summary.total_events_found,
                new_events_found: validatedResult.summary.new_events_found,
                updated_events_found: validatedResult.summary.updated_events_found,
                removed_events_found: validatedResult.summary.removed_events_found,
                scan_summary: validatedResult.summary,
                created_at: new Date().toISOString()
            })

        if (resultsError) {
            console.error('Error inserting rescan results:', resultsError)
            throw resultsError
        }

        // Get current commit information for the repository
        let commitInfo = null
        try {
            const repoPath = `/tmp/repos/${job.repo_id}` // Assuming standard repo path
            const commitHash = getCurrentCommitHash(repoPath)
            if (commitHash) {
                commitInfo = getCommitInfo(repoPath, commitHash)
            }
        } catch (error) {
            console.warn('Failed to get commit info for rescan job:', error)
        }

        // Update job status to completed with commit information
        const { error: completedError } = await supabase
            .from('rescan_jobs')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_commit_hash: commitInfo?.hash || null,
                last_commit_timestamp: commitInfo?.timestamp?.toISOString() || null,
                metadata: {
                    scan_summary: validatedResult.summary,
                    issues: validatedResult.issues,
                    recommendations: validatedResult.recommendations,
                    scan_config: validatedResult.scan_config,
                    commit_info: commitInfo ? {
                        hash: commitInfo.hash,
                        timestamp: commitInfo.timestamp.toISOString()
                    } : undefined
                }
            })
            .eq('id', rescanJobId)

        if (completedError) {
            console.error('Error updating rescan job to completed:', completedError)
            throw completedError
        }

        return validatedResult
    } catch (error) {
        // Update job status to failed
        const { error: failedError } = await supabase
            .from('rescan_jobs')
            .update({
                status: 'failed',
                error_message: error instanceof Error ? error.message : 'Unknown error occurred',
                updated_at: new Date().toISOString()
            })
            .eq('id', rescanJobId)

        if (failedError) {
            console.error('Error updating rescan job to failed:', failedError)
        }

        throw error
    }
}

/**
 * Compare detected events with previous events to identify changes
 */
export function identifyChanges(
    detectedEvents: DetectedEvent[],
    previousEvents: Array<{ id: string; event_name: string; context?: string; file_path?: string; line_number?: number }>
): RescanChange[] {
    const changes: RescanChange[] = []
    const previousEventMap = new Map(previousEvents.map(e => [e.event_name, e]))
    const detectedEventMap = new Map(detectedEvents.map(e => [e.name, e]))

    // Find new events
    for (const detectedEvent of detectedEvents) {
        if (!previousEventMap.has(detectedEvent.name)) {
            changes.push({
                change_type: 'new_event',
                event_name: detectedEvent.name,
                new_data: {
                    name: detectedEvent.name,
                    description: detectedEvent.description,
                    properties: detectedEvent.properties,
                    file_path: detectedEvent.file_path,
                    line_number: detectedEvent.line_number,
                    context: detectedEvent.context,
                    confidence: detectedEvent.confidence,
                    source: detectedEvent.source
                },
                impact: 'medium'
            })
        }
    }

    // Find updated events
    for (const detectedEvent of detectedEvents) {
        const previousEvent = previousEventMap.get(detectedEvent.name)
        if (previousEvent) {
            const hasChanges =
                previousEvent.context !== detectedEvent.description ||
                previousEvent.file_path !== detectedEvent.file_path ||
                previousEvent.line_number !== detectedEvent.line_number

            if (hasChanges) {
                changes.push({
                    change_type: 'updated_event',
                    event_name: detectedEvent.name,
                    old_data: {
                        name: previousEvent.event_name,
                        description: previousEvent.context,
                        file_path: previousEvent.file_path,
                        line_number: previousEvent.line_number
                    },
                    new_data: {
                        name: detectedEvent.name,
                        description: detectedEvent.description,
                        properties: detectedEvent.properties,
                        file_path: detectedEvent.file_path,
                        line_number: detectedEvent.line_number,
                        context: detectedEvent.context,
                        confidence: detectedEvent.confidence,
                        source: detectedEvent.source
                    },
                    reason: 'Event properties or location changed',
                    impact: 'low'
                })
            }
        }
    }

    // Find removed events
    for (const previousEvent of previousEvents) {
        if (!detectedEventMap.has(previousEvent.event_name)) {
            changes.push({
                change_type: 'removed_event',
                event_name: previousEvent.event_name,
                old_data: {
                    name: previousEvent.event_name,
                    description: previousEvent.context,
                    file_path: previousEvent.file_path,
                    line_number: previousEvent.line_number
                },
                new_data: {
                    name: previousEvent.event_name,
                    description: 'Event no longer detected in codebase',
                    properties: []
                },
                reason: 'Event no longer found in repository scan',
                impact: 'high'
            })
        }
    }

    return changes
}

/**
 * Generate a comprehensive prompt for the agent to perform rescan
 */
export function generateRescanPrompt(repositoryUrl: string, rescanJobId: string): string {
    return `Please perform a comprehensive rescan of the repository at ${repositoryUrl}. The rescan job ID is ${rescanJobId}.

Analyze the codebase for analytics events and tracking implementations. Look for:

**Analytics Providers:**
- PostHog (posthog.capture, posthog.identify, etc.)
- Mixpanel (mixpanel.track, mixpanel.identify, etc.)
- Amplitude (amplitude.track, amplitude.identify, etc.)
- Google Analytics (gtag, ga, etc.)
- Custom tracking implementations

**What to Detect:**
- Event names and their contexts
- Event properties and their types
- File locations and line numbers where events are defined
- Event descriptions and documentation
- Confidence levels for each detection

**Analysis Requirements:**
- Compare with previous scans to identify changes
- Provide detailed scan summary with statistics
- Include any issues or warnings encountered
- Offer recommendations for improvement
- Categorize changes by impact level

**Output Format:**
Return a structured analysis with:
1. Complete scan summary with statistics
2. All detected events with full details
3. Changes compared to previous scans
4. Any issues or warnings
5. Recommendations for the codebase

Please be thorough and accurate in your analysis.`
}

/**
 * Get rescan job status and details
 */
export async function getRescanJobStatus(jobId: string) {
    const supabase = await createClient()

    const { data: job, error } = await supabase
        .from('rescan_jobs')
        .select(`
      id,
      status,
      started_at,
      completed_at,
      error_message,
      metadata,
      rescan_results(
        total_events_found,
        new_events_found,
        updated_events_found,
        removed_events_found
      )
    `)
        .eq('id', jobId)
        .single()

    if (error) {
        throw error
    }

    return job
}

/**
 * Get pending changes for a repository
 */
export async function getPendingChanges(repositoryId: string) {
    const supabase = await createClient()

    const { data: changes, error } = await supabase
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
        .eq('rescan_jobs.repo_id', repositoryId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    if (error) {
        throw error
    }

    return changes
}
