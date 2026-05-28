-- Run this in the Supabase SQL Editor to update existing tables

-- 1. Profiles Table (Update existing)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add our required columns (these commands are safe if the columns already exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS online_status BOOLEAN DEFAULT false;

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



