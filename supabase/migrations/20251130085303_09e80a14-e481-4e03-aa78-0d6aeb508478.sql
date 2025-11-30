-- Allow admins to delete complaints
CREATE POLICY "Admins can delete complaints"
ON public.complaints FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete complaint media
CREATE POLICY "Admins can delete complaint media"
ON public.complaint_media FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));