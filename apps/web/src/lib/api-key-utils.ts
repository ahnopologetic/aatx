import crypto from 'crypto';

const API_KEY_PREFIX = 'aatx_gh_';
const PREFIX_DISPLAY_LENGTH = 8; // Number of characters to display for key prefix

/**
 * Generates a new API key with prefix
 */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(32);
  const uuid = crypto.randomUUID();
  const hash = crypto.createHash('sha256').update(randomBytes).digest('hex');
  return `${API_KEY_PREFIX}${uuid}_${hash.substring(0, 8)}`;
}

/**
 * Extracts the display prefix from an API key
 */
export function getKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, API_KEY_PREFIX.length + PREFIX_DISPLAY_LENGTH);
}

/**
 * Hashes an API key for secure storage
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Validates an API key format
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  return apiKey.startsWith(API_KEY_PREFIX) && apiKey.length > API_KEY_PREFIX.length + 40;
}

/**
 * Extracts API key from request headers
 * @param headers Request headers
 * @returns API key or null if not found
 */
export function extractApiKey(headers: Headers): string | null {
  const authHeader = headers.get('authorization');
  if (!authHeader) return null;
  
  // Check for Bearer token format
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (isValidApiKeyFormat(token)) {
      return token;
    }
  }
  
  // Check for direct API key format
  if (authHeader.startsWith(API_KEY_PREFIX) && isValidApiKeyFormat(authHeader)) {
    return authHeader;
  }
  
  return null;
}

/**
 * Type definition for API key permissions
 */
export type ApiKeyPermissions = {
  trackingPlans?: {
    read?: boolean;
    validate?: boolean;
    update?: boolean;
  };
  repositories?: {
    read?: boolean;
    scan?: boolean;
  };
};

/**
 * Default permissions for GitHub Action API keys
 */
export const DEFAULT_GITHUB_ACTION_PERMISSIONS: ApiKeyPermissions = {
  trackingPlans: {
    read: true,
    validate: true,
    update: false,
  },
  repositories: {
    read: true,
    scan: true,
  }
};
