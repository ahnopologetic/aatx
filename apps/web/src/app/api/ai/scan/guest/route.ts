export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { z } from "zod";
import { mastra } from "~mastra/index";

type ScannedEvent = {
    name: string;
    description?: string;
    properties?: {
        [key: string]: string | number | boolean | null | undefined | object | unknown;
    }
    implementation: {
        path: string;
        line: number;
        function?: string;
        destination?: string;
    }[]
}

export type ScanResult = {
    repositoryUrl: string;
    analyticsProviders: string[];
    events: ScannedEvent[];
}

export async function POST(request: Request) {
    const body = await request.json()
    const result = await mastra.getAgent("aatxAgent").generate<z.ZodType<ScanResult>>([{
        role: "user",
        content: `Repository URL: ${body.repositoryUrl}\nAnalytics Providers: ${body.analyticsProviders.join(", ")}`
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
        toolChoice: "auto",
    })

    return Response.json(result.object)
}