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
      .select('id, org_id, meta')
      .eq('id', id)
      .eq('org_id', profile.current_org_id)
      .single()

    if (!repo) {
      return NextResponse.json({ error: "Repository not found or access denied" }, { status: 404 })
    }

    // Defensive check: repo.meta may be a string, number, boolean, array, or object.
    // We only want to access webhook_auto_rescan if meta is an object.
    let autoRescanEnabled = false
    if (repo.meta && typeof repo.meta === 'object' && !Array.isArray(repo.meta)) {
      autoRescanEnabled = (repo.meta as Record<string, unknown>).webhook_auto_rescan === true
    }

    return NextResponse.json({
      autoRescanEnabled
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
      .select('id, org_id, meta')
      .eq('id', id)
      .eq('org_id', profile.current_org_id)
      .single()

    if (!repo) {
      return NextResponse.json({ error: "Repository not found or access denied" }, { status: 404 })
    }

    // Update repository metadata with webhook configuration
    const updatedMetadata = {
      ...repo.meta as Record<string, unknown>,
      webhook_auto_rescan: autoRescanEnabled
    }

    const { error: updateError } = await supabase
      .from('repos')
      .update({ meta: updatedMetadata })
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
