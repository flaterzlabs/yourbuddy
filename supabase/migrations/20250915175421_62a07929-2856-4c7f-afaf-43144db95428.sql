-- Garante que estudantes só vejam perfis de cuidadores conectados
-- Create function to check if a student is connected to a caregiver
CREATE OR REPLACE FUNCTION public.is_student_connected_to_caregiver(student_uuid uuid, caregiver_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.connections 
    WHERE student_id = student_uuid 
    AND caregiver_id = caregiver_uuid 
    AND status = 'active'
  );
$$;

-- Create RLS policy to allow students to view connected caregiver profiles
CREATE POLICY "Connected students can view caregiver profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (role IN ('caregiver', 'educator')) 
  AND is_student_connected_to_caregiver(auth.uid(), user_id)
);
