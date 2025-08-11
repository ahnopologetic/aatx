import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

type ProviderId = 'posthog' | 'mixpanel' | 'segment' | 'amplitude' | 'ga4' | 'unknown';

export const generateAnalyticsSnippetTool = createTool({
  id: 'generate-analytics-snippet-tool',
  description:
    'Generate provider-specific analytics event code snippet(s) for given events, optionally with properties. Supports PostHog, Mixpanel, Segment, Amplitude, GA4.',
  inputSchema: z.object({
    provider: z
      .enum(['posthog', 'mixpanel', 'segment', 'amplitude', 'ga4', 'unknown'])
      .describe('Analytics provider to target'),
    events: z
      .array(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          properties: z.record(z.any()).optional(),
        }),
      )
      .min(1)
      .describe('Events to generate code for'),
    jsVariant: z.enum(['ts', 'js']).optional().default('ts'),
    functionName: z
      .string()
      .optional()
      .describe('Optional wrapper function name if generating a helper export'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    provider: z.enum(['posthog', 'mixpanel', 'segment', 'amplitude', 'ga4', 'unknown']),
    snippets: z.array(
      z.object({
        eventName: z.string(),
        code: z.string(),
        comment: z.string().optional(),
      }),
    ),
    wrapperExport: z.string().optional(),
    message: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { provider, events, jsVariant, functionName } = context;

    function genPropsLiteral(props?: Record<string, any>): string {
      if (!props || Object.keys(props).length === 0) return '{}';
      // Keep simple JSON representation; callers may format further
      return JSON.stringify(props, null, 2);
    }

    function snippetFor(provider: ProviderId, name: string, properties?: Record<string, any>): string {
      const props = genPropsLiteral(properties);
      switch (provider) {
        case 'posthog':
          return `posthog.capture('${name}', ${props});`;
        case 'mixpanel':
          return `mixpanel.track('${name}', ${props});`;
        case 'segment':
          return `analytics.track('${name}', ${props});`;
        case 'amplitude':
          return `amplitude.track('${name}', ${props});`;
        case 'ga4':
          return `gtag('event', '${name}', ${props});`;
        default:
          return `/* Unknown provider: implement track('${name}', ${props}) */`;
      }
    }

    const snippets = events.map((e) => ({
      eventName: e.name,
      code: snippetFor(provider as ProviderId, e.name, e.properties),
      comment: e.description,
    }));

    let wrapperExport: string | undefined;
    if (functionName) {
      const eventType = jsVariant === 'ts' ? ': string' : '';
      const propsType = jsVariant === 'ts' ? ': Record<string, any>' : '';
      const retType = jsVariant === 'ts' ? ': void' : '';
      const body = snippets
        .map((s) => `  if (eventName === '${s.eventName}') { ${s.code} return; }`)
        .join('\n');
      wrapperExport = `export function ${functionName}(eventName${eventType}, properties${propsType} = {})${retType} {\n${body}\n}`;
    }

    return {
      success: true,
      provider,
      snippets,
      wrapperExport,
      message: `Generated ${snippets.length} snippet(s) for ${provider}`,
    };
  },
});

export type GenerateAnalyticsSnippetTool = typeof generateAnalyticsSnippetTool;


