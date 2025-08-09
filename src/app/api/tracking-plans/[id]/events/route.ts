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

  const { data, error } = await supabase
    .from('user_event_plans')
    .select('id, user_event_id, plans!inner(id), user_events!inner(id,event_name,context,repo_id), repos!inner(id,name)')
    .eq('plans.id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Row = {
    user_events: { id: string; event_name: string; context: string | null }
    repos?: { id: string; name: string }
  }
  const events = (data as unknown as Row[] | null)?.map((row) => ({
    id: row.user_events.id,
    event_name: row.user_events.event_name,
    description: row.user_events.context,
    repo: row.repos ? { id: row.repos.id, name: row.repos.name } : null,
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

  const { userEventIds } = await request.json() as { userEventIds: string[] }
  if (!Array.isArray(userEventIds) || userEventIds.length === 0) {
    return NextResponse.json({ error: 'userEventIds required' }, { status: 400 })
  }

  const rows = userEventIds.map((ueid) => ({ id: crypto.randomUUID(), plan_id: id, user_event_id: ueid }))
  const { error } = await supabase.from('user_event_plans').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}


