import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

export const readFileTool = createTool({
    id: 'read-file-tool',
    description: 'Read the contents of a file with optional line limits. Can read up to 250 lines by default or 750 lines in max mode.',
    inputSchema: z.object({
        filePath: z.string().describe('The path to the file to read'),
        maxMode: z.boolean().optional().default(false).describe('Whether to use max mode (750 lines) instead of default (250 lines)'),
        startLine: z.number().optional().default(1).describe('Starting line number (1-based indexing)'),
        encoding: z.enum(['utf8', 'utf-8', 'ascii', 'latin1', 'base64', 'hex']).optional().default('utf8').describe('File encoding to use when reading'),
    }),
    outputSchema: z.object({
        success: z.boolean().describe('Whether the file was read successfully'),
        content: z.string().describe('The content of the file'),
        totalLines: z.number().describe('Total number of lines in the file'),
        linesRead: z.number().describe('Number of lines actually read'),
        truncated: z.boolean().describe('Whether the content was truncated due to line limits'),
        filePath: z.string().describe('The resolved file path'),
        message: z.string().optional().describe('Success or error message'),
    }),
    execute: async ({ context }) => {
        const { filePath, maxMode, startLine, encoding } = context;
        const maxLines = maxMode ? 750 : 250;

        try {
            const resolvedPath = resolve(filePath);
            const fileContent = await readFile(resolvedPath, { encoding });
            
            const lines = fileContent.split('\n');
            const totalLines = lines.length;
            
            // Calculate which lines to include
            const startIndex = Math.max(0, startLine - 1); // Convert to 0-based index
            const endIndex = Math.min(totalLines, startIndex + maxLines);
            
            const selectedLines = lines.slice(startIndex, endIndex);
            const linesRead = selectedLines.length;
            const truncated = endIndex < totalLines;
            
            const content = selectedLines.join('\n');

            return {
                success: true,
                content,
                totalLines,
                linesRead,
                truncated,
                filePath: resolvedPath,
                message: truncated 
                    ? `File read successfully. Showing lines ${startLine}-${startLine + linesRead - 1} of ${totalLines} (truncated due to ${maxLines} line limit)`
                    : `File read successfully. Showing all ${linesRead} lines.`
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            
            return {
                success: false,
                content: '',
                totalLines: 0,
                linesRead: 0,
                truncated: false,
                filePath: resolve(filePath),
                message: `Failed to read file: ${errorMessage}`,
            };
        }
    },
});