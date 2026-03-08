-- Members table to store family members with Dexcom connections
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dob DATE,
  relationship TEXT,
  dexcom_access_token TEXT,
  dexcom_refresh_token TEXT,
  dexcom_token_expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own members"
  ON public.members FOR SELECT
  USING (auth.uid() = parent_user_id);

CREATE POLICY "Users can create their own members"
  ON public.members FOR INSERT
  WITH CHECK (auth.uid() = parent_user_id);

CREATE POLICY "Users can update their own members"
  ON public.members FOR UPDATE
  USING (auth.uid() = parent_user_id);

CREATE POLICY "Users can delete their own members"
  ON public.members FOR DELETE
  USING (auth.uid() = parent_user_id);

-- CGM readings cache
CREATE TABLE public.cgm_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  value INTEGER NOT NULL,
  trend TEXT,
  trend_rate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cgm_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view readings for their members"
  ON public.cgm_readings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE members.id = cgm_readings.member_id
      AND members.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert readings"
  ON public.cgm_readings FOR INSERT
  WITH CHECK (true);

-- Dexcom events cache
CREATE TABLE public.cgm_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type TEXT NOT NULL,
  value NUMERIC,
  duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cgm_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their members"
  ON public.cgm_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE members.id = cgm_events.member_id
      AND members.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert events"
  ON public.cgm_events FOR INSERT
  WITH CHECK (true);

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chat for their members"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE members.id = chat_messages.member_id
      AND members.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chat for their members"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE members.id = chat_messages.member_id
      AND members.parent_user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_cgm_readings_member_time ON public.cgm_readings (member_id, timestamp DESC);
CREATE INDEX idx_cgm_events_member_time ON public.cgm_events (member_id, timestamp DESC);
CREATE INDEX idx_chat_messages_member ON public.chat_messages (member_id, created_at);
CREATE INDEX idx_members_parent ON public.members (parent_user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();