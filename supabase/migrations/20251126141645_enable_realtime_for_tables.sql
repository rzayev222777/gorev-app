/*
  # Enable Realtime for Tables

  1. Changes
    - Enable realtime for notes table
    - Enable realtime for note_shares table
    - Enable realtime for tasks table
    - Enable realtime for profiles table

  2. Purpose
    - Allow real-time updates when data changes
    - Users will see changes immediately without refreshing
    - Enables live collaboration features
*/

ALTER PUBLICATION supabase_realtime ADD TABLE notes;
ALTER PUBLICATION supabase_realtime ADD TABLE note_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
