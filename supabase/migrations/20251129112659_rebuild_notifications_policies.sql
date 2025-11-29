/*
  # Rebuild Notifications Policies from Scratch
  
  1. Changes
    - Drop ALL existing policies on notifications table
    - Recreate with correct permissions
    - Allow authenticated users to create notifications for ANY user
    - Allow users to read/update/delete ONLY their own notifications
  
  2. Security
    - Authenticated users can send notifications to others (required for collaboration features)
    - Users can only access their own received notifications
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications for others" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Recreate policies with correct permissions
CREATE POLICY "Anyone authenticated can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users read own notifications only"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications only"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications only"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
