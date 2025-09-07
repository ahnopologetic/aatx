import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { triggerWebhookRescan } from "@/lib/webhook-rescan-utils"
import crypto from "crypto"

interface GitHubWebhookPayload {
  ref: string
  repository: {
    id: number
    name: string
    full_name: string
    html_url: string
    clone_url: string
  }
  commits: Array<{
    id: string
    message: string
    timestamp: string
    author: {
      name: string
      email: string
    }
  }>
  head_commit: {
    id: string
    message: string
    timestamp: string
    author: {
      name: string
      email: string
    }
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    
    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET
    if (webhookSecret && signature) {
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex')}`
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    const data: GitHubWebhookPayload = JSON.parse(payload)
    
    // Only process push events to main/master branch
    if (!data.ref.includes('refs/heads/main') && !data.ref.includes('refs/heads/master')) {
      return NextResponse.json({ message: "Ignored - not main/master branch" })
    }

    const supabase = await createClient()

    // Find repository by GitHub URL or name
    const { data: repo, error: repoError } = await supabase
      .from('repos')
      .select('id, org_id, name, url')
      .or(`url.eq.${data.repository.html_url},url.eq.${data.repository.clone_url},name.eq.${data.repository.name}`)
      .single()

    if (repoError || !repo) {
      console.log(`Repository not found for webhook: ${data.repository.full_name}`)
      return NextResponse.json({ message: "Repository not found in system" })
    }

    // Check if webhook auto-rescan is enabled for this repository
    const { data: webhookConfig } = await supabase
      .from('repos')
      .select('metadata')
      .eq('id', repo.id)
      .single()

    const autoRescanEnabled = webhookConfig?.metadata?.webhook_auto_rescan === true
    
    if (!autoRescanEnabled) {
      console.log(`Auto-rescan disabled for repository: ${repo.name}`)
      return NextResponse.json({ message: "Auto-rescan disabled for this repository" })
    }

    // Trigger webhook rescan
    const webhookPayload = {
      repository: data.repository,
      head_commit: data.head_commit,
      commits_count: data.commits.length
    }

    const result = await triggerWebhookRescan(repo.id, webhookPayload)

    if (!result.success) {
      console.error(`Failed to trigger webhook rescan for ${repo.name}:`, result.error)
      return NextResponse.json({ 
        error: result.error || "Failed to trigger rescan",
        message: "Webhook rescan failed"
      }, { status: 500 })
    }

    console.log(`Webhook rescan job ${result.jobId} created for repository ${repo.name}`)

    return NextResponse.json({
      message: "Webhook rescan triggered successfully",
      jobId: result.jobId,
      repository: repo.name
    })

  } catch (error) {
    console.error('Error processing GitHub webhook:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-hub-signature-256',
    },
  })
}
