import { createClient } from "@/utils/supabase/server";
import { extractApiKey, hashApiKey, ApiKeyPermissions } from "./api-key-utils";
import { NextRequest, NextResponse } from "next/server";

type AuthResult = {
  authenticated: boolean;
  orgId?: string;
  apiKeyId?: string;
  permissions?: ApiKeyPermissions;
  error?: string;
};

/**
 * Authenticates a request using API key
 * @param req Request object
 * @returns Authentication result
 */
export async function authenticateApiKey(req: NextRequest): Promise<AuthResult> {
  // Extract API key from request headers
  const apiKey = extractApiKey(req.headers);
  if (!apiKey) {
    return { authenticated: false, error: "API key not provided" };
  }

  // Hash the API key for lookup
  const keyHash = hashApiKey(apiKey);
  
  // Look up the API key in the database
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, org_id, permissions, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data) {
    return { authenticated: false, error: "Invalid API key" };
  }

  // Check if the API key is expired or revoked
  const now = new Date();
  if (data.revoked_at && new Date(data.revoked_at) <= now) {
    return { authenticated: false, error: "API key has been revoked" };
  }

  if (data.expires_at && new Date(data.expires_at) <= now) {
    return { authenticated: false, error: "API key has expired" };
  }

  // Update last_used_at timestamp
  await supabase
    .from('api_keys')
    .update({ last_used_at: now.toISOString() })
    .eq('id', data.id);

  return { 
    authenticated: true, 
    orgId: data.org_id, 
    apiKeyId: data.id,
    permissions: data.permissions as ApiKeyPermissions
  };
}

/**
 * Checks if the API key has the required permission
 * @param permissions API key permissions
 * @param resource Resource type (e.g., 'trackingPlans', 'repositories')
 * @param action Action type (e.g., 'read', 'validate', 'update')
 * @returns Whether the API key has the required permission
 */
export function hasPermission(
  permissions: ApiKeyPermissions | undefined, 
  resource: keyof ApiKeyPermissions, 
  action: string
): boolean {
  if (!permissions || !permissions[resource]) {
    return false;
  }
  
  return Boolean(permissions[resource]?.[action as keyof typeof permissions[typeof resource]]);
}

/**
 * Middleware for authenticating API key requests
 * @param req Request object
 * @param resource Resource type (e.g., 'trackingPlans', 'repositories')
 * @param action Action type (e.g., 'read', 'validate', 'update')
 * @returns Response object if authentication fails, null if successful
 */
export async function apiKeyAuth(
  req: NextRequest,
  resource: keyof ApiKeyPermissions,
  action: string
): Promise<{ response: NextResponse } | { orgId: string; apiKeyId: string }> {
  const auth = await authenticateApiKey(req);
  
  if (!auth.authenticated) {
    return { 
      response: NextResponse.json(
        { error: auth.error || "Authentication failed" }, 
        { status: 401 }
      ) 
    };
  }
  
  if (!hasPermission(auth.permissions, resource, action)) {
    return { 
      response: NextResponse.json(
        { error: "API key does not have permission for this operation" }, 
        { status: 403 }
      ) 
    };
  }
  
  return { orgId: auth.orgId!, apiKeyId: auth.apiKeyId! };
}
