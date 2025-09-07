import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        // Get user's current organization
        const { data: profile } = await supabase
            .from('profiles')
            .select('current_org_id')
            .eq('id', session.user.id)
            .single()

        if (!profile?.current_org_id) {
            return NextResponse.json({ error: "No organization selected" }, { status: 400 })
        }

        // Verify repository belongs to current organization
        const { data: repo } = await supabase
            .from('repos')
            .select('id, org_id')
            .eq('id', id)
            .eq('org_id', profile.current_org_id)
            .single()

        if (!repo) {
            return NextResponse.json({ error: "Repository not found or access denied" }, { status: 404 })
        }

        // Get rescan history using the helper function
        const { data: jobs, error } = await supabase
            .rpc('get_rescan_history', { repo_uuid: id })

        if (error) {
            console.error('Error fetching rescan history:', error)
            return NextResponse.json({ error: "Failed to fetch rescan history" }, { status: 500 })
        }

        return NextResponse.json({ jobs: jobs || [] })
    } catch (error) {
        console.error('Error in rescan jobs endpoint:', error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
