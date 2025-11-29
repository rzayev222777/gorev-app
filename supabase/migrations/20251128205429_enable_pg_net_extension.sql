/*
  # Enable pg_net Extension

  ## Changes
  Enable the pg_net extension for HTTP requests from database triggers

  ## Purpose
  Required for sending notifications from database triggers to Edge Functions
*/

CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
