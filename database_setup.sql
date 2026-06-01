-- Run this in the Supabase SQL Editor to update existing tables

-- 1. Profiles Table (Update existing)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add our required columns (these commands are safe if the columns already exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS online_status BOOLEAN DEFAULT false;

UPDATE profiles SET username = nickname WHERE username IS NULL AND nickname IS NOT NULL;
ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;

-- Enable real-time for profiles table
ALTER TABLE profiles REPLICA IDENTITY FULL;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Reset and apply policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;

CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);


-- 2. Friends Table
CREATE TABLE IF NOT EXISTS friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  friend_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, friend_id)
);

ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Reset and apply policies
DROP POLICY IF EXISTS "Users can see their own friends." ON friends;
DROP POLICY IF EXISTS "Users can insert friends." ON friends;
DROP POLICY IF EXISTS "Users can update friends." ON friends;
DROP POLICY IF EXISTS "Users can delete friends." ON friends;

CREATE POLICY "Users can see their own friends." ON friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can insert friends." ON friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update friends." ON friends FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);
CREATE POLICY "Users can delete friends." ON friends FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);


-- 4. Calls Table (For WebRTC calling)
CREATE TABLE IF NOT EXISTS calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID REFERENCES profiles(id) NOT NULL,
  callee_id UUID REFERENCES profiles(id) NOT NULL,
  call_type TEXT CHECK (call_type IN ('voice', 'video')) NOT NULL,
  status TEXT CHECK (status IN ('ringing', 'connected', 'ended', 'declined')) DEFAULT 'ringing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calls they participate in" ON calls FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "Users can insert calls as caller" ON calls FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Users can update calls they participate in" ON calls FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = callee_id);


-- 5. Call Signals Table (For WebRTC signaling)
CREATE TABLE IF NOT EXISTS call_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID REFERENCES calls(id) NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  signal_type TEXT CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')) NOT NULL,
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signals for their calls" ON call_signals FOR SELECT USING (
  EXISTS (SELECT 1 FROM calls WHERE calls.id = call_signals.call_id AND (calls.caller_id = auth.uid() OR calls.callee_id = auth.uid()))
);
CREATE POLICY "Users can insert signals for their calls" ON call_signals FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM calls WHERE calls.id = call_signals.call_id AND (calls.caller_id = auth.uid() OR calls.callee_id = auth.uid()))
);



-- Enable real-time for calls and call_signals
ALTER TABLE calls REPLICA IDENTITY FULL;
ALTER TABLE call_signals REPLICA IDENTITY FULL;


-- 6. Groups Table (For Group Messaging)
CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups REPLICA IDENTITY FULL;

CREATE POLICY "Users can view groups they are members of" ON groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid())
);
CREATE POLICY "Users can create groups" ON groups FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Group creators can update groups" ON groups FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Group creators can delete groups" ON groups FOR DELETE USING (auth.uid() = creator_id);


-- 7. Group Members Table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_muted BOOLEAN DEFAULT false,
  UNIQUE(group_id, user_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members REPLICA IDENTITY FULL;

CREATE POLICY "Users can view their group memberships" ON group_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own membership settings" ON group_members FOR UPDATE USING (auth.uid() = user_id);


-- 8. Group Messages Table
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages REPLICA IDENTITY FULL;

CREATE POLICY "Group members can view messages" ON group_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_messages.group_id AND group_members.user_id = auth.uid())
);
CREATE POLICY "Group members can send messages" ON group_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_messages.group_id AND group_members.user_id = auth.uid())
);


-- 9. Message Reactions Table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions REPLICA IDENTITY FULL;

CREATE POLICY "Users can view reactions" ON message_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON message_reactions FOR DELETE USING (auth.uid() = user_id);


-- 10. Pinned Messages Table
CREATE TABLE IF NOT EXISTS pinned_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) NOT NULL,
  group_id UUID REFERENCES groups(id),
  pinned_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_messages REPLICA IDENTITY FULL;

CREATE POLICY "Users can view pinned messages" ON pinned_messages FOR SELECT USING (
  CASE WHEN group_id IS NOT NULL THEN
    EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = pinned_messages.group_id AND group_members.user_id = auth.uid())
  ELSE
    true
  END
);


-- 11. Typing Indicators Table (temporary, auto-cleanup)
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  conversation_id UUID,
  group_id UUID REFERENCES groups(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators REPLICA IDENTITY FULL;

CREATE POLICY "Users can view typing indicators" ON typing_indicators FOR SELECT USING (true);
CREATE POLICY "Users can insert typing indicators" ON typing_indicators FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own typing indicators" ON typing_indicators FOR DELETE USING (auth.uid() = user_id);


-- 12. Read Receipts Table
CREATE TABLE IF NOT EXISTS read_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(message_id, user_id)
);

ALTER TABLE read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_receipts REPLICA IDENTITY FULL;

CREATE POLICY "Users can view read receipts for their messages" ON read_receipts FOR SELECT USING (
  EXISTS (SELECT 1 FROM messages WHERE messages.id = read_receipts.message_id AND messages.sender_id = auth.uid())
);
CREATE POLICY "Users can add read receipts" ON read_receipts FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 13. User Blocks Table
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID REFERENCES profiles(id) NOT NULL,
  blocked_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks REPLICA IDENTITY FULL;

CREATE POLICY "Users can view their blocks" ON user_blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can block others" ON user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON user_blocks FOR DELETE USING (auth.uid() = blocker_id);



