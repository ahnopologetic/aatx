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
        branch: z.string(),
        branchName: z.string(),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        installationToken: z.string(),
        repoPath: z.string(),
        repoUrl: z.string(),
        stagedFiles: z.array(z.string()),
        commitMessage: z.string().optional(),
        branch: z.string(),
        branchName: z.string(),
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

        const { repoPath, installationToken, repoUrl, commitMessage, branch, branchName } = inputData;

        try {
            logger.info('Staging changes using isomorphic-git...');

            // Get status of all files to determine what needs to be staged
            const statusMatrix = await git.statusMatrix({ fs, dir: repoPath });

            const changedFiles: string[] = []

            for (const [filepath, head, workdir, stage] of statusMatrix) {
                // statusMatrix gives us the file’s state in HEAD, workdir, and stage
                // Possible states:
                // 0 = absent, 1 = present
                // head = HEAD, workdir = working dir, stage = index
                // Changed files: workdir !== head OR stage !== workdir
                if (workdir !== head) {
                    changedFiles.push(filepath)
                }
            }

            logger.info('Changed files:', changedFiles)

            const stagedFiles: string[] = []
            for (const file of changedFiles) {
                await git.add({ fs, dir: repoPath, filepath: file })
                stagedFiles.push(file)
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
                branchName,
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
                branchName,
            };
        }
    },
});

const createBranchStep = createStep({
    id: 'create-branch',
    description: 'Create a new branch for the changes',
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
        commitMessage: z.string().optional(),
        branch: z.string(),
        branchName: z.string(),
    }),
    execute: async ({ inputData, mastra }) => {
        const logger = mastra.getLogger();

        if (!inputData) {
            throw new Error('Input data not found');
        }

        if (!inputData.success) {
            return {
                ...inputData,
                branch: '',
                branchName: '',
            };
        }

        const { repoPath } = inputData;

        try {

            // Generate branch name based on timestamp and changes
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const branchName = `aatx/automated-changes-${timestamp}`;

            logger.info(`Creating new branch: ${branchName}`);

            // Create and checkout new branch
            await git.branch({
                fs,
                dir: repoPath,
                ref: branchName,
            });

            await git.checkout({
                fs,
                dir: repoPath,
                ref: branchName,
            });

            logger.info(`Successfully created and checked out branch: ${branchName}`);

            return {
                ...inputData,
                success: true,
                message: `Successfully created branch: ${branchName}`,
                branch: branchName,
                branchName,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logger.error(`Failed to create branch: ${errorMessage}`);

            return {
                ...inputData,
                success: false,
                message: `Failed to create branch: ${errorMessage}`,
                branch: 'main',
                branchName: 'main',
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
        branch: z.string(),
        branchName: z.string(),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        installationToken: z.string(),
        repoPath: z.string(),
        repoUrl: z.string(),
        stagedFiles: z.array(z.string()),
        commitSha: z.string(),
        commitMessage: z.string(),
        branch: z.string(),
        branchName: z.string(),
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

        const { repoPath, installationToken, repoUrl, stagedFiles, branch, branchName } = inputData;

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
                    branchName,
                    stagedFiles,
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
                stagedFiles,
                commitSha,
                commitMessage,
                branch,
                branchName,
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
                stagedFiles,
                commitSha: '',
                commitMessage: '',
                branch,
                branchName,
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
        branch: z.string(),
        branchName: z.string(),
        stagedFiles: z.array(z.string()),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        commitSha: z.string(),
        commitMessage: z.string(),
        pushResult: z.object({
            ok: z.boolean(),
            refs: z.record(z.object({
                ok: z.boolean(),
                error: z.string().optional(),
            })).optional(),
        }).optional(),
        repoUrl: z.string(),
        installationToken: z.string(),
        branch: z.string(),
        branchName: z.string(),
        stagedFiles: z.array(z.string()),
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
                commitMessage: inputData.commitMessage || '',
                pushResult: undefined,
                repoUrl: inputData.repoUrl || '',
                installationToken: inputData.installationToken || '',
                branch: inputData.branch || '',
                branchName: inputData.branchName || '',
                stagedFiles: inputData.stagedFiles || [],
            };
        }

        const { repoPath, installationToken, repoUrl, branch, branchName, commitSha, commitMessage, stagedFiles } = inputData;

        try {
            logger.info(`Pushing changes to origin/${branchName}...`);

            const pushResult = await git.push({
                fs,
                http,
                dir: repoPath,
                remote: 'origin',
                ref: branchName,
                onAuth: () => ({
                    username: 'x-access-token',
                    password: installationToken,
                }),
            });

            logger.info('Successfully pushed changes to remote');

            return {
                success: true,
                message: `Successfully pushed commit ${commitSha} to origin/${branchName}`,
                commitSha,
                commitMessage,
                pushResult,
                repoUrl,
                installationToken,
                branch,
                branchName,
                stagedFiles,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logger.error(`Failed to push changes: ${errorMessage}`);

            return {
                success: false,
                message: `Failed to push changes: ${errorMessage}`,
                commitSha,
                commitMessage,
                pushResult: undefined,
                repoUrl,
                installationToken,
                branch,
                branchName,
                stagedFiles,
            };
        }
    },
});

const createPullRequestStep = createStep({
    id: 'create-pull-request',
    description: 'Create a GitHub Pull Request for the changes',
    inputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        commitSha: z.string(),
        commitMessage: z.string(),
        pushResult: z.object({
            ok: z.boolean(),
            refs: z.record(z.object({
                ok: z.boolean(),
                error: z.string().optional(),
            })).optional(),
        }).optional(),
        repoUrl: z.string(),
        installationToken: z.string(),
        branch: z.string(),
        branchName: z.string(),
        stagedFiles: z.array(z.string()),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        commitSha: z.string(),
        branchName: z.string(),
        pullRequest: z.object({
            number: z.number(),
            url: z.string(),
            title: z.string(),
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
                message: 'Cannot create PR: No successful commit to create PR for',
                commitSha: inputData.commitSha || '',
                branchName: inputData.branchName || '',
                pullRequest: undefined,
            };
        }

        const { branchName, repoUrl, installationToken, commitMessage, stagedFiles, branch } = inputData;

        try {
            // Extract owner and repo from URL
            const targetIdentifier = extractTargetIdentifier(repoUrl);
            logger.info(`Target identifier: ${targetIdentifier}`);
            const [owner, repo] = targetIdentifier.split('/');

            logger.info(`Creating PR for branch: ${branchName} in ${owner}/${repo}`);

            // Create PR title and body
            const prTitle = commitMessage.split('\n')[0] || `Automated changes - ${stagedFiles.length} files updated`;
            const prBody = `## Automated Changes by AATX

This PR contains automated changes made by the AATX system.

### Changes Summary:
- **Files modified**: ${stagedFiles.length}
- **Branch**: \`${branchName}\`
- **Commit**: \`${inputData.commitSha}\`

### Modified Files:
${stagedFiles.map(file => `- \`${file}\``).join('\n')}

### Commit Message:
\`\`\`
${commitMessage}
\`\`\`

---
*This PR was created automatically by AATX. Please review the changes before merging.*`;

            // Create PR using GitHub API
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${installationToken}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: prTitle,
                    head: branchName,
                    base: 'main', // or 'master' - you might want to make this configurable
                    body: prBody,
                    draft: false,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const prData = await response.json();

            logger.info(`Successfully created PR #${prData.number}: ${prData.html_url}`);

            return {
                success: true,
                message: `Successfully created PR #${prData.number}: ${prData.html_url}`,
                commitSha: inputData.commitSha,
                branchName,
                pullRequest: {
                    number: prData.number,
                    url: prData.html_url,
                    title: prData.title,
                },
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logger.error(`Failed to create PR: ${errorMessage}`);

            return {
                success: false,
                message: `Failed to create PR: ${errorMessage}`,
                commitSha: inputData.commitSha,
                branchName,
                pullRequest: undefined,
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
        branchName: z.string(),
        pullRequest: z.object({
            number: z.number(),
            url: z.string(),
            title: z.string(),
        }).optional(),
    }),
})
    .then(setupGitConfigStep)
    .then(createBranchStep)
    .then(stageChangesStep)
    .then(commitChangesStep)
    .then(pushChangesStep)
    .then(createPullRequestStep);

gitCommitAndCreatePrWorkflow.commit();

export { gitCommitAndCreatePrWorkflow };
