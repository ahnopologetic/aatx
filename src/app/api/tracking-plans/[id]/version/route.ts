import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

function bumpVersion(version: string | null | undefined): string {
  if (!version) return '1.0.0'
  const parts = version.split('.').map((p) => parseInt(p, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '1.0.0'
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Load plan
  const { data: plan, error: planErr } = await supabase.from('plans').select('*').eq('id', id).single()
  if (planErr || !plan) return NextResponse.json({ error: planErr?.message || 'Plan not found' }, { status: 404 })

  const newVersion = bumpVersion(plan.version)
  const { error } = await supabase.from('plans').update({ version: newVersion, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ version: newVersion })
}


