-- HUM-490: Database Migration for Free/Pro Plan System
-- Add subscription plans, organization plan mapping, and usage tracking

BEGIN;

-- 1. Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) DEFAULT 0,
  price_yearly DECIMAL(10,2) DEFAULT 0,
  features JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS policy: anyone can read active plans
CREATE POLICY plans_select ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- 2. Add plan_id to organizations table
DO $$ BEGIN
  ALTER TABLE public.organizations 
    ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES public.subscription_plans(id) DEFAULT 'free';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 3. Create usage_tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'aatx_coder', 'tracking_plan', etc.
  resource_id TEXT, -- Optional reference to specific resource
  action TEXT NOT NULL, -- 'create', 'use', 'scan', etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date_key DATE DEFAULT CURRENT_DATE -- For easy date-based aggregations
);

-- Enable RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see their organization's usage
CREATE POLICY usage_tracking_select ON public.usage_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.org_id = usage_tracking.org_id AND m.user_id = auth.uid()
    )
  );

-- RLS policy: authenticated users can insert usage for their organization
CREATE POLICY usage_tracking_insert ON public.usage_tracking
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.org_id = usage_tracking.org_id AND m.user_id = auth.uid()
    )
  );

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_org_date ON public.usage_tracking(org_id, date_key);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_resource ON public.usage_tracking(org_id, resource_type, date_key);
CREATE INDEX IF NOT EXISTS idx_organizations_plan_id ON public.organizations(plan_id);

-- 5. Insert default subscription plans
INSERT INTO public.subscription_plans (id, name, display_name, description, price_monthly, price_yearly, features, limits) VALUES
  ('free', 'free', 'Free', 'Perfect for getting started with analytics tracking', 0, 0, 
   '{"basic_analytics": true, "repository_scanning": true, "tracking_plans": true, "community_support": true}',
   '{"aatx_coder_monthly": 3, "tracking_plans_total": 1, "repositories_total": 5, "events_per_plan": 10}'
  ),
  ('pro', 'pro', 'Pro', 'For teams that need advanced analytics and unlimited usage', 29, 290,
   '{"unlimited_analytics": true, "priority_support": true, "advanced_integrations": true, "team_collaboration": true, "custom_exports": true}',
   '{"aatx_coder_monthly": -1, "tracking_plans_total": -1, "repositories_total": -1, "events_per_plan": -1}'
  )
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = NOW();

-- 6. Update existing organizations to have the free plan
UPDATE public.organizations 
SET plan_id = 'free' 
WHERE plan_id IS NULL;

-- 7. Create helper function to get current usage for an organization
CREATE OR REPLACE FUNCTION public.get_organization_usage(
  org_uuid UUID,
  resource_type_param TEXT DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  resource_type TEXT,
  total_count BIGINT,
  current_month_count BIGINT,
  current_date_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set default date range if not provided
  IF start_date IS NULL THEN
    start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  END IF;
  
  IF end_date IS NULL THEN
    end_date := CURRENT_DATE;
  END IF;

  RETURN QUERY
  SELECT 
    ut.resource_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE ut.date_key >= DATE_TRUNC('month', CURRENT_DATE)::DATE) as current_month_count,
    COUNT(*) FILTER (WHERE ut.date_key = CURRENT_DATE) as current_date_count
  FROM public.usage_tracking ut
  WHERE ut.org_id = org_uuid
    AND (resource_type_param IS NULL OR ut.resource_type = resource_type_param)
    AND ut.date_key BETWEEN start_date AND end_date
  GROUP BY ut.resource_type;
END;
$$;

-- 8. Create helper function to check if organization can perform an action
CREATE OR REPLACE FUNCTION public.can_organization_perform_action(
  org_uuid UUID,
  resource_type_param TEXT,
  action_type TEXT DEFAULT 'create'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_plan_id TEXT;
  plan_limits JSONB;
  current_usage BIGINT;
  limit_key TEXT;
  usage_limit INTEGER;
BEGIN
  -- Get organization's plan
  SELECT plan_id INTO org_plan_id
  FROM public.organizations
  WHERE id = org_uuid;

  IF org_plan_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get plan limits
  SELECT limits INTO plan_limits
  FROM public.subscription_plans
  WHERE id = org_plan_id AND is_active = true;

  IF plan_limits IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Determine limit key based on resource type
  CASE resource_type_param
    WHEN 'aatx_coder' THEN
      limit_key := 'aatx_coder_monthly';
    WHEN 'tracking_plan' THEN
      limit_key := 'tracking_plans_total';
    WHEN 'repository' THEN
      limit_key := 'repositories_total';
    ELSE
      RETURN TRUE; -- Unknown resource type, allow by default
  END CASE;

  -- Get usage limit
  usage_limit := (plan_limits ->> limit_key)::INTEGER;
  
  -- If limit is -1, it means unlimited
  IF usage_limit = -1 THEN
    RETURN TRUE;
  END IF;

  -- Get current usage based on resource type
  IF resource_type_param = 'aatx_coder' THEN
    -- For AATX Coder, check monthly usage
    SELECT COUNT(*) INTO current_usage
    FROM public.usage_tracking
    WHERE org_id = org_uuid 
      AND resource_type = resource_type_param
      AND date_key >= DATE_TRUNC('month', CURRENT_DATE)::DATE;
  ELSE
    -- For other resources, check total count from their respective tables
    CASE resource_type_param
      WHEN 'tracking_plan' THEN
        SELECT COUNT(*) INTO current_usage
        FROM public.plans
        WHERE org_id = org_uuid;
      WHEN 'repository' THEN
        SELECT COUNT(*) INTO current_usage
        FROM public.repos
        WHERE org_id = org_uuid;
      ELSE
        current_usage := 0;
    END CASE;
  END IF;

  -- Check if current usage is below limit
  RETURN current_usage < usage_limit;
END;
$$;

COMMIT;
