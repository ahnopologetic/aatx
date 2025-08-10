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
    execute: async ({ context, mastra, writer }) => {
        const { dirPath, customFunction } = context;
        const logger = mastra?.getLogger();

        // Build the command
        let command = `npx -y @flisk/analyze-tracking "${dirPath}" --stdout --format json`;

        // Add custom function if provided
        if (customFunction) {
            customFunction.forEach(func => {
                command += ` --customFunction "${func}"`;
            });
        }

        try {
            logger?.info(`Executing command: ${command}`);
            await writer?.write({ type: 'tool-start', args: { toolName: 'search-analytics-code-tool', dirPath, customFunction }, status: 'pending' });
            const { stdout, stderr } = await execAsync(command);

            if (stderr) {
                console.warn('Warning from analyze-tracking:', stderr);
            }

            // Parse the JSON output
            const result = JSON.parse(stdout);

            logger?.info(`Successfully parsed JSON output from analyze-tracking`);
            await writer?.write({ type: 'tool-complete', args: { toolName: 'search-analytics-code-tool', dirPath }, status: 'success', result: { summary: result?.summary ?? null } });

            return result;
        } catch (error) {
            if (error instanceof SyntaxError) {
                await writer?.write({ type: 'tool-error', args: { toolName: 'search-analytics-code-tool', dirPath }, status: 'error', error: `Failed to parse JSON: ${error.message}` });
                throw new Error(`Failed to parse JSON output from analyze-tracking: ${error.message}`);
            }

            logger?.error(`Failed to execute analyze-tracking: ${error instanceof Error ? error.message : String(error)}`);
            await writer?.write({ type: 'tool-error', args: { toolName: 'search-analytics-code-tool', dirPath }, status: 'error', error: error instanceof Error ? error.message : String(error) });

            throw new Error(`Failed to execute analyze-tracking: ${error instanceof Error ? error.message : String(error)}`);
        }
    },
});