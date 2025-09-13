import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { randomUUID } from "crypto"
import { PostHogClient } from "@/lib/analytics/posthog";


export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get user's current organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_org_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.current_org_id) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 })
  }

  // Get repositories for the current organization
  const { data: repositories, error } = await supabase
    .from('repos')
    .select('*')
    .eq('org_id', profile.current_org_id)
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ repositories })
}

type EventPayload = {
  name: string;
  description?: string;
  properties?: Record<string, unknown>;
  implementation?: { path: string; line: number; function?: string; destination?: string }[];
  isNew?: boolean;
};

type CreateRepoPayload = {
  repositoryUrl: string;
  analyticsProviders: string[];
  foundPatterns: string[];
  clonedPath: string;
  events: EventPayload[];
};

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get user's current organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_org_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.current_org_id) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 })
  }

  const { repositoryUrl, analyticsProviders: _analyticsProviders, events, foundPatterns, clonedPath } = (await request.json()) as CreateRepoPayload

  try {
    // Create repo row
    const repoName = new URL(repositoryUrl).pathname.replace(/^\//, "").split("/").slice(0, 2).join("/")
    const insertRepo = {
      id: randomUUID(),
      name: repoName,
      url: repositoryUrl,
      user_id: session.user.id, // Keep for backward compatibility/audit trail
      org_id: profile.current_org_id, // Use current organization
      description: `${Array.isArray(events) ? events.length : 0} events detected`,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      label: null,
      session_id: null,
      meta: {
        foundPatterns,
        clonedPath,
      }
    }
    const { data: repo, error: repoError } = await supabase.from('repos').insert(insertRepo).select('*').single()
    if (repoError) {
      return NextResponse.json({ error: repoError.message }, { status: 500 })
    }

    // Optionally insert events
    if (Array.isArray(events) && events.length > 0) {
      const eventRows = events.map((e: EventPayload) => ({
        id: randomUUID(),
        event_name: e.name,
        context: e.description ?? null,
        file_path: Array.isArray(e.implementation) && e.implementation[0]?.path ? e.implementation[0].path : null,
        line_number: Array.isArray(e.implementation) && e.implementation[0]?.line ? e.implementation[0].line : null,
        repo_id: repo.id,
        tags: e.isNew ? ['manual'] : ['detected'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
      const { error: eventsError } = await supabase.from('user_events').insert(eventRows)
      if (eventsError) {
        return NextResponse.json({ error: eventsError.message }, { status: 500 })
      }
    }

        const posthog = PostHogClient();
    posthog.capture({
      distinctId: session.user.id,
      event: 'repository: added',
      properties: {
        repository_id: repo.id,
      }
    });
    await posthog.shutdown();
return NextResponse.json({ repository: repo })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
