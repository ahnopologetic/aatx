import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';

const execAsync = promisify(exec);

export const grepTool = createTool({
    id: 'grep-tool',
    description: 'Search for exact keywords or patterns within files using grep. Supports regular expressions and various search options.',
    inputSchema: z.object({
        pattern: z.string().describe('The pattern or keyword to search for'),
        searchPath: z.string().describe('The file or directory path to search in'),
        isRegex: z.boolean().optional().default(false).describe('Whether the pattern is a regular expression'),
        caseSensitive: z.boolean().optional().default(false).describe('Whether the search should be case sensitive'),
        wholeWord: z.boolean().optional().default(false).describe('Whether to match whole words only'),
        recursive: z.boolean().optional().default(true).describe('Whether to search recursively in directories'),
        includeLineNumbers: z.boolean().optional().default(true).describe('Whether to include line numbers in results'),
        maxResults: z.number().optional().default(100).describe('Maximum number of results to return'),
        filePattern: z.string().optional().describe('File pattern to include (e.g., "*.ts", "*.js")'),
        excludePattern: z.string().optional().describe('File pattern to exclude (e.g., "node_modules", "*.log")'),
        contextLines: z.number().optional().default(0).describe('Number of context lines to show before and after each match'),
    }),
    outputSchema: z.object({
        success: z.boolean().describe('Whether the search was successful'),
        matches: z.array(z.object({
            file: z.string().describe('File path where the match was found'),
            lineNumber: z.number().optional().describe('Line number of the match'),
            line: z.string().describe('The line containing the match'),
            context: z.object({
                before: z.array(z.string()).optional().describe('Lines before the match'),
                after: z.array(z.string()).optional().describe('Lines after the match'),
            }).optional().describe('Context lines if requested'),
        })).describe('Array of matches found'),
        totalMatches: z.number().describe('Total number of matches found'),
        searchPath: z.string().describe('The resolved search path'),
        pattern: z.string().describe('The search pattern used'),
        message: z.string().optional().describe('Success or error message'),
    }),
    execute: async ({ context, mastra, writer }) => {
        const logger = mastra?.getLogger();
        const {
            pattern,
            searchPath,
            isRegex,
            caseSensitive,
            wholeWord,
            recursive,
            includeLineNumbers,
            maxResults,
            filePattern,
            excludePattern,
            contextLines
        } = context;

        logger?.info(`Searching for pattern "${pattern}" in ${searchPath}`);
        await writer?.write({
            type: 'tool-start',
            args: { toolName: 'grep-tool', pattern, searchPath },
            status: 'pending',
        });

        try {
            const resolvedPath = resolve(searchPath);

            // Build grep command
            let grepCmd = 'grep';

            // Add options
            const options: string[] = [];

            if (!caseSensitive) options.push('-i');
            if (wholeWord) options.push('-w');
            if (recursive) options.push('-r');
            if (includeLineNumbers) options.push('-n');
            if (!isRegex) options.push('-F'); // Fixed strings (literal)
            if (contextLines > 0) options.push(`-C ${contextLines}`);

            // Limit results (head will be used after grep)
            options.push('-H'); // Always show filename

            let command = `${grepCmd} ${options.join(' ')} "${pattern}"`;

            // Add include pattern if specified
            if (filePattern) {
                command += ` --include="${filePattern}"`;
            }

            // Add exclude pattern if specified
            if (excludePattern) {
                command += ` --exclude-dir="${excludePattern}"`;
            }

            command += ` "${resolvedPath}"`;

            // Limit results using head
            if (maxResults > 0) {
                command += ` | head -${maxResults * (contextLines > 0 ? contextLines * 2 + 3 : 1)}`;
            }

            const { stdout, stderr } = await execAsync(command);

            if (stderr && !stderr.includes('No such file')) {
                console.warn('Grep warning:', stderr);
            }

            // Parse grep output
            const matches: any[] = [];
            const lines = stdout.trim().split('\n').filter(line => line.length > 0);

            for (const line of lines) {
                if (line.startsWith('--')) {
                    continue; // Skip context separators
                }

                const match = line.match(/^([^:]+):(\d+):(.*)$/) || line.match(/^([^:]+)-(\d+)-(.*)$/);
                if (match) {
                    const [, file, lineNum, content] = match;
                    matches.push({
                        file: file,
                        lineNumber: parseInt(lineNum, 10),
                        line: content,
                    });
                } else {
                    // Handle lines without line numbers
                    const fileMatch = line.match(/^([^:]+):(.*)$/);
                    if (fileMatch) {
                        const [, file, content] = fileMatch;
                        matches.push({
                            file: file,
                            line: content,
                        });
                    }
                }
            }

            // Limit to maxResults if we have more
            const limitedMatches = matches.slice(0, maxResults);

            logger?.info(`Found ${limitedMatches.length} matches for pattern "${pattern}" in ${resolvedPath}`);
            await writer?.write({
                type: 'tool-complete',
                args: { toolName: 'grep-tool', pattern, searchPath },
                status: 'success',
                result: { totalMatches: limitedMatches.length },
            });

            return {
                success: true,
                matches: limitedMatches,
                totalMatches: limitedMatches.length,
                searchPath: resolvedPath,
                pattern,
                message: `Found ${limitedMatches.length} matches for pattern "${pattern}" in ${resolvedPath}`,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            // Handle "no matches found" as success with empty results
            if (errorMessage.includes('exit code 1') || errorMessage.includes('No such file')) {
                logger?.error(`No matches found for pattern "${pattern}" in ${resolve(searchPath)}`);
                await writer?.write({
                    type: 'tool-complete',
                    args: { toolName: 'grep-tool', pattern, searchPath },
                    status: 'success',
                    result: { totalMatches: 0 },
                });
                return {
                    success: true,
                    matches: [],
                    totalMatches: 0,
                    searchPath: resolve(searchPath),
                    pattern,
                    message: `No matches found for pattern "${pattern}" in ${resolve(searchPath)}`,
                };
            }

            logger?.error(`Failed to search: ${errorMessage}`);
            await writer?.write({
                type: 'tool-error',
                args: { toolName: 'grep-tool', pattern, searchPath },
                status: 'error',
                error: errorMessage,
            });

            return {
                success: false,
                matches: [],
                totalMatches: 0,
                searchPath: resolve(searchPath),
                pattern,
                message: `Failed to search: ${errorMessage}`,
            };
        }
    },
});