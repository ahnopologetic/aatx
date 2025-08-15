import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase.from('repos').select('*').eq('id', id).single()
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
}