import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendWelcomeEmail } from "@/lib/resend";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await request.json().catch(() => ({}));
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  const { data: invite, error: inviteError } = await supabase
    .from("organization_invitations")
    .select("*")
    .eq("token", token)
    .single();
  if (inviteError || !invite) return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
  if (invite.status !== "pending") return NextResponse.json({ error: "Invite not pending" }, { status: 400 });

  const now = new Date().toISOString();
  const updates: Array<PromiseLike<any>> = [];
  updates.push(
    supabase.from("organization_members").insert({ org_id: invite.org_id, user_id: user.id, role: "member", created_at: now })
  );
  updates.push(
    supabase.from("organization_invitations").update({ status: "accepted" }).eq("token", token)
  );
  updates.push(
    supabase.from("profiles").upsert({ id: user.id, current_org_id: invite.org_id }, { onConflict: "id" })
  );
  const results = await Promise.all(updates);
  for (const r of results) if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });

  // Get organization name for welcome email
  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", invite.org_id)
    .single();

  // Get user profile for name
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  // Send welcome email (don't fail if this fails)
  if (organization && user.email) {
    try {
      await sendWelcomeEmail({
        userName: profile?.name || user.email.split('@')[0],
        userEmail: user.email,
        organizationName: organization.name
      });
    } catch (error) {
      console.warn('Failed to send welcome email:', error);
      // Don't fail the API call if email fails
    }
  }

  return NextResponse.json({ ok: true, org_id: invite.org_id });
}


