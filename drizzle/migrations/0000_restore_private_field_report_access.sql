GRANT SELECT, INSERT ON public.field_messages TO authenticated;
GRANT ALL ON public.field_messages TO service_role;
REVOKE ALL ON public.field_messages FROM anon;
ALTER TABLE public.field_messages ENABLE ROW LEVEL SECURITY;