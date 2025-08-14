import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { analyzeDirectory, getRepoDetails } from '@aatx/analyze-tracking';

export const searchAnalyticsCodeTool = createTool({
    id: 'search-analytics-code-tool',
    description: 'Search for analytics code',
    inputSchema: z.object({
        dirPath: z.string().describe('The path to the directory to analyze'),
        customFunction: z.array(z.string()).optional().describe('Custom function patterns to search for'),
        ignore: z.array(z.string()).optional().describe('Glob patterns or dirs to ignore'),
        timeoutMs: z.number().int().positive().optional().describe('Kill the process after this many ms'),
        maxOutputBytes: z.number().int().positive().optional().describe('Cap captured stdout size'),
        stdOut: z.boolean().optional().describe('Output to stdout'),
    }),
    execute: async (args: any) => {
        const { context, mastra, writer } = args;
        const {
            dirPath,
            customFunction,
            timeoutMs = 60_000,
            maxOutputBytes = 10 * 1024 * 1024,
            stdOut = true,
            ignore = [],
        } = context;

        const logger = mastra?.getLogger();

        await writer?.write({
            type: 'tool-start',
            args: { toolName: 'search-analytics-code-tool', dirPath, customFunction, timeoutMs },
            status: 'pending',
        });

        try {
            logger?.info(`Analyzing directory with @aatx/analyze-tracking: ${dirPath}`);

            // Use library API instead of spawning CLI
            const events = await analyzeDirectory(dirPath, customFunction, ignore);
            const source = await getRepoDetails(dirPath);

            const result = { version: 1, source, events } as const;

            if (stdOut) {
                // Keep optional stdout parity
                // eslint-disable-next-line no-console
                console.log(JSON.stringify(result));
            }
            const eventsCount = Object.keys(events ?? {}).length;
            await writer?.write({
                type: 'tool-complete',
                args: { toolName: 'search-analytics-code-tool', dirPath },
                status: 'success',
                result: { eventsCount },
            });
            logger?.info(`analyze-tracking result: ${JSON.stringify(result).substring(0, 100) + '...'}`);

            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger?.error(`Failed to execute analyze-tracking: ${message}`);
            await writer?.write({
                type: 'tool-error',
                args: { toolName: 'search-analytics-code-tool', dirPath },
                status: 'error',
                error: message,
            });
            throw new Error(`Failed to execute analyze-tracking: ${message}`);
        }
    },
});