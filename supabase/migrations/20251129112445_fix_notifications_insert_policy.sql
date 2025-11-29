/*
  # Fix Notifications Insert Policy
  
  1. Changes
    - Drop the restrictive INSERT policy that was blocking notification creation
    - Create a new policy that allows authenticated users to create notifications for any user
    - This is necessary because users need to send notifications to other users when:
      * Sharing notes
      * Adding tasks to shared notes
      * Completing tasks in shared notes
  
  2. Security
    - Only authenticated users can create notifications (prevents anonymous abuse)
    - Users can still only READ their own notifications
    - Users can still only UPDATE/DELETE their own notifications
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;

-- Create a new policy that allows authenticated users to create notifications
CREATE POLICY "Authenticated users can create notifications for others"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
