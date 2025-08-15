import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import fs from 'fs';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import {
    generateGitHubJWT,
    getGitHubInstallationId,
    generateGitHubInstallationToken,
    extractTargetIdentifier,
} from '../utils';

const appId = process.env.GITHUB_APP_ID || '';
const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH || '';
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY || '';

const setupGitConfigStep = createStep({
    id: 'setup-git-config',
    description: 'Configure Git with aatx GitHub app credentials',
    inputSchema: z.object({
        repoPath: z.string().describe('Local path to the repository'),
        repoUrl: z.string().describe('Repository URL for authentication'),
        commitMessage: z.string().optional().describe('Custom commit message (will auto-generate if not provided)'),
        branch: z.string().optional().describe('Target branch (defaults to main)'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        installationToken: z.string(),
        repoPath: z.string(),
        repoUrl: z.string(),
        commitMessage: z.string().optional(),
        branch: z.string().optional(),
    }),
    execute: async ({ inputData, mastra }) => {
        const logger = mastra.getLogger();

        if (!inputData) {
            throw new Error('Input data not found');
        }

        const { repoPath, repoUrl, commitMessage, branch } = inputData;

        try {
            // Generate GitHub installation token for authentication
            const targetIdentifier = extractTargetIdentifier(repoUrl);
            logger.info(`Setting up git config for: ${targetIdentifier}`);

            const jwt = generateGitHubJWT(appId, privateKeyPath, privateKey);
            logger.info(`Generated GitHub JWT for: ${targetIdentifier}`, { jwt });
            const installationId = await getGitHubInstallationId(
                jwt,
                'user',
                targetIdentifier.split('/')[0]
            );
            logger.info(`Installation ID for: ${targetIdentifier}`, { installationId });
            const tokenInfo = await generateGitHubInstallationToken(jwt, installationId);
            logger.info(`Generated GitHub installation token for: ${targetIdentifier}`, { tokenInfo });

            // Set git config for aatx app
            await git.setConfig({
                fs,
                dir: repoPath,
                path: 'user.name',
                value: 'aatx'
            });

            await git.setConfig({
                fs,
                dir: repoPath,
                path: 'user.email',
                value: 'aatx@analytics.dev'
            });

            logger.info('Git config successfully set for aatx GitHub app');

            return {
                success: true,
                message: 'Git config successfully configured for aatx GitHub app',
                installationToken: tokenInfo.accessToken,
                repoPath,
                repoUrl,
                commitMessage,
                branch,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logger.error(`Failed to setup git config: ${errorMessage}`);

            return {
                success: false,
                message: `Failed to setup git config: ${errorMessage}`,
                installationToken: '',
                repoPath,
                repoUrl,
                commitMessage,
                branch,
            };
        }
    },
});

const stageChangesStep = createStep({
    id: 'stage-changes',
    description: 'Add current changes to staging area using isomorphic-git',
    inputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        installationToken: z.string(),
        repoPath: z.string(),
        repoUrl: z.string(),
        commitMessage: z.string().optional(),
        branch: z.string().optional(),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        installationToken: z.string(),
        repoPath: z.string(),
        repoUrl: z.string(),
        stagedFiles: z.array(z.string()),
        commitMessage: z.string().optional(),
        branch: z.string().optional(),
    }),
    execute: async ({ inputData, mastra }) => {
        const logger = mastra.getLogger();

        if (!inputData) {
            throw new Error('Input data not found');
        }

        if (!inputData.success) {
            return {
                ...inputData,
                stagedFiles: [],
            };
        }

        const { repoPath, installationToken, repoUrl, commitMessage, branch } = inputData;

        try {
            logger.info('Staging changes using isomorphic-git...');

            // Get status of all files to determine what needs to be staged
            const statusMatrix = await git.statusMatrix({ fs, dir: repoPath });
            const stagedFiles: string[] = [];

            // Stage files based on their status
            // statusMatrix format: [filepath, HEADStatus, workdirStatus, stageStatus]
            for (const [filepath, , workdirStatus] of statusMatrix) {
                // If file exists in working directory and has changes
                if (workdirStatus === 2) {
                    await git.add({ fs, dir: repoPath, filepath });
                    stagedFiles.push(filepath);
                    // logger.info(`Staged file: ${filepath}`);
                } 
                // else if (workdirStatus === 0) {
                //     // File was deleted, remove it
                //     await git.remove({ fs, dir: repoPath, filepath });
                //     stagedFiles.push(filepath);
                //     // logger.info(`Removed file: ${filepath}`);
                // }
            }

            logger.info(`Successfully staged ${stagedFiles.length} files`);

            return {
                success: true,
                message: `Successfully staged ${stagedFiles.length} files`,
                installationToken,
                repoPath,
                repoUrl,
                stagedFiles,
                commitMessage,
                branch,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logger.error(`Failed to stage changes: ${errorMessage}`);

            return {
                success: false,
                message: `Failed to stage changes: ${errorMessage}`,
                installationToken,
                repoPath,
                repoUrl,
                stagedFiles: [],
                commitMessage,
                branch,
            };
        }
    },
});

const commitChangesStep = createStep({
    id: 'commit-changes',
    description: 'Commit staged changes with proper message',
    inputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        installationToken: z.string(),
        repoPath: z.string(),
        repoUrl: z.string(),
        stagedFiles: z.array(z.string()),
        commitMessage: z.string().optional(),
        branch: z.string().optional(),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        installationToken: z.string(),
        repoPath: z.string(),
        repoUrl: z.string(),
        commitSha: z.string(),
        commitMessage: z.string(),
        branch: z.string().optional(),
    }),
    execute: async ({ inputData, mastra }) => {
        const logger = mastra.getLogger();

        if (!inputData) {
            throw new Error('Input data not found');
        }

        if (!inputData.success) {
            return {
                ...inputData,
                commitSha: '',
                commitMessage: '',
            };
        }

        const { repoPath, installationToken, repoUrl, stagedFiles, branch } = inputData;

        try {
            if (stagedFiles.length === 0) {
                logger.info('No changes to commit');
                return {
                    success: true,
                    message: 'No changes to commit',
                    installationToken,
                    repoPath,
                    repoUrl,
                    commitSha: '',
                    commitMessage: 'No changes to commit',
                    branch,
                };
            }

            // Generate commit message if not provided
            const commitMessage = inputData.commitMessage ||
                `chore: update ${stagedFiles.length} file${stagedFiles.length !== 1 ? 's' : ''}\n\nAutomated commit by aatx`;

            logger.info('Creating commit...');

            const commitSha = await git.commit({
                fs,
                dir: repoPath,
                message: commitMessage,
                author: {
                    name: 'aatx',
                    email: 'aatx@analytics.dev',
                },
            });

            logger.info(`Successfully created commit: ${commitSha}`);

            return {
                success: true,
                message: `Successfully created commit: ${commitSha}`,
                installationToken,
                repoPath,
                repoUrl,
                commitSha,
                commitMessage,
                branch,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logger.error(`Failed to commit changes: ${errorMessage}`);

            return {
                success: false,
                message: `Failed to commit changes: ${errorMessage}`,
                installationToken,
                repoPath,
                repoUrl,
                commitSha: '',
                commitMessage: '',
                branch,
            };
        }
    },
});

const pushChangesStep = createStep({
    id: 'push-changes',
    description: 'Push committed changes to remote origin',
    inputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        installationToken: z.string(),
        repoPath: z.string(),
        repoUrl: z.string(),
        commitSha: z.string(),
        commitMessage: z.string(),
        branch: z.string().optional().describe('Target branch (defaults to current branch)'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        commitSha: z.string(),
        pushResult: z.object({
            ok: z.boolean(),
            refs: z.record(z.object({
                ok: z.boolean(),
                error: z.string().optional(),
            })).optional(),
        }).optional(),
    }),
    execute: async ({ inputData, mastra }) => {
        const logger = mastra.getLogger();

        if (!inputData) {
            throw new Error('Input data not found');
        }

        if (!inputData.success || !inputData.commitSha) {
            return {
                success: false,
                message: 'Cannot push: No valid commit to push',
                commitSha: inputData.commitSha || '',
                pushResult: undefined,
            };
        }

        const { repoPath, installationToken, branch = 'main', commitSha } = inputData;

        try {
            logger.info(`Pushing changes to origin/${branch}...`);

            const pushResult = await git.push({
                fs,
                http,
                dir: repoPath,
                remote: 'origin',
                ref: branch,
                onAuth: () => ({
                    username: 'x-access-token',
                    password: installationToken,
                }),
            });

            logger.info('Successfully pushed changes to remote');

            return {
                success: true,
                message: `Successfully pushed commit ${commitSha} to origin/${branch}`,
                commitSha,
                pushResult,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logger.error(`Failed to push changes: ${errorMessage}`);

            return {
                success: false,
                message: `Failed to push changes: ${errorMessage}`,
                commitSha,
                pushResult: undefined,
            };
        }
    },
});

const gitCommitAndCreatePrWorkflow = createWorkflow({
    id: 'git-commit-and-create-pr-workflow',
    inputSchema: z.object({
        repoPath: z.string().describe('Local path to the repository'),
        repoUrl: z.string().describe('Repository URL for authentication'),
        commitMessage: z.string().optional().describe('Custom commit message (will auto-generate if not provided)'),
        branch: z.string().optional().describe('Target branch (defaults to main)'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        commitSha: z.string(),
        pushResult: z.object({
            ok: z.boolean(),
            refs: z.record(z.object({
                ok: z.boolean(),
                error: z.string().optional(),
            })).optional(),
        }).optional(),
    }),
})
    .then(setupGitConfigStep)
    .then(stageChangesStep)
    .then(commitChangesStep)
    .then(pushChangesStep);

gitCommitAndCreatePrWorkflow.commit();

export { gitCommitAndCreatePrWorkflow };
