-- Migration to add skills_verified column to profiles table
-- Run this in your Supabase SQL editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS skills_verified BOOLEAN DEFAULT FALSE;

-- Update the updated_at timestamp when skills_verified changes
-- (Already handled by the existing trigger)
