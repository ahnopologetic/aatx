import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

type BumpLevel = 'major' | 'minor' | 'patch'

function bumpVersion(version: string | null | undefined, level: BumpLevel = 'patch'): string {
  if (!version) {
    return level === 'major' ? '1.0.0' : level === 'minor' ? '0.1.0' : '0.0.1'
  }
  const parts = version.split('.').map((p) => parseInt(p, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '1.0.0'
  const [maj, min, pat] = parts
  if (level === 'major') return `${maj + 1}.0.0`
  if (level === 'minor') return `${maj}.${min + 1}.0`
  return `${maj}.${min}.${pat + 1}`
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

  const body = await request.json().catch(() => ({})) as { level?: BumpLevel }
  const newVersion = bumpVersion(plan.version, body.level ?? 'patch')
  const { error } = await supabase.from('plans').update({ version: newVersion, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ version: newVersion })
}


