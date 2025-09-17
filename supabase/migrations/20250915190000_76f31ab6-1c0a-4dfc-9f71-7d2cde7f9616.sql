-- Remove a coluna message de public.help_requests, pois o campo não será mais utilizado.

ALTER TABLE public.help_requests
DROP COLUMN message;
