import { getUser } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import DashboardNav from "@/components/dashboard-nav"
import OrgSelector from "@/components/org-selector"
import UserNav from "@/components/user-nav"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  const supabase = await createClient()
  let hasOrg = false
  if (user) {
    const { count } = await supabase
      .from("organization_members")
      .select("org_id", { count: "exact", head: true })
      .eq("user_id", user.id)
    hasOrg = (count ?? 0) > 0
  }
  return (
    <main className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex h-16 items-center justify-between py-4 px-8">
          <div className="flex items-center gap-4">
            <OrgSelector />
          </div>
          <UserNav user={
            user ? {
              name: user?.user_metadata?.name || user?.user_metadata?.full_name || "",
              email: user?.email || "",
              image: user?.user_metadata?.avatar_url || "",
            } : undefined
          } />
        </div>
      </header>
      <div className="flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 w-full">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 overflow-y-auto border-r md:sticky md:block">
          <DashboardNav />
        </aside>
        <main className="flex w-full flex-col overflow-hidden">
          {!hasOrg ? (
            <div className="p-8">
              <h2 className="text-xl font-semibold mb-2">Create your first organization</h2>
              <p className="text-sm text-muted-foreground mb-4">You need an organization to continue. You can create up to 2.</p>
              <OrgSelector />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </main>
  )
}
