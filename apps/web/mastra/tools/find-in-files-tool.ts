/**
 * Find in Files Tool - Similar to VSCode's "Find in Files" functionality
 * 
 * This tool searches for text patterns within file contents across directory structures.
 * It supports glob patterns for including/excluding files, regex patterns, case-sensitive
 * searches, whole word matching, and provides context lines around matches.
 * 
 * Example usage:
 * - searchPattern: "console.log"
 * - caseSensitive: false
 * - useRegex: false
 * - contextLines: 2
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { readFile, readdir, stat } from 'fs/promises';
import { resolve, join, relative, extname, basename } from 'path';

// Simple glob pattern matcher
function matchesGlob(pattern: string, path: string): boolean {
    // Handle the most common cases simply
    if (pattern === '**/*') {
        return true; // matches everything
    }

    if (pattern === '*') {
        return !path.includes('/'); // matches only files in root, no subdirs
    }

    // Convert glob to regex step by step
    // First escape special regex chars (but preserve * and ? and /)
    let regexPattern = pattern
        .split('')
        .map((char, i) => {
            if (char === '*') {
                // Check if it's ** (double star)
                if (pattern[i - 1] === '*' || pattern[i + 1] === '*') {
                    return char; // Keep as is, will handle ** as a unit later
                }
                return '____SINGLE_STAR____'; // Mark single stars
            } else if (char === '?') {
                return '____QUESTION____';
            } else if ('.+^${}()|[]\\'.includes(char)) {
                return '\\' + char; // Escape special regex chars
            }
            return char;
        })
        .join('');

    // Now handle the special patterns
    regexPattern = regexPattern
        .replace(/\*\*/g, '.*')                    // ** matches any chars including /
        .replace(/____SINGLE_STAR____/g, '[^/]*') // * matches any chars except /
        .replace(/____QUESTION____/g, '[^/]');     // ? matches single char except /

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path) || regex.test(path.replace(/\\/g, '/'));
}

export const findInFilesTool = createTool({
    id: 'find-in-files-tool',
    description: 'Find text patterns within file contents, similar to VSCode "Find in Files". Searches for specific patterns within files and returns matches with line numbers and context.',
    inputSchema: z.object({
        searchPattern: z.string().describe('The text pattern to search for within files'),
        searchPath: z.string().describe('The directory path to search in'),
        includeFiles: z.array(z.string()).optional().default(['**/*']).describe('Glob patterns for files to include (e.g., ["**/*.ts", "**/*.js"])'),
        excludeFiles: z.array(z.string()).optional().default([
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**',
            '**/build/**',
            '**/*.log',
            '**/*.min.js',
            '**/*.bundle.js'
        ]).describe('Glob patterns for files to exclude'),
        caseSensitive: z.boolean().optional().default(false).describe('Whether the search should be case sensitive'),
        useRegex: z.boolean().optional().default(false).describe('Whether to treat the search pattern as a regular expression'),
        wholeWord: z.boolean().optional().default(false).describe('Whether to match whole words only'),
        maxResults: z.number().optional().default(100).describe('Maximum number of matches to return'),
        maxDepth: z.number().optional().default(10).describe('Maximum directory depth for recursive search'),
        contextLines: z.number().optional().default(2).describe('Number of lines to show before and after each match for context'),
        maxFileSize: z.number().optional().default(1024 * 1024).describe('Maximum file size in bytes to search (default 1MB)'),
        encoding: z.enum(['utf8', 'utf-8', 'ascii', 'latin1']).optional().default('utf8').describe('File encoding to use when reading files'),
    }),
    outputSchema: z.object({
        success: z.boolean().describe('Whether the search was successful'),
        matches: z.array(z.object({
            fileName: z.string().describe('Name of the file'),
            filePath: z.string().describe('Full path to the file'),
            relativePath: z.string().describe('Path relative to search directory'),
            totalMatches: z.number().describe('Total number of matches in this file'),
            matches: z.array(z.object({
                lineNumber: z.number().describe('Line number where match was found (1-based)'),
                columnNumber: z.number().describe('Column number where match starts (1-based)'),
                matchedText: z.string().describe('The actual text that matched'),
                lineContent: z.string().describe('Full content of the line containing the match'),
                beforeContext: z.array(z.string()).describe('Lines before the match for context'),
                afterContext: z.array(z.string()).describe('Lines after the match for context'),
            })).describe('Individual matches within the file'),
        })).describe('Array of files containing matches'),
        totalFiles: z.number().describe('Total number of files that contained matches'),
        totalMatches: z.number().describe('Total number of individual matches found'),
        filesSearched: z.number().describe('Total number of files that were searched'),
        searchPath: z.string().describe('The resolved search path'),
        searchPattern: z.string().describe('The search pattern used'),
        message: z.string().optional().describe('Success or error message'),
    }),
    execute: async ({ context, mastra, writer }) => {
        const logger = mastra?.getLogger();

        const {
            searchPattern,
            searchPath,
            includeFiles,
            excludeFiles,
            caseSensitive,
            useRegex,
            wholeWord,
            maxResults,
            maxDepth,
            contextLines,
            maxFileSize,
            encoding
        } = context;

        logger?.info(`find-in-files-tool: ${JSON.stringify(context)}`);

        try {
            const resolvedPath = resolve(searchPath);
            await writer?.write({
                type: 'tool-start',
                args: { toolName: 'find-in-files-tool', searchPattern, searchPath: resolvedPath },
                status: 'pending'
            });

            const fileMatches: any[] = [];
            let totalMatches = 0;
            let filesSearched = 0;

            // Prepare search regex
            let searchRegex: RegExp;
            try {
                if (useRegex) {
                    const flags = caseSensitive ? 'g' : 'gi';
                    searchRegex = new RegExp(searchPattern, flags);
                } else {
                    let pattern = searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex chars
                    if (wholeWord) {
                        pattern = `\\b${pattern}\\b`;
                    }
                    const flags = caseSensitive ? 'g' : 'gi';
                    searchRegex = new RegExp(pattern, flags);
                }
            } catch (error) {
                throw new Error(`Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            const searchFiles = async (currentPath: string, currentDepth: number = 0): Promise<void> => {
                if (currentDepth > maxDepth) {
                    return;
                }

                if (totalMatches >= maxResults) {
                    return;
                }

                try {
                    const entries = await readdir(currentPath);

                    for (const entry of entries) {
                        if (totalMatches >= maxResults) {
                            break;
                        }

                        const fullPath = join(currentPath, entry);
                        const stats = await stat(fullPath);

                        if (stats.isDirectory()) {
                            // Check if directory should be excluded
                            const relativeDirPath = relative(resolvedPath, fullPath);
                            const shouldExcludeDir = excludeFiles?.some(pattern =>
                                matchesGlob(pattern, relativeDirPath) || matchesGlob(pattern, fullPath)
                            );

                            if (!shouldExcludeDir) {
                                await searchFiles(fullPath, currentDepth + 1);
                            }
                        } else if (stats.isFile()) {
                            // Skip files that are too large
                            if (stats.size > maxFileSize) {
                                continue;
                            }

                            const relativeFilePath = relative(resolvedPath, fullPath);

                            // Check include patterns
                            const shouldInclude = includeFiles?.some(pattern =>
                                matchesGlob(pattern, relativeFilePath) || matchesGlob(pattern, basename(fullPath))
                            ) ?? true;

                            if (!shouldInclude) {
                                continue;
                            }

                            // Check exclude patterns
                            const shouldExclude = excludeFiles?.some(pattern =>
                                matchesGlob(pattern, relativeFilePath) || matchesGlob(pattern, fullPath)
                            );

                            if (shouldExclude) {
                                continue;
                            }

                            // Search within the file
                            await searchInFile(fullPath, relativeFilePath);
                        }
                    }
                } catch (error) {
                    // Skip directories/files we can't access
                    logger?.warn(`Cannot access: ${currentPath}`);
                }
            };

            const searchInFile = async (filePath: string, relativePath: string): Promise<void> => {
                try {
                    filesSearched++;
                    const fileContent = await readFile(filePath, { encoding }) as string;
                    const lines = fileContent.split('\n');
                    const fileMatchResults: any[] = [];

                    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                        if (totalMatches >= maxResults) {
                            break;
                        }

                        const line = lines[lineIndex];
                        const matches = Array.from(line.matchAll(searchRegex));

                        for (const match of matches) {
                            if (totalMatches >= maxResults) {
                                break;
                            }

                            const columnNumber = (match.index ?? 0) + 1;
                            const matchedText = match[0];

                            // Get context lines
                            const beforeContext = [];
                            const afterContext = [];

                            // Before context
                            for (let i = Math.max(0, lineIndex - contextLines); i < lineIndex; i++) {
                                beforeContext.push(lines[i]);
                            }

                            // After context
                            for (let i = lineIndex + 1; i <= Math.min(lines.length - 1, lineIndex + contextLines); i++) {
                                afterContext.push(lines[i]);
                            }

                            fileMatchResults.push({
                                lineNumber: lineIndex + 1,
                                columnNumber,
                                matchedText,
                                lineContent: line,
                                beforeContext,
                                afterContext,
                            });

                            totalMatches++;
                        }
                    }

                    if (fileMatchResults.length > 0) {
                        fileMatches.push({
                            fileName: basename(filePath),
                            filePath,
                            relativePath,
                            totalMatches: fileMatchResults.length,
                            matches: fileMatchResults,
                        });
                    }
                } catch (error) {
                    // Skip files we can't read
                    logger?.warn(`Cannot read file: ${filePath} - ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            };

            await searchFiles(resolvedPath);

            // Sort file matches by number of matches (descending)
            fileMatches.sort((a, b) => b.totalMatches - a.totalMatches);

            const message = `Found ${totalMatches} matches in ${fileMatches.length} files (searched ${filesSearched} files)`;

            logger?.info(message);
            await writer?.write({
                type: 'tool-complete',
                args: { toolName: 'find-in-files-tool', searchPattern, searchPath: resolvedPath },
                status: 'success',
                result: { totalFiles: fileMatches.length, totalMatches, filesSearched }
            });

            return {
                success: true,
                matches: fileMatches,
                totalFiles: fileMatches.length,
                totalMatches,
                filesSearched,
                searchPath: resolvedPath,
                searchPattern,
                message,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            logger?.error(`Failed to search files: ${errorMessage}`);
            await writer?.write({
                type: 'tool-error',
                args: { toolName: 'find-in-files-tool', searchPattern, searchPath },
                status: 'error',
                error: errorMessage
            });

            return {
                success: false,
                matches: [],
                totalFiles: 0,
                totalMatches: 0,
                filesSearched: 0,
                searchPath: resolve(searchPath),
                searchPattern,
                message: `Failed to search files: ${errorMessage}`,
            };
        }
    },
});
