"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { mastra } from "~mastra/index"

export async function rescanRepository(repository: string) {
    await mastra.getAgent("aatxAgent").generate(`Rescan the repository ${repository}`)
}

export async function deleteRepository(repository: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('repos').delete().eq('name', repository)
    if (error) {
        throw new Error(error.message)
    }
    revalidatePath(`/repositories`)
}

export async function getRepositoryEvents(repoId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('user_events').select('id,event_name,context,tags').eq('repo_id', repoId)
    if (error) {
        throw new Error(error.message)
    }
    return data
}