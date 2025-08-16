import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createClient()
    
    // Authentication check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's current organization
    const { data: profile } = await supabase
        .from('profiles')
        .select('current_org_id')
        .eq('id', session.user.id)
        .single()

    if (!profile?.current_org_id) {
        return NextResponse.json({ error: "No organization selected" }, { status: 400 })
    }

    // Get repository and verify organization access
    const { data, error } = await supabase
        .from('repos')
        .select('*')
        .eq('id', id)
        .eq('org_id', profile.current_org_id)
        .single()
        
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    if (!data) {
        return NextResponse.json({ error: "Repository not found or access denied" }, { status: 404 })
    }
    
    return NextResponse.json(data)
}