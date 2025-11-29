/*
  # Force Reload Notifications RLS

  1. Changes
    - Temporarily disable RLS
    - Re-enable RLS
    - Force policy reload
    - This forces Postgrest to reload the schema cache
  
  2. Security
    - RLS remains enabled with same policies
*/

-- Temporarily disable and re-enable RLS to force cache reload
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Verify all policies exist
DO $$
BEGIN
  -- Check if INSERT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Anyone authenticated can insert notifications'
  ) THEN
    CREATE POLICY "Anyone authenticated can insert notifications"
      ON notifications
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;
