'use server'
import { createClient } from '@/utils/supabase/server'

export async function signInWithGithub(url: string) {
    const supabase = await createClient()
    console.log("url", url)
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: `${url}/api/auth/callback`,
        },
    })
    if (error) {
        console.error("Error signing in:", error)
        return { error: error.message, success: false }
    }
    console.log("Signed in with GitHub")
    return { success: true }
}