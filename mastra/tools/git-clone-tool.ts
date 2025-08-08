import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const gitCloneTool = createTool({
    id: 'git-clone-tool',
    description: 'Clone a GitHub repository using GitHub App authentication. Supports both public and private repositories.',
    inputSchema: z.object({
        repoUrl: z.string().describe('The GitHub repository URL (e.g., https://github.com/owner/repo.git)'),
        destinationPath: z.string().optional().describe('The local path where the repository should be cloned (optional, will use temp directory if not provided)'),
        branch: z.string().optional().describe('Specific branch to clone (defaults to default branch)'),
        depth: z.number().optional().describe('Create a shallow clone with a history truncated to the specified number of commits'),
    }),
    outputSchema: z.object({
        success: z.boolean().describe('Whether the clone operation was successful'),
        clonePath: z.string().describe('The actual path where the repository was cloned'),
        message: z.string().describe('Success or error message'),
        repositoryName: z.string().describe('The name of the cloned repository'),
        repositoryInfo: z.object({
            hasPackageJson: z.boolean().describe('Whether the repository contains a package.json file'),
            hasReadme: z.boolean().describe('Whether the repository contains a README file'),
            gitRemoteUrl: z.string().optional().describe('The git remote URL of the cloned repository'),
            currentBranch: z.string().optional().describe('The current branch of the cloned repository'),
        }).optional().describe('Additional information about the cloned repository'),
    }),
    execute: async ({ context, mastra }) => {
        const logger = mastra?.getLogger();
        const { repoUrl, destinationPath, branch, depth } = context;

        try {
            const wf = mastra?.getWorkflow('gitCloneWorkflow')
            const run = await wf?.createRunAsync()
            // @ts-ignore
            const { result } = await run?.start({
                inputData: {
                    repoUrl,
                    destinationPath,
                    branch,
                    depth,
                }
            })

            logger?.info(`Successfully cloned repository ${repoUrl} to ${result.clonePath}`);

            return {
                success: result.success,
                clonePath: result.clonePath,
                message: result.message,
                repositoryName: result.repositoryName,
                repositoryInfo: result.repositoryInfo,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            logger?.error(`Failed to clone repository ${repoUrl}: ${errorMessage}`);

            return {
                success: false,
                clonePath: '',
                message: `Failed to clone repository: ${errorMessage}`,
                repositoryName: '',
                repositoryInfo: undefined,
            };
        }
    },
});
