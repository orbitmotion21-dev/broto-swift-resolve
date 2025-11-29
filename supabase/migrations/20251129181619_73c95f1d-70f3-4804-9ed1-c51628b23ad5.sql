-- Drop the overly permissive admin policy that allows viewing any profile
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a restricted policy: admins can only view profiles of students with complaints
-- This prevents harvesting phone numbers of students who haven't submitted complaints
CREATE POLICY "Admins can view profiles through complaints"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = id) OR
  (has_role(auth.uid(), 'admin'::app_role) AND
   EXISTS (
     SELECT 1 FROM public.complaints
     WHERE complaints.student_id = profiles.id
   ))
);