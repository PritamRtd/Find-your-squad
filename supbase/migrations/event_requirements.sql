-- Migration: Add team requirements to events and consistent structure
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. ADD TEAM REQUIREMENTS TO EVENTS TABLE
-- ============================================================================

-- Add created_by column to events (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'created_by') THEN
        ALTER TABLE events ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add team requirement fields to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS min_team_size INT DEFAULT 1;
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_team_size INT DEFAULT 10;
ALTER TABLE events ADD COLUMN IF NOT EXISTS required_skills TEXT[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- FLEXIBLE TEAM COMPOSITION RULES (JSONB)
-- This allows dynamic rules like:
-- {
--   "year_rules": [
--     {"year": "2nd", "min": 2, "max": 3},
--     {"year": "3rd", "min": 1}
--   ],
--   "branch_rules": [
--     {"branch": "CS", "min": 1, "max": 2},
--     {"branch": "ECE", "min": 1}
--   ],
--   "diversity": {
--     "min_different_branches": 2,
--     "max_same_branch": 3,
--     "cross_branch_required": true
--   }
-- }
ALTER TABLE events ADD COLUMN IF NOT EXISTS team_composition_rules JSONB DEFAULT '{}';

-- Remove old simple arrays (optional - keep for backward compatibility or drop)
-- ALTER TABLE events DROP COLUMN IF EXISTS allowed_branches;
-- ALTER TABLE events DROP COLUMN IF EXISTS allowed_years;

-- ============================================================================
-- 2. TEAMS TABLE - Only needs skills (event defines structure)
-- ============================================================================

ALTER TABLE teams ADD COLUMN IF NOT EXISTS required_skills TEXT[];

-- ============================================================================
-- 3. UPDATE RLS POLICIES FOR EVENTS
-- ============================================================================

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Event creators can delete their events" ON events;

-- Create delete policy for event creators
CREATE POLICY "Event creators can delete their events"
  ON events FOR DELETE
  USING (auth.uid() = created_by);

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Event creators can update their events" ON events;

-- Create update policy for event creators
CREATE POLICY "Event creators can update their events"
  ON events FOR UPDATE
  USING (auth.uid() = created_by);

-- ============================================================================
-- 4. ADD TRIGGER FOR EVENTS updated_at
-- ============================================================================

-- Create trigger for events updated_at (if not exists)
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SUMMARY OF CHANGES:
-- ============================================================================
-- Events table now has:
--   - created_by: UUID (who created the event)
--   - min_team_size: INT (minimum team size)
--   - max_team_size: INT (maximum team size)
--   - required_skills: TEXT[] (suggested skills for teams)
--   - team_composition_rules: JSONB (flexible year/branch rules)
--   - event_date: TIMESTAMPTZ (when the event takes place)
--   - registration_deadline: TIMESTAMPTZ (last date to form teams)
--   - updated_at: TIMESTAMPTZ (auto-updated)
--
-- Teams table:
--   - required_skills: TEXT[] (skills the team is looking for)
--   - (branch/year limits inherited from event)
--
-- Example team_composition_rules:
-- {
--   "year_rules": [{"year": "2nd", "min": 2}, {"year": "3rd", "min": 1}],
--   "branch_rules": [{"branch": "CS", "min": 1, "max": 2}],
--   "diversity": {"min_different_branches": 2, "cross_branch_required": true}
-- }
