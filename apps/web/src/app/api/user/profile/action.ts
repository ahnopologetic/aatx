import { getUser } from "@/lib/auth";
import { Database } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

export async function getProfile(): Promise<Database["public"]["Tables"]["profiles"]["Row"]> {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) {
        throw new Error("User not found")
    }

    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (error) {
        throw error
    }

    return profile
}