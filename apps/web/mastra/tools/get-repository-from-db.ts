import { Database } from '@/lib/database.types';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const getRepositoryInformation = async (repositoryId: string): Promise<Database['public']['Tables']['repos']['Row']> => {
    const response = await fetch(`/api/repositories/${repositoryId}`)
    if (!response.ok) {
        console.error('Failed to get repository analytics pattern', response)
        throw new Error('Failed to get repository analytics pattern')
    }
    return await response.json()
}

export const getRepositoryFromDBTool = createTool({
    id: 'get-repository-analytics-pattern-tool',
    description: 'Get the analytics pattern for existing repository',
    inputSchema: z.object({
        repositoryId: z.string(),
    }),
    execute: async ({ context, mastra }) => {
        const logger = mastra?.getLogger()
        const { repositoryId } = context
        logger?.info(`Getting repository ${repositoryId}`, { repositoryId })
        const repo = await getRepositoryInformation(repositoryId)
        logger?.info(`Found repository ${repo.id}`, { repositoryId })

        return {
            ...repo,
            patterns: (repo.meta as { foundPatterns: string[] }).foundPatterns,
            clonedPath: (repo.meta as { clonedPath: string }).clonedPath,
            repositoryId: repo.id
        }
    }
})