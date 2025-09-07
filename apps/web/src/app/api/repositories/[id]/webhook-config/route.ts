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
      .select('id, org_id, metadata')
      .eq('id', id)
      .eq('org_id', profile.current_org_id)
      .single()

    if (!repo) {
      return NextResponse.json({ error: "Repository not found or access denied" }, { status: 404 })
    }

    return NextResponse.json({
      autoRescanEnabled: repo.metadata?.webhook_auto_rescan === true
    })

  } catch (error) {
    console.error('Error fetching webhook config:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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
    const { autoRescanEnabled } = await request.json()

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
      .select('id, org_id, metadata')
      .eq('id', id)
      .eq('org_id', profile.current_org_id)
      .single()

    if (!repo) {
      return NextResponse.json({ error: "Repository not found or access denied" }, { status: 404 })
    }

    // Update repository metadata with webhook configuration
    const updatedMetadata = {
      ...repo.metadata,
      webhook_auto_rescan: autoRescanEnabled
    }

    const { error: updateError } = await supabase
      .from('repos')
      .update({ metadata: updatedMetadata })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating webhook config:', updateError)
      return NextResponse.json({ error: "Failed to update webhook configuration" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Webhook configuration updated successfully",
      autoRescanEnabled
    })

  } catch (error) {
    console.error('Error updating webhook config:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
