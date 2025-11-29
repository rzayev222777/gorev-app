/*
  # Add Completed By Field to Tasks

  ## Changes
  Add completed_by field to track who completed each task
  This is useful for shared notes to show who did what

  ## Fields
  - completed_by (uuid, nullable): ID of user who completed the task
*/

-- Add completed_by column to tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'completed_by'
  ) THEN
    ALTER TABLE tasks ADD COLUMN completed_by uuid REFERENCES profiles(id);
  END IF;
END $$;