import { getUser } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import DashboardNav from "@/components/dashboard-nav"
import OrgSelector from "@/components/org-selector"
import UserNav from "@/components/user-nav"
import { SidebarProvider, Sidebar, SidebarContent, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"

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
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarContent>
          <DashboardNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 border-b bg-background">
          <div className="flex h-16 items-center justify-between py-4 px-4 md:px-8">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
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
        <main className="flex-1 flex flex-col min-h-0">
          {!hasOrg ? (
            <div className="p-4 md:p-8">
              <h2 className="text-xl font-semibold mb-2">Create your first organization</h2>
              <p className="text-sm text-muted-foreground mb-4">You need an organization to continue. You can create up to 2.</p>
              <OrgSelector />
            </div>
          ) : (
            children
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
