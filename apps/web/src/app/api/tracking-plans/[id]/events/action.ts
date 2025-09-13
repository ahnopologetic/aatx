import { getUser } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

export async function getUserEvents(planId: string) {
    const supabase = await createClient()
    const user = await getUser()
    // Get user's current organization
    const { data: profile } = await supabase
        .from('profiles')
        .select('current_org_id')
        .eq('id', user?.id ?? '')
        .single()

    if (!profile?.current_org_id) {
        throw new Error("No organization selected")
    }

    // Verify plan belongs to current organization
    const { data: plan } = await supabase
        .from('plans')
        .select('id')
        .eq('id', planId)
        .eq('org_id', profile.current_org_id)
        .single()

    if (!plan) {
        throw new Error("Tracking plan not found or access denied")
    }

    const { data, error } = await supabase
        .from('user_event_plans')
        .select('id, user_event_id, plans!inner(id), user_events!inner(id,event_name,context,description,properties,status,repo_id,file_path,line_number,repos(id,name))')
        .eq('plans.id', planId)

    if (error) throw error

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

    return events
}