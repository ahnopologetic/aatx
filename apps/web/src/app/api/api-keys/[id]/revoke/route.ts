import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's current organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_org_id')
    .eq('id', session.user.id)
    .single();

  if (!profile?.current_org_id) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }

  // Check if user is an admin of the organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', profile.current_org_id)
    .eq('user_id', session.user.id)
    .single();

  if (membership?.role !== 'admin') {
    return NextResponse.json({ error: "Only organization admins can revoke API keys" }, { status: 403 });
  }

  // Verify the API key belongs to the current organization
  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('id')
    .eq('id', params.id)
    .eq('org_id', profile.current_org_id)
    .single();

  if (!apiKey) {
    return NextResponse.json({ error: "API key not found or access denied" }, { status: 404 });
  }

  // Revoke the API key by setting revoked_at timestamp
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
