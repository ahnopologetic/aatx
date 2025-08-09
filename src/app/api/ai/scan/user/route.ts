import { NextResponse } from "next/server"
import { mastra } from "~mastra/index"
import { getUser } from "@/lib/auth"

export async function POST(request: Request) {
    const user = await getUser()

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { repositoryUrl, analyticsProviders } = await request.json()

    const result = await mastra.getAgent("aatxAgent").generate(`Let's scan repo: ${repositoryUrl} with analytics providers: ${analyticsProviders.join(", ")}`)

    return NextResponse.json({ result })
}