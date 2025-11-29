/*
  # Reset All Users and Data

  1. Changes
    - Delete all tasks
    - Delete all note shares
    - Delete all notes
    - Delete all profiles
    - Delete all auth users

  2. Security
    - This is a complete database reset
    - All user data will be permanently deleted
*/

-- Delete all tasks first (due to foreign key constraints)
DELETE FROM tasks;

-- Delete all note shares
DELETE FROM note_shares;

-- Delete all notes
DELETE FROM notes;

-- Delete all profiles
DELETE FROM profiles;

-- Delete all auth users (this is the Supabase auth table)
DELETE FROM auth.users;
