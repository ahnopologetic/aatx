import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { randomUUID } from "crypto";
import type { TablesInsert } from "@/lib/database.types";
import { sendOrganizationInvitation } from "@/lib/resend";

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get user's organizations and current org
    const [{ data: orgData, error: orgError }, { data: profile, error: profileError }] = await Promise.all([
        supabase
            .from("organization_members")
            .select("org_id, organizations(id, name)")
            .eq("user_id", user.id),
        supabase
            .from("profiles")
            .select("current_org_id")
            .eq("id", user.id)
            .single()
    ]);

    if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 });

    const organizations = (orgData ?? []).map((row: any) => ({
        id: row.organizations.id,
        name: row.organizations.name
    }));

    return NextResponse.json({
        organizations,
        current_org_id: profile?.current_org_id || null
    });
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await request.json().catch(() => ({}));
    const name = String(payload?.name || "").trim();
    const invite_emails: string[] = Array.isArray(payload?.invite_emails) ? payload.invite_emails : [];
    if (!name) return NextResponse.json({ error: "Organization name is required" }, { status: 400 });

    // Enforce max 2 orgs per user
    const { count } = await supabase
        .from("organization_members")
        .select("org_id", { count: "exact", head: true })
        .eq("user_id", user.id);
    if ((count ?? 0) >= 2) return NextResponse.json({ error: "Organization limit reached (2)." }, { status: 400 });

    const now = new Date().toISOString();
    const orgId = randomUUID();

    const { error: orgError } = await supabase.from("organizations").insert({
        id: orgId,
        name,
        created_by: user.id,
        created_at: now,
        updated_at: now,
    });
    if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 });

    // Add creator as owner
    const { error: memberError } = await supabase.from("organization_members").insert({
        org_id: orgId,
        user_id: user.id,
        role: "owner",
        created_at: now,
    });
    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

    // Ensure profile row exists and set current_org_id if not set
    await supabase.from("profiles").upsert({ id: user.id, current_org_id: orgId }, { onConflict: "id" });

    // Invitations
    const invites: { email: string; token: string }[] = [];
    for (const email of invite_emails) {
        const normalized = String(email || "").trim().toLowerCase();
        if (!normalized) continue;
        const token = randomUUID();
        invites.push({ email: normalized, token });
    }
    if (invites.length > 0) {
        const inviteRows: TablesInsert<"organization_invitations">[] = invites.map((i) => ({
            id: randomUUID(),
            org_id: orgId,
            email: i.email,
            token: i.token,
            status: "pending",
            invited_by: user.id,
            created_at: now,
            expires_at: null,
        }));
        const { error: inviteError } = await supabase.from("organization_invitations").insert(inviteRows);
        if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });

        // Send invitation emails
        const { data: inviterProfile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", user.id)
            .single();

        const inviterName = inviterProfile?.name || user.email?.split('@')[0] || 'Someone';
        const inviterEmail = user.email || '';

        // Send emails in parallel but don't fail the whole operation if emails fail
        const emailPromises = invites.map(async (invite) => {
            try {
                await sendOrganizationInvitation({
                    organizationName: name,
                    inviterName,
                    inviterEmail,
                    invitationToken: invite.token,
                    recipientEmail: invite.email,
                });
                return { email: invite.email, success: true };
            } catch (error) {
                console.error(`Failed to send invitation to ${invite.email}:`, error);
                return { email: invite.email, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });

        const emailResults = await Promise.all(emailPromises);
        const emailFailures = emailResults.filter(result => !result.success);

        // Log email failures but don't fail the API call
        if (emailFailures.length > 0) {
            console.warn('Some invitation emails failed to send:', emailFailures);
        }

        return NextResponse.json({
            organization: { id: orgId, name },
            invites: invites.map(i => ({ email: i.email, token: i.token })),
            emailsSent: invites.length - emailFailures.length
        }, { status: 201 });
    }

    return NextResponse.json({ organization: { id: orgId, name } }, { status: 201 });
}


