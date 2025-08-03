import { NextResponse } from "next/server"
import { mastra } from "~mastra/index"
import { getSession } from "@/lib/auth"

export async function POST(request: Request) {
    const session = await getSession()

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { repositoryUrl, analyticsProviders } = await request.json()

    const result = await mastra.getAgent("aatxAgent").generate(`Let's scan repo: ${repositoryUrl} with analytics providers: ${analyticsProviders.join(", ")}`)

    return NextResponse.json({ result })
}