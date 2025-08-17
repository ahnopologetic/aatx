import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; memberId: string }> }
) {
    const { id: orgId, memberId } = await params;
    const supabase = await createClient();

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { role: newRole } = await request.json();

        // Validate role
        if (!['owner', 'admin', 'member'].includes(newRole)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        // Verify user is an owner of this organization (only owners can change roles)
        const { data: currentUserMembership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("org_id", orgId)
            .eq("user_id", user.id)
            .single();

        if (!currentUserMembership || currentUserMembership.role !== 'owner') {
            return NextResponse.json({ error: "Access denied - only owners can change member roles" }, { status: 403 });
        }

        // Get the member being updated
        const { data: targetMember } = await supabase
            .from("organization_members")
            .select("user_id, role")
            .eq("id", memberId)
            .eq("org_id", orgId)
            .single();

        if (!targetMember) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        // Prevent changing your own role
        if (targetMember.user_id === user.id) {
            return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
        }

        // Prevent making someone else an owner (this would require ownership transfer)
        if (newRole === 'owner') {
            return NextResponse.json({
                error: "Cannot make someone else an owner. Use ownership transfer instead."
            }, { status: 400 });
        }

        // Update the member's role
        const { error: updateError } = await supabase
            .from("organization_members")
            .update({ role: newRole })
            .eq("id", memberId)
            .eq("org_id", orgId);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, role: newRole });

    } catch (error) {
        console.error('Error updating member role:', error);
        return NextResponse.json({ error: "Failed to update member role" }, { status: 500 });
    }
}
