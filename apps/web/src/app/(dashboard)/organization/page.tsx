import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { OrganizationManager } from "@/components/organization-manager"

export default async function OrganizationPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Get user's current organization and role
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_org_id")
    .eq("id", session.user.id)
    .single()

  if (!profile?.current_org_id) {
    redirect("/dashboard")
  }

  // Get user's role in current organization
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", profile.current_org_id)
    .eq("user_id", session.user.id)
    .single()

  if (!membership) {
    redirect("/dashboard")
  }

  // Get organization details
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, created_at")
    .eq("id", profile.current_org_id)
    .single()

  if (!organization) {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization members, roles, and invitations.
          </p>
        </div>
        
        <OrganizationManager 
          organization={organization}
          currentUserRole={membership.role}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  )
}
