-- Drop the insecure policy that allows any authenticated user to create notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a new policy that only allows admins to create notifications
-- Edge functions using service_role_key will bypass RLS automatically
CREATE POLICY "Only admins can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));