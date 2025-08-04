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

type ScanResult = {
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
        output: z.object({
            repositoryUrl: z.string(),
            analyticsProviders: z.array(z.string()),
            events: z.array(z.object({
                name: z.string(),
                description: z.string().optional(),
                properties: z.record(z.string(), z.any()).optional(),
                implementation: z.array(z.object({
                    path: z.string(),
                    line: z.number(),
                    function: z.string().optional(),
                    destination: z.string().optional(),
                })),
            })),
        }),
    })
    return result.toJsonResponse()

}