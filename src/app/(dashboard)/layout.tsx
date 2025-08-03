import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import DashboardNav from "@/components/dashboard-nav"
import OrgSelector from "@/components/org-selector"
import UserNav from "@/components/user-nav"

export default async function DashboardLayout({ children }) {
  try {
    const session = await getSession()

    if (!session) {
      redirect("/login")
    }

    return (
      <main>
        <header className="sticky top-0 z-40 border-b bg-background">
          <div className="container flex h-16 items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <OrgSelector />
            </div>
            <UserNav user={session.user} />
          </div>
        </header>
        <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
          <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 overflow-y-auto border-r md:sticky md:block">
            <DashboardNav />
          </aside>
          <main className="flex w-full flex-col overflow-hidden">{children}</main>
        </div>
      </main>
    )
  } catch (error) {
    console.error("Session error in dashboard:", error)
    redirect("/login")
  }
}
