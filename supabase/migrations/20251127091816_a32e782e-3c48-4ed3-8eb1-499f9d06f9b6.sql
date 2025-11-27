-- Allow students to delete their own pending complaints
CREATE POLICY "Students can delete their own pending complaints"
ON public.complaints
FOR DELETE
USING (
  auth.uid() = student_id 
  AND status = 'Pending'::text
);

-- Update notifications foreign key to handle deletion gracefully
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_complaint_id_fkey;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_complaint_id_fkey
FOREIGN KEY (complaint_id) REFERENCES public.complaints(id)
ON DELETE SET NULL;