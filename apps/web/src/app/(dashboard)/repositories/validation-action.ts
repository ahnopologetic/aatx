"use server"

interface ValidationResult {
    success: boolean;
    error?: string;
}

export async function validateRepositoryUrl(url: string): Promise<ValidationResult> {
    const urlPattern = /^https?:\/\/(www\.)?(github\.com|gitlab\.com|bitbucket\.org)\/[^\/]+\/[^\/]+((\/(tree|branch)\/[^\/]+)?)\/?$/;

    if (!urlPattern.test(url)) {
        return {
            success: false,
            error: "Please enter a valid repository URL from GitHub, GitLab, or Bitbucket"
        };
    }

    try {
        // Extract repository information from URL
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(part => part);

        if (pathParts.length < 2) {
            return {
                success: false,
                error: "Invalid repository URL format"
            };
        }

        const owner = pathParts[0];
        const repo = pathParts[1].replace(/\.git$/, ''); // Remove .git suffix if present
        const hostname = urlObj.hostname.replace(/^www\./, '');

        let apiUrl: string;
        const headers: Record<string, string> = {
            'Accept': 'application/json',
            'User-Agent': 'AATX-Repository-Validator'
        };

        // Construct API URL based on the hosting service
        switch (hostname) {
            case 'github.com':
                apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
                break;
            case 'gitlab.com':
                const encodedPath = encodeURIComponent(`${owner}/${repo}`);
                apiUrl = `https://gitlab.com/api/v4/projects/${encodedPath}`;
                break;
            case 'bitbucket.org':
                apiUrl = `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}`;
                break;
            default:
                return {
                    success: false,
                    error: "Unsupported repository hosting service"
                };
        }

        // Make API request to validate repository
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (response.ok) {
            return { success: true };
        } else if (response.status === 404) {
            return {
                success: false,
                error: "Repository not found or is private. Please ensure the repository is public and the URL is correct."
            };
        } else if (response.status === 403) {
            return {
                success: false,
                error: "Repository access is forbidden. The repository may be private or rate limits exceeded."
            };
        } else if (response.status >= 500) {
            return {
                success: false,
                error: "Repository hosting service is temporarily unavailable. Please try again later."
            };
        } else {
            return {
                success: false,
                error: `Unable to validate repository (HTTP ${response.status}). Please check the URL and try again.`
            };
        }

    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: "Repository validation timed out. Please check your connection and try again."
                };
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                return {
                    success: false,
                    error: "Network error occurred. Please check your connection and try again."
                };
            } else {
                return {
                    success: false,
                    error: "Failed to validate repository. Please check the URL and try again."
                };
            }
        } else {
            return {
                success: false,
                error: "An unexpected error occurred during validation. Please try again."
            };
        }
    }
}
