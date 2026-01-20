-- Migration: Add Direct Messages (DM) feature
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. DM CONVERSATIONS TABLE
-- ============================================================================
-- Tracks 1:1 conversations between two users
CREATE TABLE IF NOT EXISTS dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure user1_id < user2_id to prevent duplicate conversations
  CONSTRAINT dm_conversations_user_order CHECK (user1_id < user2_id),
  CONSTRAINT dm_conversations_unique UNIQUE (user1_id, user2_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dm_conversations_user1 ON dm_conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_dm_conversations_user2 ON dm_conversations(user2_id);

-- Enable RLS
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own conversations
CREATE POLICY "Users can view their own DM conversations"
  ON dm_conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can create conversations they're part of
CREATE POLICY "Users can create DM conversations"
  ON dm_conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============================================================================
-- 2. DIRECT MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'system'
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation ON direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_created_at ON direct_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender ON direct_messages(sender_id);

-- Enable RLS
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see messages in their conversations
CREATE POLICY "Users can view messages in their DM conversations"
  ON direct_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dm_conversations 
      WHERE dm_conversations.id = direct_messages.conversation_id
      AND (dm_conversations.user1_id = auth.uid() OR dm_conversations.user2_id = auth.uid())
    )
  );

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages in their DM conversations"
  ON direct_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM dm_conversations 
      WHERE dm_conversations.id = direct_messages.conversation_id
      AND (dm_conversations.user1_id = auth.uid() OR dm_conversations.user2_id = auth.uid())
    )
  );

-- Users can update (mark as read) messages sent to them
CREATE POLICY "Users can mark their received messages as read"
  ON direct_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM dm_conversations 
      WHERE dm_conversations.id = direct_messages.conversation_id
      AND (dm_conversations.user1_id = auth.uid() OR dm_conversations.user2_id = auth.uid())
    )
  );

-- ============================================================================
-- 3. TEAM CHAT REQUESTS TABLE
-- ============================================================================
-- When a user wants to join a team's chat, they first message the leader
-- The leader can then accept/reject the chat request
CREATE TABLE IF NOT EXISTS team_chat_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  message TEXT, -- Initial message to the leader
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT team_chat_requests_unique UNIQUE (team_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_chat_requests_team ON team_chat_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_team_chat_requests_user ON team_chat_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_team_chat_requests_status ON team_chat_requests(status);

-- Enable RLS
ALTER TABLE team_chat_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can see requests for teams they lead or their own requests
CREATE POLICY "Users can view their chat requests"
  ON team_chat_requests FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM teams WHERE teams.id = team_chat_requests.team_id AND teams.creator_id = auth.uid()
    )
  );

-- Users can create their own chat requests
CREATE POLICY "Users can create chat requests"
  ON team_chat_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Team leaders can update chat request status
CREATE POLICY "Team leaders can update chat requests"
  ON team_chat_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams WHERE teams.id = team_chat_requests.team_id AND teams.creator_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. HELPER FUNCTION: Get or Create DM Conversation
-- ============================================================================
CREATE OR REPLACE FUNCTION get_or_create_dm_conversation(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  current_user_id UUID := auth.uid();
  conv_id UUID;
  user1 UUID;
  user2 UUID;
BEGIN
  -- Determine user1 and user2 (user1 < user2)
  IF current_user_id < other_user_id THEN
    user1 := current_user_id;
    user2 := other_user_id;
  ELSE
    user1 := other_user_id;
    user2 := current_user_id;
  END IF;
  
  -- Try to find existing conversation
  SELECT id INTO conv_id FROM dm_conversations 
  WHERE dm_conversations.user1_id = user1 AND dm_conversations.user2_id = user2;
  
  -- If not found, create one
  IF conv_id IS NULL THEN
    INSERT INTO dm_conversations (user1_id, user2_id)
    VALUES (user1, user2)
    RETURNING id INTO conv_id;
  END IF;
  
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. UPDATE TRIGGER FOR updated_at columns
-- ============================================================================
-- Trigger for dm_conversations
DROP TRIGGER IF EXISTS update_dm_conversations_updated_at ON dm_conversations;
CREATE TRIGGER update_dm_conversations_updated_at
  BEFORE UPDATE ON dm_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for team_chat_requests
DROP TRIGGER IF EXISTS update_team_chat_requests_updated_at ON team_chat_requests;
CREATE TRIGGER update_team_chat_requests_updated_at
  BEFORE UPDATE ON team_chat_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SUMMARY:
-- ============================================================================
-- New tables:
--   - dm_conversations: Tracks 1:1 DM conversations between users
--   - direct_messages: Stores actual DM messages
--   - team_chat_requests: Tracks requests to join team chat (leader approval)
--
-- New function:
--   - get_or_create_dm_conversation(other_user_id): Gets or creates a DM conversation
--
-- Flow:
--   1. User A finds User B in Explore -> clicks "Message" -> starts DM
--   2. User wants to join Team -> first messages leader via DM
--   3. Leader accepts -> user added to team_members -> can access team chat
