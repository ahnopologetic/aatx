import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { readdir, stat } from 'fs/promises';
import { resolve, join, basename, extname, relative } from 'path';

export const searchFilesTool = createTool({
    id: 'search-files-tool',
    description: 'Find files by name using fuzzy matching. Searches through directory structures to find files that match the given pattern.',
    inputSchema: z.object({
        searchPattern: z.string().describe('The file name pattern to search for (supports fuzzy matching)'),
        searchPath: z.string().describe('The directory path to search in'),
        recursive: z.boolean().optional().default(true).describe('Whether to search recursively in subdirectories'),
        maxDepth: z.number().optional().default(10).describe('Maximum depth for recursive search'),
        maxResults: z.number().optional().default(50).describe('Maximum number of results to return'),
        includeExtensions: z.array(z.string()).optional().describe('File extensions to include (e.g., [".ts", ".js"])'),
        excludeExtensions: z.array(z.string()).optional().describe('File extensions to exclude (e.g., [".log", ".tmp"])'),
        excludeDirectories: z.array(z.string()).optional().default(['node_modules', '.git', 'dist', 'build']).describe('Directory names to exclude from search'),
        caseSensitive: z.boolean().optional().default(false).describe('Whether the search should be case sensitive'),
        exactMatch: z.boolean().optional().default(false).describe('Whether to use exact matching instead of fuzzy matching'),
    }),
    outputSchema: z.object({
        success: z.boolean().describe('Whether the search was successful'),
        matches: z.array(z.object({
            fileName: z.string().describe('Name of the file'),
            filePath: z.string().describe('Full path to the file'),
            relativePath: z.string().describe('Path relative to search directory'),
            directory: z.string().describe('Directory containing the file'),
            extension: z.string().describe('File extension'),
            size: z.number().describe('File size in bytes'),
            modified: z.string().describe('Last modified date (ISO string)'),
            score: z.number().describe('Match score (0-1, higher is better)'),
            depth: z.number().describe('Directory depth from search root'),
        })).describe('Array of matching files found'),
        totalMatches: z.number().describe('Total number of matches found'),
        searchPath: z.string().describe('The resolved search path'),
        searchPattern: z.string().describe('The search pattern used'),
        message: z.string().optional().describe('Success or error message'),
    }),
    execute: async ({ context, mastra, writer }) => {
        const logger = mastra?.getLogger();

        const { 
            searchPattern, 
            searchPath, 
            recursive, 
            maxDepth,
            maxResults,
            includeExtensions,
            excludeExtensions,
            excludeDirectories,
            caseSensitive,
            exactMatch
        } = context;

        try {
            const resolvedPath = resolve(searchPath);
            await writer?.write({ type: 'tool-start', args: { toolName: 'search-files-tool', searchPattern, searchPath: resolvedPath }, status: 'pending' });
            const matches: any[] = [];

            // Normalize search pattern for comparison
            const normalizedPattern = caseSensitive ? searchPattern : searchPattern.toLowerCase();

            const searchFiles = async (currentPath: string, currentDepth: number = 0): Promise<void> => {
                if (recursive && currentDepth > maxDepth) {
                    return;
                }

                try {
                    const entries = await readdir(currentPath);
                    
                    for (const entry of entries) {
                        const fullPath = join(currentPath, entry);
                        const stats = await stat(fullPath);
                        
                        if (stats.isDirectory()) {
                            // Skip excluded directories
                            if (excludeDirectories && excludeDirectories.includes(entry)) {
                                continue;
                            }
                            
                            // Recursively search subdirectories
                            if (recursive && currentDepth < maxDepth) {
                                await searchFiles(fullPath, currentDepth + 1);
                            }
                        } else if (stats.isFile()) {
                            const fileName = basename(entry);
                            const fileExt = extname(entry);
                            
                            // Check extension filters
                            if (includeExtensions && !includeExtensions.includes(fileExt)) {
                                continue;
                            }
                            if (excludeExtensions && excludeExtensions.includes(fileExt)) {
                                continue;
                            }
                            
                            // Calculate match score
                            const normalizedFileName = caseSensitive ? fileName : fileName.toLowerCase();
                            let score = 0;
                            
                            if (exactMatch) {
                                score = normalizedFileName === normalizedPattern ? 1 : 0;
                            } else {
                                score = calculateFuzzyScore(normalizedPattern, normalizedFileName);
                            }
                            
                            // Only include files with a reasonable match score
                            if (score > 0) {
                                matches.push({
                                    fileName,
                                    filePath: fullPath,
                                    relativePath: relative(resolvedPath, fullPath),
                                    directory: currentPath,
                                    extension: fileExt,
                                    size: stats.size,
                                    modified: stats.mtime.toISOString(),
                                    score,
                                    depth: currentDepth,
                                });
                            }
                        }
                    }
                } catch (error) {
                    // Skip directories we can't access
                    logger?.warn(`Cannot access directory: ${currentPath}`);
                }
            };

            await searchFiles(resolvedPath);

            // Sort by score (descending) and then by name
            matches.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return a.fileName.localeCompare(b.fileName);
            });

            // Limit results
            const limitedMatches = matches.slice(0, maxResults);

            logger?.info(`Successfully found ${limitedMatches.length} files matching "${searchPattern}" in ${resolvedPath}`);
            await writer?.write({ type: 'tool-complete', args: { toolName: 'search-files-tool', searchPattern, searchPath: resolvedPath }, status: 'success', result: { totalMatches: limitedMatches.length } });

            return {
                success: true,
                matches: limitedMatches,
                totalMatches: limitedMatches.length,
                searchPath: resolvedPath,
                searchPattern,
                message: `Found ${limitedMatches.length} files matching "${searchPattern}" in ${resolvedPath}`,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            logger?.error(`Failed to search files: ${errorMessage}`);
            await writer?.write({ type: 'tool-error', args: { toolName: 'search-files-tool', searchPattern, searchPath }, status: 'error', error: errorMessage });

            return {
                success: false,
                matches: [],
                totalMatches: 0,
                searchPath: resolve(searchPath),
                searchPattern,
                message: `Failed to search files: ${errorMessage}`,
            };
        }
    },
});

// Simple fuzzy matching algorithm
function calculateFuzzyScore(pattern: string, text: string): number {
    if (pattern.length === 0) return 0;
    if (text.length === 0) return 0;
    
    // Exact match gets highest score
    if (text === pattern) return 1;
    
    // Check if text contains pattern as substring
    if (text.includes(pattern)) {
        return 0.8 - (text.length - pattern.length) / text.length * 0.3;
    }
    
    // Check if text starts with pattern
    if (text.startsWith(pattern)) {
        return 0.7 - (text.length - pattern.length) / text.length * 0.2;
    }
    
    // Fuzzy matching: check if all characters of pattern appear in order in text
    let patternIndex = 0;
    let matchedChars = 0;
    
    for (let i = 0; i < text.length && patternIndex < pattern.length; i++) {
        if (text[i] === pattern[patternIndex]) {
            patternIndex++;
            matchedChars++;
        }
    }
    
    if (matchedChars === pattern.length) {
        // All characters found in order - calculate score based on density
        const density = matchedChars / text.length;
        const completeness = matchedChars / pattern.length;
        return density * completeness * 0.6;
    }
    
    // Check for partial matches
    const partialScore = matchedChars / pattern.length;
    return partialScore > 0.3 ? partialScore * 0.3 : 0;
}