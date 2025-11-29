/*
  # Fix Notifications Insert Policy - Remove Role Restriction
  
  1. Changes
    - Drop existing INSERT policy
    - Create policy without TO clause but with auth check in WITH CHECK
    - This allows the policy to apply to all roles but only pass if authenticated
  
  2. Security
    - WITH CHECK ensures only authenticated users can insert
    - More permissive role assignment but stricter check
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;

-- Create policy that applies to all roles but checks authentication
CREATE POLICY "Allow authenticated insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
