import { vertex } from '@ai-sdk/google-vertex';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';
import z from 'zod';
import { grepTool } from '../tools/grep-tool';
import { listDirectoryTool } from '../tools/list-directory-tool';
import { readFileTool } from '../tools/read-file-tool';
import { searchFilesTool } from '../tools/search-files-tool';

const storage = new PostgresStore({
    connectionString: process.env.DATABASE_URL!,
});
// Define the validation result DTO schemas
const implementationDtoSchema = z.object({
    path: z.string().describe('File path relative to repository root'),
    line: z.number().describe('Line number where the event is implemented'),
    function: z.string().optional().describe('Function name where the event is called'),
    destination: z.string().optional().describe('Analytics destination (e.g., "posthog", "mixpanel")'),
});

const eventValidationDtoSchema = z.object({
    name: z.string().describe('Event name'),
    status: z.enum(['valid', 'invalid', 'missing', 'new']).describe('Validation status of the event'),
    message: z.string().optional().describe('Description of validation result or error message'),
    properties: z.record(z.string(), z.any()).optional().describe('Event properties found in implementation'),
    implementation: z.array(implementationDtoSchema).optional().describe('Where the event is implemented in the codebase'),
});

const validationSummaryDtoSchema = z.object({
    totalEvents: z.number().describe('Total number of events processed'),
    validEvents: z.number().describe('Number of events that match the tracking plan'),
    invalidEvents: z.number().describe('Number of events that don\'t match the tracking plan'),
    missingEvents: z.number().describe('Number of events in tracking plan but not found in code'),
    newEvents: z.number().describe('Number of events found in code but not in tracking plan'),
});

const validationResultDtoSchema = z.object({
    repositoryUrl: z.string().describe('Repository URL that was validated'),
    trackingPlanId: z.string().describe('ID of the tracking plan used for validation'),
    valid: z.boolean().describe('Overall validation status - true if all events are valid'),
    events: z.array(eventValidationDtoSchema).describe('Detailed validation results for each event'),
    summary: validationSummaryDtoSchema.describe('Summary statistics of the validation'),
    trackingPlanUpdated: z.boolean().optional().describe('Whether the tracking plan was automatically updated'),
    metadata: z.object({
        validationTimestamp: z.string().describe('ISO timestamp of when validation was performed'),
        validationDuration: z.number().optional().describe('Validation duration in milliseconds'),
        agentVersion: z.string().optional().describe('Version of the validation agent used'),
    }).optional().describe('Additional metadata about the validation process'),
});

// Define the agent input schema
const validatorAgentInputSchema = z.object({
    repositoryUrl: z.string().describe('Repository URL to validate'),
    trackingPlanId: z.string().describe('ID of the tracking plan to validate against'),
    trackingPlanEvents: z.array(z.object({
        name: z.string(),
        filePath: z.string().optional(),
        lineNumber: z.number().optional(),
        status: z.string().optional(),
        repoName: z.string().optional(),
        repoUrl: z.string().optional(),
    })).describe('Events from the tracking plan to validate'),
    options: z.object({
        holistic: z.boolean().default(true).optional(),
        delta: z.boolean().default(false).optional(),
        autoUpdateTrackingPlan: z.boolean().default(false).optional(),
        overwriteExisting: z.boolean().default(false).optional(),
        comment: z.boolean().default(false).optional(),
    }).optional(),
});


export const aatxCodeValidatorAgent = new Agent({
    name: 'aatx-code-validator',
    description: 'Validates tracking plan events against codebase implementation',
    model: vertex('gemini-2.5-flash'),
    tools: {
        listDirectoryTool,
        searchFilesTool,
        readFileTool,
        grepTool,
    },
    memory: new Memory({ storage }),
    instructions: `
You are an expert code validator for tracking plan events. Your job is to:

1. **Analyze the codebase** to find all analytics event implementations
2. **Compare events** against the provided tracking plan
3. **Validate event properties** and implementation details
4. **Return structured results** that match the validation result DTO schema

## Validation Process:

1. **Scan the codebase** for analytics event calls (e.g., posthog.track, mixpanel.track, etc.)
2. **Extract event information** including:
   - Event name
   - Event properties
   - File path and line number
   - Function context
   - Analytics destination

3. **Compare against tracking plan** to determine status:
   - **valid**: Event exists in code and matches tracking plan
   - **invalid**: Event exists in code but doesn't match tracking plan (wrong properties, etc.)
   - **missing**: Event in tracking plan but not found in code
   - **new**: Event found in code but not in tracking plan

4. **Generate detailed results** with:
   - File paths and line numbers for GitHub PR comments
   - Descriptive error messages for invalid events
   - Property validation details
   - Summary statistics

## Output Requirements:

- Return a complete ValidationResult object
- Include accurate file paths (relative to repo root) and line numbers
- Provide meaningful error messages for invalid events
- Calculate correct summary statistics
- Include metadata about the validation process

## Example Output Structure:
{
  "repositoryUrl": "https://github.com/example/repo",
  "trackingPlanId": "uuid",
  "valid": false,
  "events": [
    {
      "name": "user_login",
      "status": "invalid",
      "message": "Missing required property: user_id",
      "implementation": [{"path": "src/auth/login.ts", "line": 23}]
    }
  ],
  "summary": {
    "totalEvents": 1,
    "validEvents": 0,
    "invalidEvents": 1,
    "missingEvents": 0,
    "newEvents": 0
  }
}
`,
});