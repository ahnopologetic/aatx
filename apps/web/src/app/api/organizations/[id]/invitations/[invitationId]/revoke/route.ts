import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

        // Verify invitation exists and belongs to this organization
        const { data: invitation } = await supabase
            .from("organization_invitations")
            .select("id, status, email")
            .eq("id", invitationId)
            .eq("org_id", orgId)
            .single();

        if (!invitation) {
            return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
        }

        if (invitation.status !== 'pending') {
            return NextResponse.json({
                error: `Cannot revoke ${invitation.status} invitation`
            }, { status: 400 });
        }

        // Update invitation status to revoked
        const { error: updateError } = await supabase
            .from("organization_invitations")
            .update({ status: "revoked" })
            .eq("id", invitationId)
            .eq("org_id", orgId);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Invitation for ${invitation.email} has been revoked`
        });

    } catch (error) {
        console.error('Error revoking invitation:', error);
        return NextResponse.json({ error: "Failed to revoke invitation" }, { status: 500 });
    }
}
