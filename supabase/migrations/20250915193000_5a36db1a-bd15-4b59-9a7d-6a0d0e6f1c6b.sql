-- Adiciona função utilitária para buscar email pelo username, permitindo login híbrido.

CREATE OR REPLACE FUNCTION public.get_email_by_username(input_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.email
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE LOWER(p.username) = LOWER(input_username)
  LIMIT 1;
$$;

-- Para desfazer: DROP FUNCTION IF EXISTS public.get_email_by_username(text);
