import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function DELETE(
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
        // Verify user is an owner or admin of this organization
        const { data: currentUserMembership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("org_id", orgId)
            .eq("user_id", user.id)
            .single();

        if (!currentUserMembership || !['owner', 'admin'].includes(currentUserMembership.role)) {
            return NextResponse.json({ error: "Access denied - insufficient permissions" }, { status: 403 });
        }

        // Get the member being removed
        const { data: targetMember } = await supabase
            .from("organization_members")
            .select("user_id, role")
            .eq("id", memberId)
            .eq("org_id", orgId)
            .single();

        if (!targetMember) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        // Prevent removing yourself
        if (targetMember.user_id === user.id) {
            return NextResponse.json({ error: "Cannot remove yourself from organization" }, { status: 400 });
        }

        // Only owners can remove other owners
        if (targetMember.role === 'owner' && currentUserMembership.role !== 'owner') {
            return NextResponse.json({ error: "Only owners can remove other owners" }, { status: 403 });
        }

        // Remove the member
        const { error: deleteError } = await supabase
            .from("organization_members")
            .delete()
            .eq("id", memberId)
            .eq("org_id", orgId);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error removing organization member:', error);
        return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
    }
}
