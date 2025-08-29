import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateApiKey, getKeyPrefix, hashApiKey, DEFAULT_GITHUB_ACTION_PERMISSIONS } from "@/lib/api-key-utils";

export async function GET() {
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

  // Get API keys for the current organization
  const { data: apiKeys, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, expires_at, revoked_at, permissions')
    .eq('org_id', profile.current_org_id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ apiKeys });
}

export async function POST(request: Request) {
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

  if (membership?.role !== 'owner') {
    return NextResponse.json({ error: "Only organization admins can create API keys" }, { status: 403 });
  }

  const { name, expiresInDays = 365, permissions = DEFAULT_GITHUB_ACTION_PERMISSIONS } = await request.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Generate API key
  const apiKey = generateApiKey();
  const keyPrefix = getKeyPrefix(apiKey);
  const keyHash = hashApiKey(apiKey);

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Create API key record
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      org_id: profile.current_org_id,
      created_by: session.user.id,
      expires_at: expiresAt.toISOString(),
      permissions,
    })
    .select('id, name, key_prefix, created_at, expires_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: "An API key with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return the full API key only once
  return NextResponse.json({
    apiKey: {
      ...data,
      key: apiKey, // Full key - only returned once
    }
  });
}
