/*
  # Add Email Column to Profiles

  ## Changes
  Add email column to profiles table to enable email-based user search
  for sharing notes. This allows users to invite others by email.

  ## New Column
  - `email` (text, unique) - User's email address from auth.users
*/

-- Add email column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text UNIQUE;
  END IF;
END $$;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Update existing profiles with email from auth.users
UPDATE profiles
SET email = au.email
FROM auth.users au
WHERE profiles.id = au.id AND profiles.email IS NULL;