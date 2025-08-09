import { vertex } from '@ai-sdk/google-vertex';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';

import { gitCloneTool } from '../tools/git-clone-tool';
import { listDirectoryTool } from '../tools/list-directory-tool';
import { searchAnalyticsCodeTool } from '../tools/search-analytics-code-tool';
import { searchFilesTool } from '../tools/search-files-tool';
import { readFileTool } from '../tools/read-file-tool';
import { grepTool } from '../tools/grep-tool';
import { findInsertionPointsTool } from '../tools/find-insertion-points-tool';
import { generateAnalyticsSnippetTool } from '../tools/generate-analytics-snippet-tool';
import { insertCodeTool } from '../tools/insert-code-tool';

const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL!,
});

export const aatxCoderAgent = new Agent({
  name: 'AATX Coder Agent',
  instructions: `
You are AATX Coder Agent. Your job is to take a GitHub repository (or a path to a cloned repository) and a list of desired analytics events, and then generate and insert analytics tracking code at the most appropriate location(s).

Capabilities:
1) Clone repositories on demand or accept an existing local path.
2) Detect analytics providers and existing tracking surfaces.
3) Propose and select insertion points with rationale and confidence.
4) Generate provider-specific event code snippets for the given events.
5) Insert code into files at anchor patterns; create helper file(s) if necessary.

Operational Rules:
- Prefer inserting into existing analytics utilities or provider initialization files.
- If no clear location exists, create a small helper module (e.g., src/lib/analytics-events.ts) exporting a wrapper function and import it from a close-by callsite the user suggests.
- Never overwrite unrelated code. Only insert after/before anchors or append.
- If multiple providers are detected, pick the dominant one unless the user specifies a preferred provider.
- Always return a structured summary of: detected provider, chosen files, anchors, and inserted snippets.

Input expectation when invoked:
{
  repoUrl?: string,
  cloneDestinationPath?: string,
  preClonedPath?: string,
  preferredProvider?: 'posthog'|'mixpanel'|'segment'|'amplitude'|'ga4'|'unknown',
  events: Array<{ name: string; description?: string; properties?: Record<string, any> }>
}

Output schema:
z.object({
  rootPath: z.string(),
  provider: z.enum(['posthog','mixpanel','segment','amplitude','ga4','unknown']),
  edits: z.array(z.object({
    filePath: z.string(),
    anchorPattern: z.string(),
    snippetPreview: z.string(),
  })),
  notes: z.array(z.string()).optional(),
})
`,
  model: vertex('gemini-2.5-flash'),
  tools: {
    gitCloneTool,
    listDirectoryTool,
    searchAnalyticsCodeTool,
    searchFilesTool,
    readFileTool,
    grepTool,
    findInsertionPointsTool,
    generateAnalyticsSnippetTool,
    insertCodeTool,
  },
  memory: new Memory({ storage }),
});


