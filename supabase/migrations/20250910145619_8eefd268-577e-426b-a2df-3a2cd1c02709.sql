-- Fix security warning: Update functions to have immutable search_path
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.is_connected_to_student(caregiver_uuid UUID, student_uuid UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.connections 
    WHERE caregiver_id = caregiver_uuid 
    AND student_id = student_uuid 
    AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_student_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE student_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, role, student_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'student'),
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'student') = 'student' 
      THEN public.generate_student_code()
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_help_request_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Notify all connected caregivers
  INSERT INTO public.notifications (user_id, help_request_id, type, title, message)
  SELECT 
    c.caregiver_id,
    NEW.id,
    'help_request',
    'Pedido de Ajuda',
    'Um estudante conectado precisa de ajuda'
  FROM public.connections c
  WHERE c.student_id = NEW.student_id 
  AND c.status = 'active';
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_help_request_resolution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If status changed to 'answered' or 'closed', notify student
  IF OLD.status = 'open' AND NEW.status IN ('answered', 'closed') THEN
    INSERT INTO public.notifications (user_id, help_request_id, type, title, message)
    VALUES (
      NEW.student_id,
      NEW.id,
      'response',
      'Pedido Respondido',
      'Seu pedido de ajuda foi atendido'
    );
  END IF;
  
  RETURN NEW;
END;
$$;