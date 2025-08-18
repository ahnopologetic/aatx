import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ProfileForm } from "@/components/profile-form"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) {
    redirect('/login')
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Profile" text="Manage your account settings and preferences." />
      <div className="grid gap-10">
        <ProfileForm profile={profile} />
      </div>
    </DashboardShell>
  )
}
