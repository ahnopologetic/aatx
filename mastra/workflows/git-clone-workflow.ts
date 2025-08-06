import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { access, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import {
    generateGitHubJWT,
    getGitHubInstallationId,
    generateGitHubInstallationToken,
    extractTargetIdentifier,
    createTemporaryDirectory,
} from '../utils';

const execAsync = promisify(exec);

const appId = process.env.GITHUB_APP_ID || '';
const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH || '';
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY || '';

const generateInstallationTokenStep = createStep({
    id: 'generate-installation-token',
    description: 'Generates a GitHub installation access token using JWT authentication',
    inputSchema: z.object({
        repoUrl: z.string().describe('The GitHub repository URL (e.g., https://github.com/owner/repo.git)'),
        destinationPath: z.string().optional().describe('The local path where the repository should be cloned'),
        branch: z.string().optional().describe('Specific branch to clone (defaults to default branch)'),
        depth: z.number().optional().describe('Create a shallow clone with a history truncated to the specified number of commits'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        installationToken: z.string(),
        installationId: z.number(),
        expiresAt: z.string(),
        permissions: z.record(z.string()),
        repositories: z.array(z.object({
            id: z.number(),
            name: z.string(),
            full_name: z.string(),
        })).optional(),
        message: z.string(),
        // Clone parameters passed through
        repoUrl: z.string().optional(),
        destinationPath: z.string().optional(),
        branch: z.string().optional(),
        depth: z.number().optional(),
    }),
    execute: async ({ inputData, mastra }) => {
        if (!inputData) {
            throw new Error('Input data not found');
        }

        const {
            repoUrl,
            destinationPath,
            branch,
            depth,
        } = inputData;
        const logger = mastra.getLogger();



        try {
            // Step 1: Generate JWT for the GitHub App
            const targetIdentifier = extractTargetIdentifier(repoUrl || ''); // e.g., user/reponame
            logger.info(`targetIdentifier: ${targetIdentifier}`);
            const jwt = generateGitHubJWT(appId, privateKeyPath, privateKey);

            const installationId = await getGitHubInstallationId(
                jwt,
                'app',
                targetIdentifier.split('/')[0]
            );

            const tokenInfo = await generateGitHubInstallationToken(
                jwt,
                installationId,
            );

            logger.info(`Successfully generated installation access token for ${targetIdentifier}`);

            return {
                success: true,
                installationToken: tokenInfo.accessToken,
                installationId: tokenInfo.installationId,
                expiresAt: tokenInfo.expiresAt,
                permissions: tokenInfo.permissions,
                repositories: tokenInfo.repositories,
                message: `Successfully generated installation access token for ${targetIdentifier}`,
                repoUrl,
                destinationPath,
                branch,
                depth,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logger.error(`Failed to generate installation access token: ${errorMessage}`);

            return {
                success: false,
                installationToken: '',
                installationId: 0,
                expiresAt: '',
                permissions: {},
                repositories: undefined,
                message: `Failed to generate installation access token: ${errorMessage}`,
                repoUrl,
                destinationPath,
                branch,
                depth,
            };
        }
    },
});


const cloneRepositoryStep = createStep({
    id: 'clone-repository',
    description: 'Clones a GitHub repository using installation token authentication',
    inputSchema: z.object({
        success: z.boolean(),
        installationToken: z.string(),
        installationId: z.number(),
        expiresAt: z.string(),
        permissions: z.record(z.string()),
        repositories: z.array(z.object({
            id: z.number(),
            name: z.string(),
            full_name: z.string(),
        })).optional(),
        message: z.string(),
        // Clone-specific parameters
        repoUrl: z.string().optional().describe('The GitHub repository URL (e.g., https://github.com/owner/repo.git)'),
        destinationPath: z.string().optional().describe('The local path where the repository should be cloned'),
        branch: z.string().optional().describe('Specific branch to clone (defaults to default branch)'),
        depth: z.number().optional().describe('Create a shallow clone with a history truncated to the specified number of commits'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        clonePath: z.string(),
        message: z.string(),
        repositoryName: z.string(),
    }),
    execute: async ({ inputData }) => {
        if (!inputData) {
            throw new Error('Input data not found');
        }

        // Check if token generation was successful
        if (!inputData.success) {
            return {
                success: false,
                clonePath: '',
                message: `Cannot clone repository: ${inputData.message}`,
                repositoryName: '',
            };
        }

        const { repoUrl, destinationPath, installationToken, branch, depth } = inputData;

        if (!repoUrl) {
            return {
                success: false,
                clonePath: '',
                message: 'Repository URL is required for cloning',
                repositoryName: '',
            };
        }

        try {
            // Extract repository name from URL
            const repoMatch = repoUrl.match(/\/([^\/]+?)(?:\.git)?$/);
            if (!repoMatch) {
                throw new Error('Invalid repository URL format');
            }
            const repositoryName = repoMatch[1];

            // Determine the clone path
            const clonePath = destinationPath || createTemporaryDirectory();

            // Create destination directory if it doesn't exist
            const parentDir = dirname(clonePath);
            try {
                await access(parentDir);
            } catch {
                await mkdir(parentDir, { recursive: true });
            }

            // Check if destination already exists
            try {
                await access(clonePath);
                throw new Error(`Destination path '${clonePath}' already exists`);
            } catch (error) {
                // Directory doesn't exist, which is what we want
                if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                    throw error;
                }
            }

            // Build the authenticated clone URL
            const urlParts = repoUrl.replace('https://', '').replace('.git', '');
            const authenticatedUrl = `https://x-access-token:${installationToken}@${urlParts}.git`;

            // Build git clone command
            let cloneCommand = `git clone "${authenticatedUrl}" "${clonePath}"`;

            // Add branch option if specified
            if (branch) {
                cloneCommand += ` --branch "${branch}"`;
            }

            // Add depth option if specified (shallow clone)
            if (depth && depth > 0) {
                cloneCommand += ` --depth ${depth}`;
            }

            // Execute the clone command
            const { stdout, stderr } = await execAsync(cloneCommand, {
                env: {
                    ...process.env,
                    GIT_TERMINAL_PROMPT: '0', // Disable interactive prompts
                },
                timeout: 300000, // 5 minute timeout
            });

            // Verify the clone was successful
            try {
                await access(join(clonePath, '.git'));
            } catch {
                throw new Error('Repository was not cloned successfully - .git directory not found');
            }

            return {
                success: true,
                clonePath,
                message: `Successfully cloned repository '${repositoryName}' to '${clonePath}'`,
                repositoryName,
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            return {
                success: false,
                clonePath: destinationPath || '',
                message: `Failed to clone repository: ${errorMessage}`,
                repositoryName: '',
            };
        }
    },
});

const validateRepositoryStep = createStep({
    id: 'validate-repository',
    description: 'Validates the cloned repository and provides basic information',
    inputSchema: z.object({
        success: z.boolean(),
        clonePath: z.string(),
        message: z.string(),
        repositoryName: z.string(),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        clonePath: z.string(),
        message: z.string(),
        repositoryName: z.string(),
        repositoryInfo: z.object({
            hasPackageJson: z.boolean(),
            hasReadme: z.boolean(),
            gitRemoteUrl: z.string().optional(),
            currentBranch: z.string().optional(),
        }).optional(),
    }),
    execute: async ({ inputData }) => {
        if (!inputData) {
            throw new Error('Input data not found');
        }

        // If the previous step failed, pass through the error
        if (!inputData.success) {
            return {
                ...inputData,
                repositoryInfo: undefined,
            };
        }

        const { clonePath, repositoryName } = inputData;

        try {
            const repositoryInfo = {
                hasPackageJson: false,
                hasReadme: false,
                gitRemoteUrl: undefined as string | undefined,
                currentBranch: undefined as string | undefined,
            };

            // Check for package.json
            try {
                await access(join(clonePath, 'package.json'));
                repositoryInfo.hasPackageJson = true;
            } catch {
                // File doesn't exist
            }

            // Check for README
            const readmeFiles = ['README.md', 'README.txt', 'README', 'readme.md', 'readme.txt', 'readme'];
            for (const readmeFile of readmeFiles) {
                try {
                    await access(join(clonePath, readmeFile));
                    repositoryInfo.hasReadme = true;
                    break;
                } catch {
                    // File doesn't exist, try next
                }
            }

            // Get git remote URL
            try {
                const { stdout: remoteUrl } = await execAsync('git config --get remote.origin.url', {
                    cwd: clonePath,
                });
                repositoryInfo.gitRemoteUrl = remoteUrl.trim();
            } catch {
                // Unable to get remote URL
            }

            // Get current branch
            try {
                const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', {
                    cwd: clonePath,
                });
                repositoryInfo.currentBranch = branch.trim();
            } catch {
                // Unable to get current branch
            }

            return {
                ...inputData,
                message: `${inputData.message}. Repository validated successfully.`,
                repositoryInfo,
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';

            return {
                ...inputData,
                message: `${inputData.message}. Validation warning: ${errorMessage}`,
                repositoryInfo: undefined,
            };
        }
    },
});

const gitCloneWorkflow = createWorkflow({
    id: 'git-clone-workflow',
    inputSchema: z.object({
        repoUrl: z.string().describe('The GitHub repository URL (e.g., https://github.com/owner/repo.git)'),
        destinationPath: z.string().optional().describe('The local path where the repository should be cloned'),
        branch: z.string().optional().describe('Specific branch to clone (defaults to default branch)'),
        depth: z.number().optional().describe('Create a shallow clone with a history truncated to the specified number of commits'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        clonePath: z.string(),
        message: z.string(),
        repositoryName: z.string(),
        repositoryInfo: z.object({
            hasPackageJson: z.boolean(),
            hasReadme: z.boolean(),
            gitRemoteUrl: z.string().optional(),
            currentBranch: z.string().optional(),
        }).optional(),
    }),
})
    .then(generateInstallationTokenStep)
    .then(cloneRepositoryStep)
    .then(validateRepositoryStep);

gitCloneWorkflow.commit();


export { gitCloneWorkflow };
