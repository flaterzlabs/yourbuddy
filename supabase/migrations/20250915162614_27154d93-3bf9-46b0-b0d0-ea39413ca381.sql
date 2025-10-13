-- Adiciona a coluna caregiver_code em public.profiles.
-- Atualiza handle_new_user() para criar o profile do usuário no signup,
-- gerando student_code para alunos e caregiver_code para cuidadores/educadores.
-- Cria create_student_connection_by_caregiver_code(code), que permite ao aluno autenticado
-- localizar um cuidador/educador pelo código, evitar duplicidade e criar conexão (status 'active').
-- Atualiza a RLS em public.connections para permitir INSERT somente quando auth.uid() = student_id.
-- Efeito: cuidadores compartilham um código e alunos se conectam usando esse código, com RLS garantindo auto-serviço seguro.
-- Add caregiver_code column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN caregiver_code VARCHAR(8);

-- Update the handle_new_user function to generate codes for both students and caregivers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, username, role, student_code, caregiver_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'student'),
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'student') = 'student' 
      THEN public.generate_student_code()
      ELSE NULL
    END,
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'student') IN ('caregiver', 'educator')
      THEN public.generate_student_code()
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$function$;

-- Create function for students to connect using caregiver code
CREATE OR REPLACE FUNCTION public.create_student_connection_by_caregiver_code(input_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  caregiver_uuid UUID;
  caregiver_username TEXT;
  connection_id UUID;
BEGIN
  -- Find caregiver by code and get their info
  SELECT user_id, username INTO caregiver_uuid, caregiver_username
  FROM public.profiles 
  WHERE caregiver_code = input_code AND role IN ('caregiver', 'educator');
  
  IF caregiver_uuid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Código não encontrado');
  END IF;
  
  -- Check if connection already exists
  IF EXISTS (
    SELECT 1 FROM public.connections 
    WHERE student_id = auth.uid()
    AND caregiver_id = caregiver_uuid
    AND status IN ('pending', 'active')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Conexão já existe');
  END IF;
  
  -- Create connection with active status
  INSERT INTO public.connections (student_id, caregiver_id, status)
  VALUES (auth.uid(), caregiver_uuid, 'active')
  RETURNING id INTO connection_id;
  
  -- Return success with caregiver information
  RETURN json_build_object(
    'success', true, 
    'connection_id', connection_id,
    'caregiver', json_build_object(
      'user_id', caregiver_uuid,
      'username', caregiver_username,
      'caregiver_code', input_code
    )
  );
END;
$function$;

-- Update RLS policy to allow students to create connections
DROP POLICY IF EXISTS "Students can create connections" ON public.connections;
CREATE POLICY "Students can create connections" 
ON public.connections 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);
