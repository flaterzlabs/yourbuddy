-- Atualiza a RPC para ativar conexões imediatamente e devolver dados do estudante
-- Update the create_connection_by_code function to set connections as active immediately
-- and return student information for immediate display
CREATE OR REPLACE FUNCTION public.create_connection_by_code(input_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  student_uuid UUID;
  student_username TEXT;
  connection_id UUID;
BEGIN
  -- Find student by code and get their info
  SELECT user_id, username INTO student_uuid, student_username
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
  
  -- Create connection with active status (no approval needed)
  INSERT INTO public.connections (student_id, caregiver_id, status)
  VALUES (student_uuid, auth.uid(), 'active')
  RETURNING id INTO connection_id;
  
  -- Return success with student information
  RETURN json_build_object(
    'success', true, 
    'connection_id', connection_id,
    'student', json_build_object(
      'user_id', student_uuid,
      'username', student_username,
      'student_code', input_code
    )
  );
END;
$function$;
