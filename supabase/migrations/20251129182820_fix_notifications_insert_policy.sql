/*
  # Fix Notifications Insert Policy - Alternative Approach
  
  1. Changes
    - Drop existing INSERT policy
    - Create new policy with explicit auth check in WITH CHECK clause
    - Use auth.uid() IS NOT NULL instead of just true
  
  2. Security
    - Only users who are authenticated (have auth.uid()) can insert
    - More explicit than WITH CHECK (true)
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Anyone authenticated can insert notifications" ON notifications;

-- Create new policy with explicit authentication check
CREATE POLICY "Authenticated users can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
