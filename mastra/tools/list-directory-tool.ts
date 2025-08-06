import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { readdir, stat } from 'fs/promises';
import { resolve, join } from 'path';

export const listDirectoryTool = createTool({
    id: 'list-directory-tool',
    description: 'List the contents of a directory, showing files and subdirectories with their types and sizes.',
    inputSchema: z.object({
        directoryPath: z.string().describe('The path to the directory to list'),
        showHidden: z.boolean().optional().default(false).describe('Whether to show hidden files and directories (starting with .)'),
        recursive: z.boolean().optional().default(false).describe('Whether to recursively list subdirectories'),
        maxDepth: z.number().optional().default(3).describe('Maximum depth for recursive listing (only used when recursive is true)'),
        sortBy: z.enum(['name', 'size', 'type', 'modified']).optional().default('name').describe('How to sort the results'),
    }),
    outputSchema: z.object({
        success: z.boolean().describe('Whether the directory was listed successfully'),
        directoryPath: z.string().describe('The resolved directory path'),
        items: z.array(z.object({
            name: z.string().describe('Name of the file or directory'),
            path: z.string().describe('Full path to the item'),
            type: z.enum(['file', 'directory', 'symlink', 'other']).describe('Type of the item'),
            size: z.number().describe('Size in bytes (0 for directories)'),
            modified: z.string().describe('Last modified date (ISO string)'),
            isHidden: z.boolean().describe('Whether the item is hidden'),
            depth: z.number().describe('Depth level (0 for root level)'),
        })).describe('List of items in the directory'),
        totalItems: z.number().describe('Total number of items found'),
        message: z.string().optional().describe('Success or error message'),
    }),
    execute: async ({ context, mastra }) => {
        const logger = mastra?.logger;
        const { directoryPath, showHidden, recursive, maxDepth, sortBy } = context;

        try {
            const resolvedPath = resolve(directoryPath);
            const items: any[] = [];

            const listItems = async (currentPath: string, currentDepth: number = 0): Promise<void> => {
                if (recursive && currentDepth > maxDepth) {
                    return;
                }

                const entries = await readdir(currentPath);
                
                for (const entry of entries) {
                    if (!showHidden && entry.startsWith('.')) {
                        continue;
                    }

                    const fullPath = join(currentPath, entry);
                    const stats = await stat(fullPath);
                    
                    let type: 'file' | 'directory' | 'symlink' | 'other';
                    if (stats.isFile()) {
                        type = 'file';
                    } else if (stats.isDirectory()) {
                        type = 'directory';
                    } else if (stats.isSymbolicLink()) {
                        type = 'symlink';
                    } else {
                        type = 'other';
                    }

                    items.push({
                        name: entry,
                        path: fullPath,
                        type,
                        size: type === 'file' ? stats.size : 0,
                        modified: stats.mtime.toISOString(),
                        isHidden: entry.startsWith('.'),
                        depth: currentDepth,
                    });

                    // Recursively list subdirectories if requested
                    if (recursive && type === 'directory' && currentDepth < maxDepth) {
                        try {
                            await listItems(fullPath, currentDepth + 1);
                        } catch (error) {
                            // Skip directories we can't access
                            logger?.warn(`Cannot access directory: ${fullPath}`);
                        }
                    }
                }
            };

            await listItems(resolvedPath);

            // Sort items based on sortBy parameter
            items.sort((a, b) => {
                switch (sortBy) {
                    case 'size':
                        return b.size - a.size;
                    case 'type':
                        return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
                    case 'modified':
                        return new Date(b.modified).getTime() - new Date(a.modified).getTime();
                    case 'name':
                    default:
                        return a.name.localeCompare(b.name);
                }
            });

            logger?.info(`Successfully listed ${items.length} items in ${resolvedPath}${recursive ? ` (recursive, max depth ${maxDepth})` : ''}`);

            return {
                success: true,
                directoryPath: resolvedPath,
                items,
                totalItems: items.length,
                message: `Successfully listed ${items.length} items in ${resolvedPath}${recursive ? ` (recursive, max depth ${maxDepth})` : ''}`,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            logger?.error(`Failed to list directory: ${errorMessage}`);

            return {
                success: false,
                directoryPath: resolve(directoryPath),
                items: [],
                totalItems: 0,
                message: `Failed to list directory: ${errorMessage}`,
            };
        }
    },
});