-- Create Calls Table (For WebRTC calling)
CREATE TABLE IF NOT EXISTS calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID REFERENCES profiles(id) NOT NULL,
  callee_id UUID REFERENCES profiles(id) NOT NULL,
  call_type TEXT CHECK (call_type IN ('voice', 'video')) NOT NULL,
  status TEXT CHECK (status IN ('ringing', 'connected', 'ended', 'declined')) DEFAULT 'ringing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calls they participate in" ON calls FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "Users can insert calls as caller" ON calls FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Users can update calls they participate in" ON calls FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = callee_id);


-- Create Call Signals Table (For WebRTC signaling)
CREATE TABLE IF NOT EXISTS call_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID REFERENCES calls(id) NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  signal_type TEXT CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')) NOT NULL,
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signals for their calls" ON call_signals FOR SELECT USING (
  EXISTS (SELECT 1 FROM calls WHERE calls.id = call_signals.call_id AND (calls.caller_id = auth.uid() OR calls.callee_id = auth.uid()))
);
CREATE POLICY "Users can insert signals for their calls" ON call_signals FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM calls WHERE calls.id = call_signals.call_id AND (calls.caller_id = auth.uid() OR calls.callee_id = auth.uid()))
);


-- Enable real-time for calls and call_signals
ALTER TABLE calls REPLICA IDENTITY FULL;
ALTER TABLE call_signals REPLICA IDENTITY FULL;
