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
    .select('id,event_name,context,tags')
    .eq('repo_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const events = (data || []).map(e => ({
    id: e.id,
    event_name: e.event_name,
    description: e.context,
    type: (e.tags || []).includes('manual') ? 'manual' : 'detected',
  }))

  return NextResponse.json({ events })
}


