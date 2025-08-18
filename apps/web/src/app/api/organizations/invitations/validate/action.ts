import { createClient } from "@/utils/supabase/server"

export async function validateInvitation(token: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('organization_invitations').select('*').eq('token', token).single()
    if (error) {
        return { error: error.message }
    }
    return data
}