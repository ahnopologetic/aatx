-- Create API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  permissions JSONB NOT NULL DEFAULT '{}',
  
  CONSTRAINT api_keys_name_org_id_unique UNIQUE (name, org_id)
);

-- Add RLS policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy for organization members to view their org's API keys
CREATE POLICY api_keys_select_policy ON api_keys
  FOR SELECT
  USING (
    org_id IN (
      SELECT om.org_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

-- Policy for organization admins to insert API keys
CREATE POLICY api_keys_insert_policy ON api_keys
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT om.org_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    ) AND
    created_by = auth.uid()
  );

-- Policy for organization admins to update API keys
CREATE POLICY api_keys_update_policy ON api_keys
  FOR UPDATE
  USING (
    org_id IN (
      SELECT om.org_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- Policy for organization admins to delete API keys
CREATE POLICY api_keys_delete_policy ON api_keys
  FOR DELETE
  USING (
    org_id IN (
      SELECT om.org_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS api_keys_org_id_idx ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);
