/**
 * Git Clone Workflow using isomorphic-git
 * 
 * Error Format for Agent Interpretation:
 * Errors are returned in the format: "[STEP]_FAILED:[ERROR_TYPE]: [Human-readable message]"
 * 
 * Error Types:
 * - TOKEN_GENERATION_FAILED: Issues with GitHub App authentication
 *   - GITHUB_APP_CONFIG_ERROR: App ID or private key issues
 *   - INSTALLATION_NOT_FOUND: App not installed for repository owner
 *   - UNAUTHORIZED_ERROR/FORBIDDEN_ERROR: Permission issues
 *   - NETWORK_ERROR: GitHub API connection problems
 * 
 * - CLONE_FAILED: Issues during repository cloning
 *   - AUTHENTICATION_ERROR: GitHub auth failed during clone
 *   - REPOSITORY_NOT_FOUND: Repository doesn't exist or no access
 *   - NETWORK_ERROR: Network/connection issues
 *   - PERMISSION_ERROR: File system permission issues
 *   - DESTINATION_EXISTS: Target directory already exists
 *   - INVALID_URL: Malformed repository URL
 * 
 * - VALIDATION_FAILED: Issues during post-clone validation
 *   - REPOSITORY_PATH_ERROR: Path access issues
 *   - PERMISSION_ERROR: File system permissions
 *   - GIT_ERROR: Git repository corruption or issues
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { access, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import * as fs from 'fs';
import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import {
    generateGitHubJWT,
    getGitHubInstallationId,
    generateGitHubInstallationToken,
    extractTargetIdentifier,
    createTemporaryDirectory,
} from '../utils';

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
                'user',
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
            let errorType = 'UNKNOWN_ERROR';
            let errorMessage = 'Unknown error occurred';
            let errorDetails = '';

            if (error instanceof Error) {
                errorMessage = error.message;
                errorDetails = error.stack || '';

                // Categorize specific error types for agents to understand
                if (error.message.includes('GitHub App') || error.message.includes('private key')) {
                    errorType = 'GITHUB_APP_CONFIG_ERROR';
                    errorMessage = 'GitHub App configuration error. Check app ID and private key.';
                } else if (error.message.includes('Installation not found') || error.message.includes('404')) {
                    errorType = 'INSTALLATION_NOT_FOUND';
                    errorMessage = 'GitHub App installation not found for this repository owner.';
                } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                    errorType = 'UNAUTHORIZED_ERROR';
                    errorMessage = 'Unauthorized access. Check GitHub App permissions.';
                } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
                    errorType = 'FORBIDDEN_ERROR';
                    errorMessage = 'Access forbidden. GitHub App may not have required permissions.';
                } else if (error.message.includes('Network') || error.message.includes('ENOTFOUND')) {
                    errorType = 'NETWORK_ERROR';
                    errorMessage = 'Network error accessing GitHub API.';
                }
            }

            logger.error(`Token generation failed with ${errorType}: ${errorMessage}`, { errorDetails });

            return {
                success: false,
                installationToken: '',
                installationId: 0,
                expiresAt: '',
                permissions: {},
                repositories: undefined,
                message: `TOKEN_GENERATION_FAILED:${errorType}: ${errorMessage}`,
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
    execute: async ({ inputData, mastra }) => {
        const logger = mastra.getLogger();
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
            if (!clonePath) {
                throw new Error('Cannot find clone path');
            }

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

            // Clone using isomorphic-git
            logger.info(`Cloning repository ${repoUrl} to ${clonePath}`);

            const cloneOptions: any = {
                fs,
                http,
                dir: clonePath,
                url: repoUrl,
                onAuth: () => ({
                    username: 'x-access-token',
                    password: installationToken
                }),
                singleBranch: true,
                corsProxy: undefined
            };

            // Add branch option if specified
            if (branch) {
                cloneOptions.ref = branch;
            }

            // Add depth option if specified (shallow clone)
            if (depth && depth > 0) {
                cloneOptions.depth = depth;
            }

            // Execute the clone command
            await git.clone(cloneOptions);
            logger.info(`Successfully cloned repository to ${clonePath}`);

            // Verify the clone was successful
            try {
                await access(join(clonePath, '.git'));
            } catch {
                logger.error(`Repository was not cloned successfully - .git directory not found`);
                throw new Error('Repository was not cloned successfully - .git directory not found');
            }

            return {
                success: true,
                clonePath,
                message: `Successfully cloned repository '${repositoryName}' to '${clonePath}'`,
                repositoryName,
            };

        } catch (error) {
            let errorType = 'UNKNOWN_ERROR';
            let errorMessage = 'Unknown error occurred';
            let errorDetails = '';

            if (error instanceof Error) {
                errorMessage = error.message;
                errorDetails = error.stack || '';

                // Categorize specific error types for agents to understand
                if (error.message.includes('Authentication failed') || error.message.includes('403')) {
                    errorType = 'AUTHENTICATION_ERROR';
                    errorMessage = 'GitHub authentication failed. Check installation token permissions.';
                } else if (error.message.includes('Repository not found') || error.message.includes('404')) {
                    errorType = 'REPOSITORY_NOT_FOUND';
                    errorMessage = 'Repository not found or access denied. Verify URL and permissions.';
                } else if (error.message.includes('Network') || error.message.includes('timeout') || error.message.includes('ENOTFOUND')) {
                    errorType = 'NETWORK_ERROR';
                    errorMessage = 'Network error occurred during cloning. Check internet connection.';
                } else if (error.message.includes('Permission denied') || error.message.includes('EACCES')) {
                    errorType = 'PERMISSION_ERROR';
                    errorMessage = 'Permission denied. Check file system permissions for destination path.';
                } else if (error.message.includes('already exists')) {
                    errorType = 'DESTINATION_EXISTS';
                    errorMessage = 'Destination directory already exists. Choose a different path.';
                } else if (error.message.includes('Invalid') || error.message.includes('malformed')) {
                    errorType = 'INVALID_URL';
                    errorMessage = 'Invalid repository URL format.';
                }
            }

            logger.error(`Clone failed with ${errorType}: ${errorMessage}`, { errorDetails });

            return {
                success: false,
                clonePath: destinationPath || '',
                message: `CLONE_FAILED:${errorType}: ${errorMessage}`,
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

            // Get git remote URL using isomorphic-git
            try {
                const remotes = await git.listRemotes({ fs, dir: clonePath });
                const originRemote = remotes.find(remote => remote.remote === 'origin');
                if (originRemote) {
                    repositoryInfo.gitRemoteUrl = originRemote.url;
                }
            } catch (error) {
                // Unable to get remote URL - log for debugging but don't fail
                // console.log('Could not retrieve remote URL:', error);
            }

            // Get current branch using isomorphic-git
            try {
                const currentBranch = await git.currentBranch({ fs, dir: clonePath, fullname: false });
                repositoryInfo.currentBranch = currentBranch || undefined;
            } catch (error) {
                // Unable to get current branch - log for debugging but don't fail
                // console.log('Could not retrieve current branch:', error);
            }

            return {
                ...inputData,
                message: `${inputData.message}. Repository validated successfully.`,
                repositoryInfo,
            };

        } catch (error) {
            let errorType = 'VALIDATION_ERROR';
            let errorMessage = 'Unknown validation error';

            if (error instanceof Error) {
                errorMessage = error.message;

                // Categorize validation-specific errors
                if (error.message.includes('ENOENT') || error.message.includes('not found')) {
                    errorType = 'REPOSITORY_PATH_ERROR';
                    errorMessage = 'Repository path not accessible or does not exist.';
                } else if (error.message.includes('EACCES') || error.message.includes('Permission denied')) {
                    errorType = 'PERMISSION_ERROR';
                    errorMessage = 'Permission denied accessing repository files.';
                } else if (error.message.includes('git') || error.message.includes('Not a git repository')) {
                    errorType = 'GIT_ERROR';
                    errorMessage = 'Git operations failed or repository is corrupted.';
                }
            }

            return {
                ...inputData,
                message: `${inputData.message}. VALIDATION_FAILED:${errorType}: ${errorMessage}`,
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
