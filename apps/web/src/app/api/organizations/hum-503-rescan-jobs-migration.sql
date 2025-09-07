-- HUM-503: Database Migration for Rescan Jobs Feature
-- This migration adds support for background repository rescans with change approval workflow

BEGIN;

-- 1. Create rescan_jobs table
CREATE TABLE IF NOT EXISTS public.rescan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES public.repos(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  triggered_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  notification_sent BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent concurrent scans on same repository
  CONSTRAINT unique_running_scan UNIQUE (repo_id, status) WHERE status = 'running'
);

-- 2. Create rescan_results table
CREATE TABLE IF NOT EXISTS public.rescan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rescan_job_id UUID NOT NULL REFERENCES public.rescan_jobs(id) ON DELETE CASCADE,
  total_events_found INTEGER DEFAULT 0,
  new_events_found INTEGER DEFAULT 0,
  updated_events_found INTEGER DEFAULT 0,
  removed_events_found INTEGER DEFAULT 0,
  scan_summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create rescan_changes table
CREATE TABLE IF NOT EXISTS public.rescan_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rescan_job_id UUID NOT NULL REFERENCES public.rescan_jobs(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('new_event', 'updated_event', 'removed_event')),
  event_name TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'applied')) DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add rescan_job_id to user_events table
ALTER TABLE public.user_events 
ADD COLUMN IF NOT EXISTS rescan_job_id UUID REFERENCES public.rescan_jobs(id) ON DELETE SET NULL;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rescan_jobs_repo_status ON public.rescan_jobs(repo_id, status);
CREATE INDEX IF NOT EXISTS idx_rescan_jobs_org_created ON public.rescan_jobs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rescan_jobs_triggered_created ON public.rescan_jobs(triggered_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rescan_jobs_status_created ON public.rescan_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rescan_changes_job_status ON public.rescan_changes(rescan_job_id, status);
CREATE INDEX IF NOT EXISTS idx_rescan_changes_event_name ON public.rescan_changes(event_name);
CREATE INDEX IF NOT EXISTS idx_rescan_changes_status ON public.rescan_changes(status);
CREATE INDEX IF NOT EXISTS idx_user_events_rescan_job ON public.user_events(rescan_job_id);

-- 6. Enable RLS on new tables
ALTER TABLE public.rescan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescan_changes ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for rescan_jobs
CREATE POLICY rescan_jobs_select ON public.rescan_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = rescan_jobs.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY rescan_jobs_insert ON public.rescan_jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = rescan_jobs.org_id AND om.user_id = auth.uid()
    ) AND triggered_by = auth.uid()
  );

CREATE POLICY rescan_jobs_update ON public.rescan_jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = rescan_jobs.org_id AND om.user_id = auth.uid()
    )
  );

-- 8. RLS Policies for rescan_results
CREATE POLICY rescan_results_select ON public.rescan_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rescan_jobs rj
      JOIN public.organization_members om ON om.org_id = rj.org_id
      WHERE rj.id = rescan_results.rescan_job_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY rescan_results_insert ON public.rescan_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rescan_jobs rj
      JOIN public.organization_members om ON om.org_id = rj.org_id
      WHERE rj.id = rescan_results.rescan_job_id AND om.user_id = auth.uid()
    )
  );

-- 9. RLS Policies for rescan_changes
CREATE POLICY rescan_changes_select ON public.rescan_changes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rescan_jobs rj
      JOIN public.organization_members om ON om.org_id = rj.org_id
      WHERE rj.id = rescan_changes.rescan_job_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY rescan_changes_insert ON public.rescan_changes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rescan_jobs rj
      JOIN public.organization_members om ON om.org_id = rj.org_id
      WHERE rj.id = rescan_changes.rescan_job_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY rescan_changes_update ON public.rescan_changes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.rescan_jobs rj
      JOIN public.organization_members om ON om.org_id = rj.org_id
      WHERE rj.id = rescan_changes.rescan_job_id AND om.user_id = auth.uid()
    )
  );

-- 10. Create helper function to get rescan history
CREATE OR REPLACE FUNCTION public.get_rescan_history(repo_uuid UUID)
RETURNS TABLE (
  job_id UUID,
  status TEXT,
  triggered_by UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_events INTEGER,
  new_events INTEGER,
  updated_events INTEGER,
  pending_changes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rj.id as job_id,
    rj.status,
    rj.triggered_by,
    rj.started_at,
    rj.completed_at,
    COALESCE(rr.total_events_found, 0) as total_events,
    COALESCE(rr.new_events_found, 0) as new_events,
    COALESCE(rr.updated_events_found, 0) as updated_events,
    COUNT(rc.id) FILTER (WHERE rc.status = 'pending') as pending_changes
  FROM public.rescan_jobs rj
  LEFT JOIN public.rescan_results rr ON rr.rescan_job_id = rj.id
  LEFT JOIN public.rescan_changes rc ON rc.rescan_job_id = rj.id
  WHERE rj.repo_id = repo_uuid
  GROUP BY rj.id, rj.status, rj.triggered_by, rj.started_at, rj.completed_at, rr.total_events_found, rr.new_events_found, rr.updated_events_found
  ORDER BY rj.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create helper function to get latest rescan job for a repository
CREATE OR REPLACE FUNCTION public.get_latest_rescan_job(repo_uuid UUID)
RETURNS TABLE (
  job_id UUID,
  status TEXT,
  triggered_by UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_events INTEGER,
  new_events INTEGER,
  updated_events INTEGER,
  pending_changes INTEGER,
  days_since_last_scan INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rj.id as job_id,
    rj.status,
    rj.triggered_by,
    rj.started_at,
    rj.completed_at,
    COALESCE(rr.total_events_found, 0) as total_events,
    COALESCE(rr.new_events_found, 0) as new_events,
    COALESCE(rr.updated_events_found, 0) as updated_events,
    COUNT(rc.id) FILTER (WHERE rc.status = 'pending') as pending_changes,
    EXTRACT(DAY FROM NOW() - rj.completed_at)::INTEGER as days_since_last_scan
  FROM public.rescan_jobs rj
  LEFT JOIN public.rescan_results rr ON rr.rescan_job_id = rj.id
  LEFT JOIN public.rescan_changes rc ON rc.rescan_job_id = rj.id
  WHERE rj.repo_id = repo_uuid AND rj.status = 'completed'
  GROUP BY rj.id, rj.status, rj.triggered_by, rj.started_at, rj.completed_at, rr.total_events_found, rr.new_events_found, rr.updated_events_found
  ORDER BY rj.completed_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create helper function to get pending changes count for a repository
CREATE OR REPLACE FUNCTION public.get_pending_changes_count(repo_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  pending_count INTEGER;
BEGIN
  SELECT COUNT(rc.id) INTO pending_count
  FROM public.rescan_changes rc
  JOIN public.rescan_jobs rj ON rj.id = rc.rescan_job_id
  WHERE rj.repo_id = repo_uuid AND rc.status = 'pending';
  
  RETURN COALESCE(pending_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rescan_jobs_updated_at
  BEFORE UPDATE ON public.rescan_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rescan_changes_updated_at
  BEFORE UPDATE ON public.rescan_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
