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
