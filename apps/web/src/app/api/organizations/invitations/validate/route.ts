import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const supabase = await createClient();

    try {
        // Get invitation details with organization and inviter information
        const { data: invitation, error } = await supabase
            .from("organization_invitations")
            .select(`
        id,
        email,
        status,
        created_at,
        expires_at,
        organizations(id, name),
        profiles!organization_invitations_invited_by_fkey(id, name)
      `)
            .eq("token", token)
            .single();

        if (error || !invitation) {
            return NextResponse.json({
                valid: false,
                error: "Invalid invitation token"
            }, { status: 404 });
        }

        // Check if invitation is still pending
        if (invitation.status !== 'pending') {
            return NextResponse.json({
                valid: false,
                error: `Invitation has already been ${invitation.status}`
            }, { status: 400 });
        }

        // Check if invitation has expired (if expires_at is set)
        if (invitation.expires_at) {
            const expiresAt = new Date(invitation.expires_at);
            const now = new Date();
            if (now > expiresAt) {
                return NextResponse.json({
                    valid: false,
                    error: "Invitation has expired"
                }, { status: 400 });
            }
        }

        // Optional: Check if invitation is older than 7 days (even without explicit expiry)
        const createdAt = new Date(invitation.created_at || '');
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        if (createdAt < sevenDaysAgo) {
            return NextResponse.json({
                valid: false,
                error: "Invitation has expired (older than 7 days)"
            }, { status: 400 });
        }

        // Get inviter's email from their profile
        const inviterProfile = invitation.profiles as any;
        const { data: inviterUser } = await supabase.auth.admin.getUserById(inviterProfile.id);

        return NextResponse.json({
            valid: true,
            email: invitation.email,
            organizationName: (invitation.organizations as any).name,
            inviterName: inviterProfile.name || 'Unknown',
            inviterEmail: inviterUser?.user?.email || 'Unknown'
        });

    } catch (error) {
        console.error('Error validating invitation:', error);
        return NextResponse.json({
            valid: false,
            error: "Failed to validate invitation"
        }, { status: 500 });
    }
}
