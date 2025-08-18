import { notFound } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { Database } from "@/lib/database.types"
import RepositoryDetailView from "@/components/repository-detail-view"

export default async function RepositoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: repository, error } = await supabase.from('repos').select('*').eq('id', id).single()
  if (error) {
    notFound()
  }

  return (
    <RepositoryDetailView repository={repository as Database["public"]["Tables"]["repos"]["Row"]} />
  )
}
