-- Fix RLS policies to allow unauthenticated users to access invitation details
-- This allows invited users to see organization information during signup

-- Drop existing policies
DROP POLICY IF EXISTS orgs_select ON public.organizations;
DROP POLICY IF EXISTS invitations_select ON public.organization_invitations;

-- Create new organization select policy that allows access through valid invitations
CREATE POLICY orgs_select ON public.organizations
  FOR SELECT USING (
    -- Authenticated users can see organizations they're members of
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.org_id = organizations.id AND m.user_id = auth.uid()
    ))
    OR
    -- Unauthenticated users can see organization details through pending invitations
    (auth.uid() IS NULL AND EXISTS (
      SELECT 1 FROM public.organization_invitations i
      WHERE i.org_id = organizations.id 
      AND i.status = 'pending'
      AND i.created_at > (NOW() - INTERVAL '7 days')
    ))
  );

-- Create new invitation select policy that allows token-based access
CREATE POLICY invitations_select ON public.organization_invitations
  FOR SELECT USING (
    -- Authenticated users can see invitations they sent or received
    (auth.uid() IS NOT NULL AND (invited_by = auth.uid() OR email = auth.email()))
    OR
    -- Unauthenticated users can see any pending invitation details
    -- (token validation will be done at application level)
    (auth.uid() IS NULL AND status = 'pending' AND created_at > (NOW() - INTERVAL '7 days'))
  );

-- Add a comment explaining the security model
COMMENT ON POLICY orgs_select ON public.organizations IS 
  'Allows authenticated users to see their organizations, and unauthenticated users to see organization names through valid pending invitations for signup flow';

COMMENT ON POLICY invitations_select ON public.organization_invitations IS 
  'Allows authenticated users to see their invitations, and unauthenticated users to see pending invitation details for signup flow. Token validation occurs at application level.';
