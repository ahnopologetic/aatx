import { NextResponse } from "next/server"
import { mastra } from "~mastra/index"

export async function POST(request: Request) {
    const { repositoryUrl, analyticsProviders } = await request.json()

    const result = await mastra.getAgent("aatxAgent").generate(`Let's scan repo: ${repositoryUrl} with analytics providers: ${analyticsProviders.join(", ")}`)

    return NextResponse.json({ result })
}