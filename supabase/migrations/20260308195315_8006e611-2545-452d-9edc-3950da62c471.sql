-- Fix overly permissive INSERT policies - restrict to service role only
-- Drop the permissive policies
DROP POLICY "Service role can insert readings" ON public.cgm_readings;
DROP POLICY "Service role can insert events" ON public.cgm_events;

-- Recreate with proper restrictions (service role bypasses RLS anyway, 
-- so we restrict authenticated users to only insert for their own members)
CREATE POLICY "Users can insert readings for their members"
  ON public.cgm_readings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE members.id = cgm_readings.member_id
      AND members.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert events for their members"
  ON public.cgm_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE members.id = cgm_events.member_id
      AND members.parent_user_id = auth.uid()
    )
  );