import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Get user's current organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_org_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.current_org_id) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 })
  }

  const { event_name, description, repo_id } = await request.json() as {
    event_name: string
    description?: string
    repo_id?: string
  }

  if (!event_name?.trim()) {
    return NextResponse.json({ error: 'Event name is required' }, { status: 400 })
  }

  // If repo_id is provided, verify it belongs to the current organization
  if (repo_id) {
    const { data: repo } = await supabase
      .from('repos')
      .select('id')
      .eq('id', repo_id)
      .eq('org_id', profile.current_org_id)
      .single()

    if (!repo) {
      return NextResponse.json({ error: "Repository not found or access denied" }, { status: 404 })
    }
  }

  // Create the user event
  const eventId = crypto.randomUUID()
  const { data: userEvent, error } = await supabase
    .from('user_events')
    .insert({
      id: eventId,
      event_name: event_name.trim(),
      description: description?.trim() || null,
      repo_id: repo_id || null,
      status: 'new',
      properties: [],
      tags: ['manual']
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ event: userEvent })
}
