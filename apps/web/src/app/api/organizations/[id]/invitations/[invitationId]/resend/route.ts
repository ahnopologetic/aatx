import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendOrganizationInvitation } from "@/lib/resend";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
    const { id: orgId, invitationId } = await params;
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

        // Get invitation details
        const { data: invitation } = await supabase
            .from("organization_invitations")
            .select("id, status, email, token")
            .eq("id", invitationId)
            .eq("org_id", orgId)
            .single();

        if (!invitation) {
            return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
        }

        if (invitation.status !== 'pending') {
            return NextResponse.json({
                error: `Cannot resend ${invitation.status} invitation`
            }, { status: 400 });
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

        const inviterName = inviterProfile?.name || user.email?.split('@')[0] || 'Someone';
        const inviterEmail = user.email || '';

        // Send invitation email
        try {
            await sendOrganizationInvitation({
                organizationName: organization.name,
                inviterName,
                inviterEmail,
                invitationToken: invitation.token,
                recipientEmail: invitation.email,
            });

            return NextResponse.json({
                success: true,
                message: `Invitation resent to ${invitation.email}`
            });

        } catch (emailError) {
            console.error(`Failed to resend invitation to ${invitation.email}:`, emailError);
            return NextResponse.json({
                error: "Failed to send invitation email"
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Error resending invitation:', error);
        return NextResponse.json({ error: "Failed to resend invitation" }, { status: 500 });
    }
}
