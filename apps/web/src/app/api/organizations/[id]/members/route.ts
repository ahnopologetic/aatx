import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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
        // Verify user is a member of this organization
        const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("org_id", orgId)
            .eq("user_id", user.id)
            .single();

        if (!membership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Get all organization members with user details
        const { data: members, error } = await supabase
            .from("organization_members")
            .select(`
        user_id,
        role,
        created_at,
        profiles!organization_members_user_id_fkey(id, name)
      `)
            .eq("org_id", orgId)
            .order("created_at", { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Get user emails from auth.users (need admin access for this)
        const memberData = await Promise.all(
            (members || []).map(async (member) => {
                const { data: authUser } = await supabase.auth.admin.getUserById(member.user_id as string);
                return {
                    ...member,
                    user: {
                        id: member.user_id,
                        name: (member.profiles as any)?.name || null,
                        email: authUser?.user?.email || 'Unknown'
                    }
                };
            })
        );

        return NextResponse.json({ members: memberData });

    } catch (error) {
        console.error('Error fetching organization members:', error);
        return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }
}
