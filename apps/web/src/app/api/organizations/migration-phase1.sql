-- Phase 1: Database Migration for HUM-492
-- Add org_id columns to repos and plans tables, migrate data, and update RLS policies

BEGIN;

-- Step 1: Add org_id columns to repos and plans tables
ALTER TABLE public.repos 
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.plans 
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_repos_org_id ON public.repos(org_id);
CREATE INDEX IF NOT EXISTS idx_plans_org_id ON public.plans(org_id);

-- Step 3: Data Migration - Create personal organizations for users without one
-- and populate org_id for existing repos and plans

-- Create personal organizations for users who don't have one
INSERT INTO public.organizations (id, name, created_by, created_at, updated_at)
SELECT 
  gen_random_uuid() as id,
  COALESCE(p.name, 'Personal Organization') as name,
  p.id as created_by,
  NOW() as created_at,
  NOW() as updated_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members om 
  WHERE om.user_id = p.id
)
AND EXISTS (
  SELECT 1 FROM public.repos r WHERE r.user_id = p.id
  UNION
  SELECT 1 FROM public.plans pl WHERE pl.user_id = p.id
);

-- Add users as owners of their personal organizations
INSERT INTO public.organization_members (org_id, user_id, role, created_at)
SELECT 
  o.id as org_id,
  o.created_by as user_id,
  'owner' as role,
  NOW() as created_at
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members om 
  WHERE om.org_id = o.id AND om.user_id = o.created_by
);

-- Set current_org_id for users who don't have one
UPDATE public.profiles 
SET current_org_id = (
  SELECT om.org_id 
  FROM public.organization_members om 
  WHERE om.user_id = profiles.id 
  ORDER BY om.created_at ASC 
  LIMIT 1
)
WHERE current_org_id IS NULL;

-- Step 4: Migrate existing repos to organizations
-- Use user's current organization or their first organization
UPDATE public.repos 
SET org_id = (
  SELECT COALESCE(
    p.current_org_id,
    (
      SELECT om.org_id 
      FROM public.organization_members om 
      WHERE om.user_id = repos.user_id 
      ORDER BY om.created_at ASC 
      LIMIT 1
    )
  )
  FROM public.profiles p 
  WHERE p.id = repos.user_id
)
WHERE org_id IS NULL AND user_id IS NOT NULL;

-- Step 5: Migrate existing plans to organizations
UPDATE public.plans 
SET org_id = (
  SELECT COALESCE(
    p.current_org_id,
    (
      SELECT om.org_id 
      FROM public.organization_members om 
      WHERE om.user_id = plans.user_id 
      ORDER BY om.created_at ASC 
      LIMIT 1
    )
  )
  FROM public.profiles p 
  WHERE p.id = plans.user_id
)
WHERE org_id IS NULL AND user_id IS NOT NULL;

-- Step 6: Update RLS Policies for repos table
DROP POLICY IF EXISTS repos_select ON public.repos;
DROP POLICY IF EXISTS repos_insert ON public.repos;
DROP POLICY IF EXISTS repos_update ON public.repos;
DROP POLICY IF EXISTS repos_delete ON public.repos;

-- New organization-based policies for repos
CREATE POLICY repos_select ON public.repos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = repos.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY repos_insert ON public.repos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = repos.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY repos_update ON public.repos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = repos.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY repos_delete ON public.repos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = repos.org_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
    )
  );

-- Step 7: Update RLS Policies for plans table
DROP POLICY IF EXISTS plans_select ON public.plans;
DROP POLICY IF EXISTS plans_insert ON public.plans;
DROP POLICY IF EXISTS plans_update ON public.plans;
DROP POLICY IF EXISTS plans_delete ON public.plans;

-- New organization-based policies for plans
CREATE POLICY plans_select ON public.plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = plans.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY plans_insert ON public.plans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = plans.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY plans_update ON public.plans
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = plans.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY plans_delete ON public.plans
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = plans.org_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
    )
  );

-- Step 8: Enable RLS on repos and plans tables if not already enabled
ALTER TABLE public.repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verification queries (run these after migration)
-- SELECT 'Repos without org_id' as check_type, COUNT(*) as count FROM public.repos WHERE org_id IS NULL;
-- SELECT 'Plans without org_id' as check_type, COUNT(*) as count FROM public.plans WHERE org_id IS NULL;
-- SELECT 'Users without current_org_id' as check_type, COUNT(*) as count FROM public.profiles WHERE current_org_id IS NULL;
