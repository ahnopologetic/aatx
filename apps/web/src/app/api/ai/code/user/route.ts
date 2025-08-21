import { NextResponse } from "next/server";
import { mastra } from "~mastra/index";
import { 
  getCurrentUserOrganization,
  canOrganizationPerformAction,
  trackUsage 
} from "@/lib/subscription-utils";

export async function POST(request: Request) {
    try {
        // Get current user's organization
        const organization = await getCurrentUserOrganization();
        if (!organization) {
            return NextResponse.json(
                { error: "No organization found. Please select an organization." }, 
                { status: 400 }
            );
        }

        // Check if organization can use AATX Coder
        const canUse = await canOrganizationPerformAction(
            organization.id, 
            'aatx_coder', 
            'use'
        );

        if (!canUse) {
            const plan = organization.plan;
            const limit = plan?.limits.aatx_coder_monthly || 3;
            return NextResponse.json({
                error: "AATX Coder usage limit reached",
                message: `You've reached your monthly limit of ${limit} AATX Coder uses. Upgrade to Pro for unlimited usage.`,
                limit,
                upgrade_url: "/pricing"
            }, { status: 403 });
        }

        const { repositoryId, repositoryUrl, events } = await request.json();
        
        // Track usage before processing
        await trackUsage(
            organization.id,
            'aatx_coder',
            'use',
            repositoryId,
            { repositoryUrl, eventCount: events?.length || 0 }
        );

        const aatxCoderAgent = mastra.getAgent('aatxCoder');
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
        ], {
            maxSteps: 50,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('AATX Coder API error:', error);
        return NextResponse.json(
            { error: "Internal server error" }, 
            { status: 500 }
        );
    }
}