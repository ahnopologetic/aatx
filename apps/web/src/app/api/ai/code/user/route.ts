import { NextResponse } from "next/server";
import { mastra } from "~mastra/index";

export async function POST(request: Request) {
    const { repositoryId, repositoryUrl, events } = await request.json()
    const aatxCoderAgent = mastra.getAgent('aatxCoder')
    const result = await aatxCoderAgent.generate([
        {
            'role': 'user',
            'content': `
            Repository ID: ${repositoryId}
            Repository URL: ${repositoryUrl}

            Add events:
            ${events.map((e: any) => `- ${e.event_name} - ${e.description}`).join('\n')}
            `
        }
    ])
    return NextResponse.json(result)
}