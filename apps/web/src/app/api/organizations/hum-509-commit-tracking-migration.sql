-- HUM-509: Database Migration for Commit Hash Tracking
-- This migration adds commit hash and timestamp tracking to rescan jobs
-- to enable detection of repository changes since last scan

BEGIN;

-- 1. Add commit tracking columns to rescan_jobs table
ALTER TABLE public.rescan_jobs 
ADD COLUMN IF NOT EXISTS last_commit_hash TEXT,
ADD COLUMN IF NOT EXISTS last_commit_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_commit_hash TEXT,
ADD COLUMN IF NOT EXISTS current_commit_timestamp TIMESTAMPTZ;

-- 2. Add index for commit hash lookups
CREATE INDEX IF NOT EXISTS idx_rescan_jobs_commit_hash ON public.rescan_jobs(repo_id, last_commit_hash);

-- 3. Create helper function to get commit comparison for a repository
CREATE OR REPLACE FUNCTION public.get_commit_comparison(repo_uuid UUID)
RETURNS TABLE (
  repo_id UUID,
  last_scan_commit_hash TEXT,
  last_scan_commit_timestamp TIMESTAMPTZ,
  last_scan_date TIMESTAMPTZ,
  has_changes BOOLEAN,
  days_since_last_scan INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rj.repo_id,
    rj.last_commit_hash,
    rj.last_commit_timestamp,
    rj.completed_at as last_scan_date,
    CASE 
      WHEN rj.last_commit_hash IS NULL THEN true  -- No previous scan
      ELSE false  -- Will be updated by application logic
    END as has_changes,
    EXTRACT(DAY FROM NOW() - rj.completed_at)::INTEGER as days_since_last_scan
  FROM public.rescan_jobs rj
  WHERE rj.repo_id = repo_uuid 
    AND rj.status = 'completed'
  ORDER BY rj.completed_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create helper function to update commit info after successful scan
CREATE OR REPLACE FUNCTION public.update_rescan_commit_info(
  job_uuid UUID,
  commit_hash TEXT,
  commit_timestamp TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.rescan_jobs 
  SET 
    last_commit_hash = commit_hash,
    last_commit_timestamp = commit_timestamp,
    updated_at = NOW()
  WHERE id = job_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
