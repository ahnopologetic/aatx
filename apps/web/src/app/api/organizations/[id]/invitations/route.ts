import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { randomUUID } from "crypto";
import { sendOrganizationInvitation } from "@/lib/resend";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: orgId } = await params;
    const supabase = await createClient();

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Verify user is an owner or admin of this organization
        const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("org_id", orgId)
            .eq("user_id", user.id)
            .single();

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Get all invitations for this organization
        const { data: invitations, error } = await supabase
            .from("organization_invitations")
            .select(`
        id,
        email,
        status,
        created_at,
        expires_at,
        token,
        profiles!organization_invitations_invited_by_fkey(id, name)
      `)
            .eq("org_id", orgId)
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Get inviter emails from auth.users
        const invitationData = await Promise.all(
            (invitations || []).map(async (invitation) => {
                const { data: authUser } = await supabase.auth.admin.getUserById((invitation.profiles as any).id);
                return {
                    ...invitation,
                    invited_by: {
                        name: (invitation.profiles as any)?.name || null,
                        email: authUser?.user?.email || 'Unknown'
                    }
                };
            })
        );

        return NextResponse.json({ invitations: invitationData });

    } catch (error) {
        console.error('Error fetching invitations:', error);
        return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: orgId } = await params;
    const supabase = await createClient();

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { emails } = await request.json();

        if (!Array.isArray(emails) || emails.length === 0) {
            return NextResponse.json({ error: "Emails array is required" }, { status: 400 });
        }

        // Verify user is an owner or admin of this organization
        const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("org_id", orgId)
            .eq("user_id", user.id)
            .single();

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Get organization details
        const { data: organization } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", orgId)
            .single();

        if (!organization) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        // Get user profile for inviter name
        const { data: inviterProfile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", user.id)
            .single();

        const now = new Date().toISOString();
        const inviterName = inviterProfile?.name || user.email?.split('@')[0] || 'Someone';
        const inviterEmail = user.email || '';

        // Process each email
        const results = [];
        for (const email of emails) {
            const normalizedEmail = String(email || "").trim().toLowerCase();
            if (!normalizedEmail) continue;

            try {
                // Check if user is already a member
                const { data: existingMember } = await supabase
                    .from("organization_members")
                    .select("id")
                    .eq("org_id", orgId)
                    .eq("user_id", (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === normalizedEmail)?.id || 'none')
                    .single();

                if (existingMember) {
                    results.push({ email: normalizedEmail, error: "User is already a member" });
                    continue;
                }

                // Check if there's already a pending invitation
                const { data: existingInvitation } = await supabase
                    .from("organization_invitations")
                    .select("id, status")
                    .eq("org_id", orgId)
                    .eq("email", normalizedEmail)
                    .eq("status", "pending")
                    .single();

                if (existingInvitation) {
                    results.push({ email: normalizedEmail, error: "Invitation already pending" });
                    continue;
                }

                // Create new invitation
                const token = randomUUID();
                const { error: insertError } = await supabase
                    .from("organization_invitations")
                    .insert({
                        id: randomUUID(),
                        org_id: orgId,
                        email: normalizedEmail,
                        token,
                        status: "pending",
                        invited_by: user.id,
                        created_at: now,
                        expires_at: null, // Will expire based on created_at + 7 days
                    });

                if (insertError) {
                    results.push({ email: normalizedEmail, error: insertError.message });
                    continue;
                }

                // Send invitation email
                try {
                    await sendOrganizationInvitation({
                        organizationName: organization.name,
                        inviterName,
                        inviterEmail,
                        invitationToken: token,
                        recipientEmail: normalizedEmail,
                    });
                    results.push({ email: normalizedEmail, success: true });
                } catch (emailError) {
                    console.error(`Failed to send invitation to ${normalizedEmail}:`, emailError);
                    results.push({ email: normalizedEmail, error: "Failed to send email" });
                }

            } catch (error) {
                results.push({
                    email: normalizedEmail,
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => r.error).length;

        return NextResponse.json({
            results,
            summary: {
                total: emails.length,
                successful,
                failed
            }
        });

    } catch (error) {
        console.error('Error creating invitations:', error);
        return NextResponse.json({ error: "Failed to create invitations" }, { status: 500 });
    }
}
