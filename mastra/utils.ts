import { readFileSync } from 'fs';
import jwt from 'jsonwebtoken';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

const { sign } = jwt;

export interface GitHubInstallationTokenOptions {
    appId: string;
    privateKeyPath: string;
    installationType: 'user' | 'repo' | 'org';
    targetIdentifier: string; // username, repo (owner/repo), or org name
}

export interface GitHubInstallationInfo {
    installationId: number;
    accessToken: string;
    expiresAt: string;
    permissions: Record<string, string>;
    repositories?: Array<{
        id: number;
        name: string;
        full_name: string;
    }>;
}

export function extractTargetIdentifier(repoUrl: string): string {
    // e.g., https://github.com/owner/repo.git -> owner/repo
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?/);
    if (!match) {
        throw new Error('Invalid repository URL format');
    }
    // Return in "owner/repo" format
    return `${match[1]}/${match[2]}`;
}

/**
 * Generates a JWT for GitHub App authentication
 * Based on: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app
 */
export function generateGitHubJWT(appId: string, privateKeyPath: string): string {
    try {
        const privateKey = readFileSync(privateKeyPath, 'utf8');

        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iat: now - 60, // Issued at time, 60 seconds in the past to allow for clock drift
            exp: now + (10 * 60), // Expires at time, 10 minutes from now (max allowed)
            iss: appId, // Issuer (GitHub App ID)
        };

        return sign(payload, privateKey, { algorithm: 'RS256' });
    } catch (error) {
        throw new Error(`Failed to generate JWT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Gets the installation ID for a GitHub App based on type and target
 * Based on: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app
 */
export async function getGitHubInstallationId(
    jwt: string,
    installationType: 'user' | 'repo' | 'org' | 'app',
    targetIdentifier: string
): Promise<number> {
    let apiUrl: string;

    switch (installationType) {
        case 'user':
            apiUrl = `https://api.github.com/users/${targetIdentifier}/installation`;
            break;
        case 'repo':
            // targetIdentifier should be in format "owner/repo"
            apiUrl = `https://api.github.com/repos/${targetIdentifier}/installation`;
            break;
        case 'org':
            apiUrl = `https://api.github.com/orgs/${targetIdentifier}/installation`;
            break;
        case 'app':
            apiUrl = `https://api.github.com/app/installations`;
            break;
        default:
            throw new Error(`Invalid installation type: ${installationType}`);
    }

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${jwt}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('GitHub API error', apiUrl, jwt, errorText);
            throw new Error(`GitHub API error (${response.status}): ${errorText}`);
        }

        const data = await response.json() as { id: number }[];
        return data[0].id;
    } catch (error) {
        throw new Error(`Failed to get installation ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Generates an installation access token for a GitHub App
 * Based on: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app
 */
export async function generateGitHubInstallationToken(
    jwt: string,
    installationId: number,
    options?: {
        repositories?: string[];
        repositoryIds?: number[];
        permissions?: Record<string, string>;
    }
): Promise<GitHubInstallationInfo> {
    const apiUrl = `https://api.github.com/app/installations/${installationId}/access_tokens`;

    const body: Record<string, unknown> = {};
    if (options?.repositories) {
        body.repositories = options.repositories;
    }
    if (options?.repositoryIds) {
        body.repository_ids = options.repositoryIds;
    }
    if (options?.permissions) {
        body.permissions = options.permissions;
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${jwt}`,
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json',
            },
            body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error (${response.status}): ${errorText}`);
        }

        const data = await response.json() as {
            token: string;
            expires_at: string;
            permissions: Record<string, string>;
            repositories?: Array<{
                id: number;
                name: string;
                full_name: string;
            }>;
        };

        return {
            installationId,
            accessToken: data.token,
            expiresAt: data.expires_at,
            permissions: data.permissions,
            repositories: data.repositories,
        };
    } catch (error) {
        throw new Error(`Failed to generate installation access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}


/**
 * Creates a temporary directory
 * Based on: https://github.com/rascalking/tmp
 */
export function createTemporaryDirectory(): string {
    return join(tmpdir(), randomBytes(16).toString('hex'));
}