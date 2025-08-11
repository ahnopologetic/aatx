import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { org_id } = await request.json().catch(() => ({}));
    if (!org_id) return NextResponse.json({ error: "org_id is required" }, { status: 400 });

    // Ensure the user is a member of the org
    const { count, error } = await supabase
        .from("organization_members")
        .select("org_id", { count: "exact", head: true })
        .eq("org_id", org_id)
        .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if ((count ?? 0) === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error: upsertError } = await supabase.from("profiles").upsert(
        { id: user.id, current_org_id: org_id },
        { onConflict: "id" }
    );
    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}


