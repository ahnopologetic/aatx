import { apiKeyAuth } from "@/lib/api-key-auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mastra } from "~mastra/index";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Define the validation request schema
const validationRequestSchema = z.object({
  repositoryUrl: z.string().url(),
  trackingPlanId: z.string().uuid(),
  options: z.object({
    holistic: z.boolean().default(true).optional(),
    delta: z.boolean().default(false).optional(),
    autoUpdateTrackingPlan: z.boolean().default(false).optional(),
    overwriteExisting: z.boolean().default(false).optional(),
    comment: z.boolean().default(false).optional(),
  }).optional(),
  prDetails: z.object({
    prNumber: z.number().optional(),
    headSha: z.string().optional(),
    baseSha: z.string().optional(),
  }).optional(),
});

// Define the validation result schema
const validationResultSchema = z.object({
  repositoryUrl: z.string(),
  trackingPlanId: z.string(),
  valid: z.boolean(),
  events: z.array(z.object({
    name: z.string(),
    status: z.enum(['valid', 'invalid', 'missing', 'new']),
    message: z.string().optional(),
    properties: z.record(z.string(), z.any()).optional(),
    implementation: z.array(z.object({
      path: z.string(),
      line: z.number(),
      function: z.string().optional(),
      destination: z.string().optional(),
    })).optional(),
  })),
  summary: z.object({
    totalEvents: z.number(),
    validEvents: z.number(),
    invalidEvents: z.number(),
    missingEvents: z.number(),
    newEvents: z.number(),
  }),
  trackingPlanUpdated: z.boolean().optional(),
});

type ValidationResult = z.infer<typeof validationResultSchema>;

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const authResult = await apiKeyAuth(req, 'trackingPlans', 'validate');
  if ('response' in authResult) {
    return authResult.response;
  }

  const { orgId } = authResult;
  await supabase.rpc("set_api_context", { org_id: orgId, api_key: authResult.apiKeyId });

  try {
    // Parse and validate request body
    const body = await req.json();
    const validationRequest = validationRequestSchema.parse(body);
    // Verify tracking plan belongs to the organization
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, name')
      .eq('id', validationRequest.trackingPlanId)
      .eq('org_id', orgId)
      .single();

    if (planError) {
      console.error('Error retrieving tracking plan:', planError);
      return NextResponse.json({ error: "Failed to retrieve tracking plan" }, { status: 500 });
    }

    if (!plan) {
      console.error('Tracking plan not found or access denied');
      return NextResponse.json({ error: "Tracking plan not found or access denied" }, { status: 404 });
    }

    // Get tracking plan events of the selected repository
    const { data: planEvents } = await supabase
      .from('user_event_plans')
      .select('user_events(id, event_name, context, tags, file_path, properties, line_number, status, repos(id, name, url))')
      .eq('plan_id', validationRequest.trackingPlanId)
      .eq('user_events.repos.url', validationRequest.repositoryUrl);

    if (!planEvents) {
      return NextResponse.json({ error: "Failed to retrieve tracking plan events" }, { status: 500 });
    }

    // Extract event names from tracking plan
    const trackingPlanEventNames = planEvents.map(
      (item: any) => (
        {
          name: item.user_events?.event_name,
          filePath: item.user_events?.file_path,
          lineNumber: item.user_events?.line_number,
          properties: item.user_events?.properties,
          status: item.user_events?.status,
          repoName: item.user_events?.repos?.name,
          repoUrl: item.user_events?.repos?.url,
        }
      )
    ).filter(Boolean);


    // TODO: create agent execution plan in markdown checklist format
    const agentExecutionPlan = trackingPlanEventNames
      .filter(event => event.status !== 'new') // TODO: check new events as well
      .map(event => {
        return `- [ ] Validate event ${event.name} in ${event.filePath}@L${event.lineNumber} has the following properties: ${JSON.stringify(event.properties)}`;
      }).join('\n');

    const agent = mastra.getAgent('aatxCodeValidator');
    const agentResponse = await agent.generate(`Validate the codebase with the following plan:
      ${agentExecutionPlan}
      `, {
      output: validationResultSchema,
    });
    const validationResult = agentResponse.object;

    // TODO: implement below after integratino is ready
    // TODO: if comment is enabled, create a comment on the PR

    // If auto-update is enabled and there are new events, add them to the tracking plan
    // if (
    //   validationRequest.options?.autoUpdateTrackingPlan &&
    //   result.object.summary.newEvents > 0
    // ) {
    //   // Get new events
    //   const newEvents = result.object.events.filter(e => e.status === 'new');

    //   // Create user_events records for new events
    //   const userEventsToInsert = newEvents.map(event => {
    //     const implementation = event.implementation && event.implementation.length > 0
    //       ? event.implementation[0]
    //       : null;

    //     return {
    //       id: crypto.randomUUID(),
    //       event_name: event.name,
    //       context: event.message || `Auto-detected event from GitHub Action validation`,
    //       file_path: implementation?.path || null,
    //       line_number: implementation?.line || null,
    //       tags: ['detected', 'github-action'],
    //       created_at: new Date().toISOString(),
    //       updated_at: new Date().toISOString(),
    //     };
    //   });

    //   // Insert new events
    //   const { data: insertedEvents, error: insertError } = await supabase
    //     .from('user_events')
    //     .insert(userEventsToInsert)
    //     .select('id, event_name');

    //   if (insertError) {
    //     console.error('Error inserting new events:', insertError);
    //     return NextResponse.json({ error: "Failed to update tracking plan with new events" }, { status: 500 });
    //   }

    //   // Link new events to tracking plan
    //   const eventPlanLinks = insertedEvents.map(event => ({
    //     id: crypto.randomUUID(),
    //     plan_id: validationRequest.trackingPlanId,
    //     user_event_id: event.id,
    //     created_at: new Date().toISOString(),
    //     updated_at: new Date().toISOString(),
    //   }));

    //   const { error: linkError } = await supabase
    //     .from('user_event_plans')
    //     .insert(eventPlanLinks);

    //   if (linkError) {
    //     console.error('Error linking events to tracking plan:', linkError);
    //     return NextResponse.json({ error: "Failed to link new events to tracking plan" }, { status: 500 });
    //   }

    //   // Mark tracking plan as updated
    //   result.object.trackingPlanUpdated = true;

    //   // Update the plan's updated_at timestamp
    //   await supabase
    //     .from('plans')
    //     .update({ updated_at: new Date().toISOString() })
    //     .eq('id', validationRequest.trackingPlanId);
    // }

    return NextResponse.json(validationResult);
  } catch (error) {
    console.error('Validation error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request format", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
