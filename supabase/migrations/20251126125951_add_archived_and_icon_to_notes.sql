/*
  # Add Archive and Icon Fields to Notes

  ## Changes
  Add archived and icon fields to notes table
  - archived: boolean to track if note is archived
  - icon: text to store icon identifier

  ## Fields
  - archived (boolean, default false): Whether the note is archived
  - icon (text, nullable): Icon identifier for the note
*/

-- Add archived column to notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'archived'
  ) THEN
    ALTER TABLE notes ADD COLUMN archived boolean DEFAULT false;
  END IF;
END $$;

-- Add icon column to notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'icon'
  ) THEN
    ALTER TABLE notes ADD COLUMN icon text;
  END IF;
END $$;