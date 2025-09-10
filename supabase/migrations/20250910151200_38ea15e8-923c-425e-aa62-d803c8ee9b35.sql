-- Create missing RPC function for connection by code
CREATE OR REPLACE FUNCTION public.create_connection_by_code(input_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  student_uuid UUID;
  connection_id UUID;
BEGIN
  -- Find student by code
  SELECT user_id INTO student_uuid 
  FROM public.profiles 
  WHERE student_code = input_code AND role = 'student';
  
  IF student_uuid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Código não encontrado');
  END IF;
  
  -- Check if connection already exists
  IF EXISTS (
    SELECT 1 FROM public.connections 
    WHERE student_id = student_uuid 
    AND caregiver_id = auth.uid()
    AND status IN ('pending', 'active')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Conexão já existe');
  END IF;
  
  -- Create connection
  INSERT INTO public.connections (student_id, caregiver_id, status)
  VALUES (student_uuid, auth.uid(), 'pending')
  RETURNING id INTO connection_id;
  
  RETURN json_build_object('success', true, 'connection_id', connection_id);
END;
$$;

-- Enable realtime for tables (if not already done)
ALTER TABLE public.help_requests REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL; 
ALTER TABLE public.connections REPLICA IDENTITY FULL;