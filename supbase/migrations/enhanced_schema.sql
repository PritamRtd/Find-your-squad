-- ============================================================================
-- Migration: Enhanced Schema for Chat, Profiles, and Team Management
-- Run this AFTER the mvp_schema.sql migration
-- ============================================================================

-- ============================================================================
-- 1. ENHANCED PROFILES TABLE
-- Add new columns for better profile management
-- ============================================================================

-- Add new profile columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

-- ============================================================================
-- 2. ENHANCED EVENTS TABLE
-- Add creator tracking for events
-- ============================================================================

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- RLS Policy for event deletion (only creator can delete)
DROP POLICY IF EXISTS "Event creators can delete events" ON events;
CREATE POLICY "Event creators can delete events"
  ON events FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policy for event updates (only creator can update)
DROP POLICY IF EXISTS "Event creators can update events" ON events;
CREATE POLICY "Event creators can update events"
  ON events FOR UPDATE
  USING (auth.uid() = created_by);

-- ============================================================================
-- 3. ENHANCED TEAM_MEMBERS TABLE
-- Add 'admin' status for team admin roles
-- ============================================================================

-- Update the status check constraint to include 'admin'
ALTER TABLE team_members 
DROP CONSTRAINT IF EXISTS team_members_status_check;

ALTER TABLE team_members 
ADD CONSTRAINT team_members_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'leader', 'admin'));

-- Team admins can update member status
DROP POLICY IF EXISTS "Team admins can update member status" ON team_members;
CREATE POLICY "Team admins can update member status"
  ON team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.status IN ('leader', 'admin')
    )
  );

-- Team admins can delete members
DROP POLICY IF EXISTS "Team admins can delete members" ON team_members;
CREATE POLICY "Team admins can delete members"
  ON team_members FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.status IN ('leader', 'admin')
    )
  );

-- ============================================================================
-- 4. MESSAGES TABLE FOR CHAT
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'join_request', 'file')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages

-- Team members can read messages
CREATE POLICY "Team members can read messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = messages.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.status IN ('accepted', 'leader', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = messages.team_id
      AND teams.creator_id = auth.uid()
    )
  );

-- Team members can send messages (not pending)
CREATE POLICY "Team members can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    (
      EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = messages.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.status IN ('accepted', 'leader', 'admin')
      )
      OR
      EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = messages.team_id
        AND teams.creator_id = auth.uid()
      )
      -- Allow join request messages from pending members
      OR (
        messages.message_type = 'join_request' AND
        EXISTS (
          SELECT 1 FROM team_members
          WHERE team_members.team_id = messages.team_id
          AND team_members.user_id = auth.uid()
        )
      )
    )
  );

-- Users can update their own messages (mark as read)
CREATE POLICY "Users can update message read status"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = messages.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.status IN ('accepted', 'leader', 'admin')
    )
  );

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_team_id ON messages(team_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_team_read ON messages(team_id, read);

-- Trigger for messages updated_at
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. STORAGE BUCKET FOR AVATARS
-- Run this in Supabase dashboard or via CLI
-- ============================================================================

-- Create avatars storage bucket (run in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars bucket (run in Supabase dashboard)
-- Allow authenticated users to upload their own avatar
-- CREATE POLICY "Users can upload own avatar"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'avatars');

-- Allow public access to avatars
-- CREATE POLICY "Public avatar access"
--   ON storage.objects FOR SELECT
--   TO public
--   USING (bucket_id = 'avatars');

-- ============================================================================
-- 6. ENABLE REALTIME FOR MESSAGES
-- ============================================================================

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================
-- 
-- PROFILES table new columns:
--   - full_name: TEXT - User's full display name
--   - avatar_url: TEXT - URL to profile picture
--   - bio: TEXT - User biography/description  
--   - github_url: TEXT - GitHub profile link
--   - linkedin_url: TEXT - LinkedIn profile link
--   - portfolio_url: TEXT - Personal portfolio link
--
-- EVENTS table new columns:
--   - created_by: UUID - User who created the event
--
-- TEAM_MEMBERS status values:
--   - 'pending' - Request to join (existing)
--   - 'accepted' - Regular member (existing)
--   - 'rejected' - Request denied (existing)
--   - 'leader' - Team creator/leader (existing)
--   - 'admin' - Team admin with management privileges (NEW)
--
-- MESSAGES table (NEW):
--   - id: UUID - Primary key
--   - team_id: UUID - Reference to teams table
--   - sender_id: UUID - Reference to profiles table
--   - content: TEXT - Message content
--   - message_type: TEXT - 'text', 'system', 'join_request', 'file'
--   - read: BOOLEAN - Whether message has been read
--   - created_at: TIMESTAMPTZ - When message was sent
--   - updated_at: TIMESTAMPTZ - Last update time
--
-- STORAGE:
--   - avatars bucket for profile pictures (create manually)
--
-- ============================================================================
