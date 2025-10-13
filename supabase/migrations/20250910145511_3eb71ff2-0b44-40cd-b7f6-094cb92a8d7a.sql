-- Configura a estrutura inicial com tipos, tabelas, políticas RLS e gatilhos essenciais do app
-- Create custom types
CREATE TYPE public.user_role AS ENUM ('student', 'caregiver', 'educator');
CREATE TYPE public.connection_status AS ENUM ('pending', 'active', 'blocked');
CREATE TYPE public.urgency_level AS ENUM ('ok', 'attention', 'urgent');
CREATE TYPE public.request_status AS ENUM ('open', 'answered', 'closed');
CREATE TYPE public.notification_type AS ENUM ('help_request', 'response', 'connection_request');
CREATE TYPE public.notification_status AS ENUM ('sent', 'read');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  role user_role NOT NULL,
  student_code VARCHAR(8) UNIQUE, -- Only for students
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create thrive_sprites table
CREATE TABLE public.thrive_sprites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL UNIQUE REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create connections table
CREATE TABLE public.connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status connection_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, caregiver_id)
);

-- Create help_requests table
CREATE TABLE public.help_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  urgency urgency_level DEFAULT 'ok',
  status request_status DEFAULT 'open',
  message TEXT,
  resolved_by UUID REFERENCES public.profiles(user_id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  help_request_id UUID REFERENCES public.help_requests(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  status notification_status DEFAULT 'sent',
  title TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thrive_sprites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create security definer functions
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.is_connected_to_student(caregiver_uuid UUID, student_uuid UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.connections 
    WHERE caregiver_id = caregiver_uuid 
    AND student_id = student_uuid 
    AND status = 'active'
  );
$$;

-- Function to generate unique student code
CREATE OR REPLACE FUNCTION public.generate_student_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, role, student_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'student'),
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'student') = 'student' 
      THEN generate_student_code()
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to create notifications
CREATE OR REPLACE FUNCTION public.create_help_request_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to handle help request resolution
CREATE OR REPLACE FUNCTION public.handle_help_request_resolution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_thrive_sprites_updated_at
  BEFORE UPDATE ON public.thrive_sprites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_help_requests_updated_at
  BEFORE UPDATE ON public.help_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_help_request_created
  AFTER INSERT ON public.help_requests
  FOR EACH ROW EXECUTE FUNCTION public.create_help_request_notifications();

CREATE TRIGGER on_help_request_updated
  AFTER UPDATE ON public.help_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_help_request_resolution();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Connected caregivers can view student profiles"
ON public.profiles FOR SELECT
USING (
  role = 'student' AND 
  public.is_connected_to_student(auth.uid(), user_id)
);

-- RLS Policies for thrive_sprites
CREATE POLICY "Students can manage their own sprite" 
ON public.thrive_sprites FOR ALL 
USING (auth.uid() = student_id);

CREATE POLICY "Connected caregivers can view student sprites"
ON public.thrive_sprites FOR SELECT
USING (public.is_connected_to_student(auth.uid(), student_id));

-- RLS Policies for connections
CREATE POLICY "Users can view their own connections" 
ON public.connections FOR SELECT 
USING (auth.uid() = student_id OR auth.uid() = caregiver_id);

CREATE POLICY "Students can create connections" 
ON public.connections FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Caregivers can update connection status" 
ON public.connections FOR UPDATE 
USING (auth.uid() = caregiver_id);

-- RLS Policies for help_requests
CREATE POLICY "Students can manage their own help requests" 
ON public.help_requests FOR ALL 
USING (auth.uid() = student_id);

CREATE POLICY "Connected caregivers can view and resolve help requests"
ON public.help_requests FOR SELECT
USING (public.is_connected_to_student(auth.uid(), student_id));

CREATE POLICY "Connected caregivers can update help requests"
ON public.help_requests FOR UPDATE
USING (public.is_connected_to_student(auth.uid(), student_id));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_student_code ON public.profiles(student_code);
CREATE INDEX idx_connections_student_id ON public.connections(student_id);
CREATE INDEX idx_connections_caregiver_id ON public.connections(caregiver_id);
CREATE INDEX idx_help_requests_student_id ON public.help_requests(student_id);
CREATE INDEX idx_help_requests_status ON public.help_requests(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);
