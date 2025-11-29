/*
  # Remove Notification Triggers

  1. Changes
    - Drop notification triggers and functions
    - Notifications are now handled client-side via browser API
    
  2. Reason
    - Triggers were using pg_net which requires additional setup
    - Client-side notifications are simpler and more reliable for browser apps
*/

-- Drop triggers
DROP TRIGGER IF EXISTS note_shared_notification ON note_shares;
DROP TRIGGER IF EXISTS task_completion_notification ON tasks;

-- Drop functions
DROP FUNCTION IF EXISTS notify_note_shared();
DROP FUNCTION IF EXISTS notify_task_completed();
