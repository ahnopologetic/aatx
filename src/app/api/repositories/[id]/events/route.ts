import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_events')
    .select('id,event_name,context,tags,file_path,line_number')
    .eq('repo_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const events = (data || []).map(e => ({
    id: e.id,
    event_name: e.event_name,
    description: e.context,
    type: (e.tags || []).includes('manual') ? 'manual' : 'detected',
    file_path: (e as any).file_path ?? null,
    line_number: (e as any).line_number ?? null,
  }))

  return NextResponse.json({ events })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: repoId } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json() as { eventId: string; event_name?: string; description?: string }
  if (!body?.eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  }

  // Ensure repo belongs to current user
  const { data: repo, error: repoErr } = await supabase
    .from('repos')
    .select('id,user_id')
    .eq('id', repoId)
    .single()
  if (repoErr || !repo || repo.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (typeof body.event_name === 'string') updates.event_name = body.event_name
  if (typeof body.description === 'string') updates.context = body.description

  const { error } = await supabase
    .from('user_events')
    .update(updates)
    .eq('id', body.eventId)
    .eq('repo_id', repoId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: repoId } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { eventIds?: string[]; eventId?: string }
  const ids = Array.isArray(body.eventIds) ? body.eventIds : (body.eventId ? [body.eventId] : [])
  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: 'eventIds required' }, { status: 400 })
  }

  // Ensure repo belongs to current user
  const { data: repo, error: repoErr } = await supabase
    .from('repos')
    .select('id,user_id')
    .eq('id', repoId)
    .single()
  if (repoErr || !repo || repo.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Remove from join table first to avoid FK issues
  const { error: joinErr } = await supabase
    .from('user_event_plans')
    .delete()
    .in('user_event_id', ids)
  if (joinErr) {
    return NextResponse.json({ error: joinErr.message }, { status: 500 })
  }

  const { error } = await supabase
    .from('user_events')
    .delete()
    .in('id', ids)
    .eq('repo_id', repoId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}


