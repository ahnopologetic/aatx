type ApiRepository = {
    id: string;
    fullName?: string;
    url: string;
    customLabel?: string;
};
import { getUser } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Helper to fetch all paginated results from GitHub API
async function fetchAllGithubPages(url: string, headers: Record<string, string>, params: Record<string, string | number> = {}) {
    let results: any[] = [];
    let page = 1;
    while (true) {
        const searchParams = new URLSearchParams({ ...params, per_page: "100", page: String(page) });
        const resp = await fetch(`${url}?${searchParams.toString()}`, {
            headers,
            cache: "no-store",
        });
        if (!resp.ok) {
            throw new Error(`Failed to fetch from GitHub: ${resp.status} ${resp.statusText}`);
        }
        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) break;
        results = results.concat(data);
        if (data.length < 100) break;
        page += 1;
    }
    return results;
}

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const user = await getUser();
    let githubToken = null;
    if (user) {
        const { data, error: githubTokenError } = await supabase.from("profiles")
            .select("github_token").eq("id", user?.id ?? "").single();
        if (githubTokenError) {
            return NextResponse.json({ detail: "Failed to fetch GitHub token." }, { status: 500 });
        }
        if (data) {
            githubToken = data.github_token;
        } else {
            githubToken = user?.user_metadata.github_token;
        }
    }

    supabase.auth.onAuthStateChange(async (_, session) => {
        if (session) {
            if (session.provider_token && session.user.app_metadata.provider === 'github') {
                await supabase.from("profiles")
                    .update({ github_token: session.provider_token })
                    .eq("id", user?.id ?? "");
                githubToken = session.provider_token;
            }
        }
    });


    const headers = {
        "Authorization": `token ${githubToken}`,
        "Accept": "application/vnd.github+json",
    };

    let allRepos: any[] = [];

    try {
        // 2. Fetch user repos (all, including private)
        const userRepos = await fetchAllGithubPages(
            "https://api.github.com/user/repos",
            headers,
            {
                visibility: "all",
                affiliation: "owner,collaborator,organization_member",
            }
        );
        allRepos = allRepos.concat(userRepos);

        // 3. Fetch orgs for the user
        const orgsResp = await fetch("https://api.github.com/user/orgs", { headers, cache: "no-store" });
        let orgs: any[] = [];
        if (orgsResp.ok) {
            orgs = await orgsResp.json();
        }

        // 4. For each org, fetch all repos (including private)
        for (const org of orgs) {
            const orgLogin = org?.login;
            if (!orgLogin) continue;
            try {
                const orgRepos = await fetchAllGithubPages(
                    `https://api.github.com/orgs/${orgLogin}/repos`,
                    headers,
                    { type: "all" }
                );
                allRepos = allRepos.concat(orgRepos);
            } catch (err) {
                // Log and continue on org fetch error
                // Optionally: console.warn(`Failed to fetch repos for org ${orgLogin}:`, err);
                continue;
            }
        }

        const repos: ApiRepository[] = allRepos.map((repo) => ({
            id: repo.id,
            fullName: repo.full_name,
            url: repo.html_url,
            customLabel: repo.name ?? undefined,
        }));

        return NextResponse.json(repos);
    } catch (err: any) {
        return NextResponse.json(
            { detail: err?.message || "Failed to fetch GitHub repositories." },
            { status: 500 }
        );
    }
}