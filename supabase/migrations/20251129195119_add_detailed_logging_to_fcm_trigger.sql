/*
  # Add Detailed Logging to FCM Trigger

  1. Changes
    - Add detailed logging to understand token selection
    - Log which token is being used
    - This helps debug duplicate notification issue
*/

DROP FUNCTION IF EXISTS send_fcm_push_notification() CASCADE;

CREATE OR REPLACE FUNCTION send_fcm_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  fcm_token text;
  token_count integer;
BEGIN
  -- Count total tokens for debugging
  SELECT COUNT(*) INTO token_count
  FROM notification_tokens
  WHERE user_id = NEW.user_id;
  
  RAISE LOG 'User % has % total tokens', NEW.user_id, token_count;

  -- Get only the most recent FCM token for the user
  SELECT token INTO fcm_token
  FROM notification_tokens
  WHERE user_id = NEW.user_id
  ORDER BY created_at DESC
  LIMIT 1;

  RAISE LOG 'Selected token for user %: %', NEW.user_id, SUBSTRING(fcm_token, 1, 20);

  -- Only proceed if we have a token
  IF fcm_token IS NOT NULL THEN
    RAISE LOG 'Sending FCM notification: % - %', NEW.title, NEW.body;
    
    -- Call edge function (async, fire and forget)
    PERFORM net.http_post(
      url := 'https://wgqfdspakixzhbpjmwmr.supabase.co/functions/v1/send-notification-fcm',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncWZkc3Bha2l4emhicGptd21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2MjYwNjYsImV4cCI6MjA0ODIwMjA2Nn0.G4G-rYhIZkVz4X9-YKRmcdAYiQWW6hBM0Gp6z9cj7jY'
      ),
      body := jsonb_build_object(
        'tokens', jsonb_build_array(fcm_token),
        'title', NEW.title,
        'body', NEW.body,
        'noteId', NEW.note_id
      )
    );
    
    RAISE LOG 'FCM notification request sent';
  ELSE
    RAISE LOG 'No FCM token found for user %', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_fcm_push_notification();
