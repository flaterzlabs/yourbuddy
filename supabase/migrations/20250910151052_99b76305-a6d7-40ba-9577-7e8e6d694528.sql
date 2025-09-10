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

-- Create triggers for help requests and profile updates
CREATE TRIGGER help_request_notifications
  AFTER INSERT ON public.help_requests
  FOR EACH ROW EXECUTE FUNCTION public.create_help_request_notifications();

CREATE TRIGGER help_request_resolution_notifications
  AFTER UPDATE ON public.help_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_help_request_resolution();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_help_requests_updated_at
  BEFORE UPDATE ON public.help_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tables
ALTER TABLE public.help_requests REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.connections REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.help_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;