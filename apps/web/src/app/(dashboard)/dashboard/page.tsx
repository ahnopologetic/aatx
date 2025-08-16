import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Overview } from "@/components/overview"
import { RecentActivity } from "@/components/recent-activity"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/login')
  }
  const { data: { session } } = await supabase.auth.getSession()

  let repoCount = 0
  let planCount = 0
  let eventCount = 0
  const prPlaceholder = "—" // Not tracked yet
  const activityItems: { title: string; description?: string; timeAgo?: string }[] = []

  if (session?.user?.id) {
    const userId = session.user.id

    // Get user's current organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_org_id')
      .eq('id', userId)
      .single()

    if (profile?.current_org_id) {
      const orgId = profile.current_org_id

      const [reposHead, plansHead] = await Promise.all([
        supabase.from('repos').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('plans').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      ])

      repoCount = reposHead.count ?? 0
      planCount = plansHead.count ?? 0

      const [{ data: repoIds }, { data: recentRepos }, { data: recentPlans }] = await Promise.all([
        supabase.from('repos').select('id').eq('org_id', orgId),
        supabase.from('repos').select('name, description, updated_at, created_at').eq('org_id', orgId).order('updated_at', { ascending: false }).limit(5),
        supabase.from('plans').select('name, version, updated_at, created_at').eq('org_id', orgId).order('updated_at', { ascending: false }).limit(5),
      ])
      
      if (Array.isArray(repoIds) && repoIds.length > 0) {
        const ids = repoIds.map((r) => r.id)
        const eventsHead = await supabase
          .from('user_events')
          .select('*', { count: 'exact', head: true })
          .in('repo_id', ids)
        eventCount = eventsHead.count ?? 0
      }
      // Build recent activity list (repos + plans)
      if (Array.isArray(recentRepos)) {
        for (const repo of recentRepos) {
          const when = repo.updated_at ?? repo.created_at ?? null
          activityItems.push({
            title: 'Repository Updated',
            description: `${repo.name}${repo.description ? ` - ${repo.description}` : ''}`,
            timeAgo: when ? new Date(when).toLocaleString() : undefined,
          })
        }
      }
      if (Array.isArray(recentPlans)) {
        for (const plan of recentPlans) {
          const when = plan.updated_at ?? plan.created_at ?? null
          activityItems.push({
            title: 'Tracking Plan Updated',
            description: `${plan.name}${plan.version ? ` - Version ${plan.version}` : ''}`,
            timeAgo: when ? new Date(when).toLocaleString() : undefined,
          })
        }
      }
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Dashboard" text="Overview of your analytics and tracking plans." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Repositories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repoCount}</div>
            <p className="text-xs text-muted-foreground">Connected to Supabase</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tracking Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planCount}</div>
            <p className="text-xs text-muted-foreground">Connected to Supabase</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventCount}</div>
            <p className="text-xs text-muted-foreground">Connected to Supabase</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PRs Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prPlaceholder}</div>
            <p className="text-xs text-muted-foreground">Not tracked yet</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Recent repository scans and tracking plan updates</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivity items={activityItems} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
