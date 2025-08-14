import { NextResponse } from "next/server"
import { mastra } from "~mastra/index"
import { getUser } from "@/lib/auth"
import { z } from "zod"
import { ScanResult } from "../guest/route"

export async function POST(request: Request) {
    const user = await getUser()

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { repositoryUrl, analyticsProviders } = await request.json()

    const result = await mastra.getAgent("aatxAgent").generate<z.ZodType<ScanResult>>([{
        role: "user",
        content: `Repository URL: ${repositoryUrl}\nAnalytics Providers: ${analyticsProviders.join(", ")}`
    }], {
        experimental_output: z.object({
            repositoryUrl: z.string(),
            analyticsProviders: z.array(z.string()),
            clonedPath: z.string().optional().describe('The path to the cloned repository'),
            foundPatterns: z.array(z.string()).optional().describe('The regex patterns of analytics and tracking code found in the repository'),
            events: z.array(z.object({
                name: z.string().describe('The name of the event'),
                description: z.string().optional().describe('A description of the event'),
                properties: z.record(z.string(), z.any()).optional().describe('The properties of the event'),
                implementation: z.array(z.object({
                    path: z.string().describe('The path to the file where the event is implemented. Make sure this path is relative to the repository root.'),
                    line: z.number().describe('The line number where the event is implemented'),
                    function: z.string().optional().describe('The function name where the event is implemented'),
                    destination: z.string().optional().describe('The destination where the event is sent e.g., mixpanel, amplitude, etc.'),
                })),
            })),
        }),
        maxSteps: 30,
        maxRetries: 3,
        temperature: 0,
    })

    return NextResponse.json({ result: result.object })
}