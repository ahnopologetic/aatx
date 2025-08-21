import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

// Plan events are stored via join table user_event_plans

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  // Verify plan belongs to current organization
  const { data: plan } = await supabase
    .from('plans')
    .select('id')
    .eq('id', id)
    .eq('org_id', profile.current_org_id)
    .single()

  if (!plan) {
    return NextResponse.json({ error: "Tracking plan not found or access denied" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('user_event_plans')
    .select('id, user_event_id, plans!inner(id), user_events!inner(id,event_name,context,description,properties,status,repo_id,file_path,line_number,repos(id,name))')
    .eq('plans.id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Row = {
    user_events: {
      id: string
      event_name: string
      context: string | null
      description: string | null
      properties: any | null
      status: string | null
      file_path: string | null
      line_number: number | null
      repos?: { id: string; name: string } | null
    }
  }
  const events = (data as unknown as Row[] | null)?.map((row) => ({
    id: row.user_events.id,
    event_name: row.user_events.event_name,
    description: row.user_events.description || row.user_events.context,
    properties: Array.isArray(row.user_events.properties) 
      ? row.user_events.properties 
      : (row.user_events.properties ? JSON.parse(JSON.stringify(row.user_events.properties)) : []),
    status: row.user_events.status,
    file_path: row.user_events.file_path,
    line_number: row.user_events.line_number,
    repo: row.user_events.repos ? { id: row.user_events.repos.id, name: row.user_events.repos.name } : null,
  })) ?? []

  return NextResponse.json({ events })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  // Verify plan belongs to current organization
  const { data: plan } = await supabase
    .from('plans')
    .select('id')
    .eq('id', id)
    .eq('org_id', profile.current_org_id)
    .single()

  if (!plan) {
    return NextResponse.json({ error: "Tracking plan not found or access denied" }, { status: 404 })
  }

    const { userEventIds } = await request.json() as { userEventIds: string[] }
  if (!Array.isArray(userEventIds) || userEventIds.length === 0) {
    return NextResponse.json({ error: 'userEventIds required' }, { status: 400 })
  }

  // Verify all user events exist and belong to the organization (via repos)
  const { data: userEvents } = await supabase
    .from('user_events')
    .select('id, repo_id, repos(org_id)')
    .in('id', userEventIds)

  if (!userEvents || userEvents.length !== userEventIds.length) {
    return NextResponse.json({ error: 'One or more events not found' }, { status: 404 })
  }

  // Check if any events belong to repos outside the current organization
  const invalidEvents = userEvents.filter(event => 
    event.repo_id && event.repos && event.repos.org_id !== profile.current_org_id
  )
  
  if (invalidEvents.length > 0) {
    return NextResponse.json({ error: 'Access denied to some events' }, { status: 403 })
  }

  // Create plan-event associations, avoiding duplicates
  const existingAssociations = await supabase
    .from('user_event_plans')
    .select('user_event_id')
    .eq('plan_id', id)
    .in('user_event_id', userEventIds)

  const existingEventIds = new Set(existingAssociations.data?.map(a => a.user_event_id) || [])
  const newEventIds = userEventIds.filter(id => !existingEventIds.has(id))

  if (newEventIds.length > 0) {
    const rows = newEventIds.map((ueid) => ({ 
      id: crypto.randomUUID(), 
      plan_id: id, 
      user_event_id: ueid 
    }))
    
    const { error } = await supabase.from('user_event_plans').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ 
    ok: true, 
    added: newEventIds.length,
    skipped: userEventIds.length - newEventIds.length 
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  // Verify plan belongs to current organization
  const { data: plan } = await supabase
    .from('plans')
    .select('id')
    .eq('id', id)
    .eq('org_id', profile.current_org_id)
    .single()

  if (!plan) {
    return NextResponse.json({ error: "Tracking plan not found or access denied" }, { status: 404 })
  }

  const { eventId, updates } = await request.json() as {
    eventId: string;
    updates: {
      event_name?: string;
      description?: string;
      properties?: any;
      status?: string;
    }
  }

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  }

  // Verify the event belongs to this plan
  const { data: eventPlan } = await supabase
    .from('user_event_plans')
    .select('user_event_id')
    .eq('plan_id', id)
    .eq('user_event_id', eventId)
    .single()

  if (!eventPlan) {
    return NextResponse.json({ error: 'Event not found in this plan' }, { status: 404 })
  }

  // Update the user_event
  const { error: updateError } = await supabase
    .from('user_events')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      status: updates.status || 'updated' // Mark as updated if status not explicitly provided
    })
    .eq('id', eventId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}



export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { eventId } = await request.json() as { eventId: string }
  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  }

  const { error } = await supabase.from('user_event_plans').delete().eq('plan_id', id).eq('user_event_id', eventId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}