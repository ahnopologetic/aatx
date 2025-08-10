import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { spawn } from 'child_process';

type RunOpts = {
    bin: string;
    dirPath: string;
    customFunction?: string[];
    timeoutMs: number;
    maxOutputBytes: number;
    stdOut?: boolean;
};

async function runAnalyzeTracking(opts: RunOpts): Promise<string> {
    const { bin, dirPath, customFunction, timeoutMs, maxOutputBytes, stdOut } = opts;

    const args: string[] = [dirPath, '--format', 'json'];
    if (stdOut) {
        args.push('--stdout');
    }
    if (customFunction?.length) {
        customFunction.forEach((f) => {
            args.push('--customFunction', f);
        });
    }

    return new Promise((resolve, reject) => {
        const child = spawn(bin, args, {
            stdio: ['pipe', 'pipe'],
            env: process.env,
        });

        let stdoutSize = 0;
        const stdoutChunks: Buffer[] = [];
        let stderr = '';
        let killedByTimeout = false;

        const timer = setTimeout(() => {
            killedByTimeout = true;
            child.kill('SIGKILL');
        }, timeoutMs);

        child.stdout.on('data', (chunk: Buffer) => {
            stdoutSize += chunk.length;
            if (stdoutSize > maxOutputBytes) {
                child.kill('SIGKILL');
                return;
            }
            stdoutChunks.push(chunk);
        });

        child.stderr.on('data', (chunk: Buffer) => {
            stderr += chunk.toString();
        });

        child.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });

        child.on('close', (code) => {
            clearTimeout(timer);

            if (killedByTimeout) {
                return reject(new Error(`analyze-tracking timed out after ${timeoutMs}ms`));
            }
            if (stdoutSize > maxOutputBytes) {
                return reject(new Error(`analyze-tracking output exceeded ${maxOutputBytes} bytes`));
            }
            if (code !== 0) {
                return reject(new Error(stderr || `analyze-tracking exited with code ${code}`));
            }

            const out = Buffer.concat(stdoutChunks).toString('utf-8');
            resolve(out);
        });
    });
}

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
    execute: async ({ context, mastra, writer }) => {
        const {
            dirPath,
            customFunction,
            timeoutMs = 120_000,
            maxOutputBytes = 10 * 1024 * 1024,
            stdOut = true,
        } = context;

        const logger = mastra?.getLogger();
        const bin = process.env.ANALYZE_TRACKING_BIN || 'analyze-tracking';

        await writer?.write({
            type: 'tool-start',
            args: { toolName: 'search-analytics-code-tool', dirPath, customFunction, timeoutMs },
            status: 'pending',
        });

        try {
            logger?.info(`Running ${bin} on ${dirPath}`);
            const stdout = await runAnalyzeTracking({
                bin,
                dirPath,
                customFunction,
                timeoutMs,
                maxOutputBytes,
                stdOut,
            });

            const result = JSON.parse(stdout);
            await writer?.write({
                type: 'tool-complete',
                args: { toolName: 'search-analytics-code-tool', dirPath },
                status: 'success',
                result: { summary: result?.summary ?? null },
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