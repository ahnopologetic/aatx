import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const searchAnalyticsCodeTool = createTool({
    id: 'search-analytics-code-tool',
    description: 'Search for analytics code',
    inputSchema: z.object({
        dirPath: z.string().describe('The path to the directory to analyze'),
        customFunction: z.array(z.string()).optional().describe('A list of custom function patterns to search for. e.g., Mixpanel.track, GoogleAnalytics.send'),
    }),
    execute: async ({ context }) => {
        const { dirPath, customFunction } = context;

        // Build the command
        let command = `npx -y @flisk/analyze-tracking "${dirPath}" --stdout --format json`;

        // Add custom function if provided
        if (customFunction) {
            command += ` --customFunction "${customFunction}"`;
        }

        try {
            const { stdout, stderr } = await execAsync(command);

            if (stderr) {
                console.warn('Warning from analyze-tracking:', stderr);
            }

            // Parse the JSON output
            const result = JSON.parse(stdout);
            return result;
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`Failed to parse JSON output from analyze-tracking: ${error.message}`);
            }
            throw new Error(`Failed to execute analyze-tracking: ${error instanceof Error ? error.message : String(error)}`);
        }
    },
});