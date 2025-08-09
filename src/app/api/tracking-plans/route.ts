import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('user_id', session.user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ trackingPlans: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { name, description }: { name: string; description?: string } = await request.json()
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const now = new Date().toISOString()
  const insertPlan = {
    id: randomUUID(),
    name,
    description: description ?? null,
    user_id: session.user.id,
    version: '1.0.0',
    status: 'active',
    import_source: null,
    created_at: now,
    updated_at: now,
  }
  const { data, error } = await supabase.from('plans').insert(insertPlan).select('*').single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ plan: data })
}
