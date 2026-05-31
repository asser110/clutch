-- Ensure real-time is enabled for calls and call_signals tables
-- These need to be in the supabase_realtime publication to broadcast events

ALTER PUBLICATION supabase_realtime ADD TABLE calls;
ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;
