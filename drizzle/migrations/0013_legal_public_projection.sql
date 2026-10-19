REVOKE SELECT ON public.platform_legal_settings FROM anon;
ALTER POLICY "Public legal disclosures" ON public.platform_legal_settings TO authenticated USING (private.is_platform_operator());
CREATE FUNCTION public.public_legal_settings() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT coalesce((SELECT jsonb_build_object('details',details-'tax_number'-'internal_notes','updated_at',updated_at) FROM platform_legal_settings WHERE id=true),jsonb_build_object('details','{}'::jsonb,'updated_at',null)) $$;
REVOKE ALL ON FUNCTION public.public_legal_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_legal_settings() TO anon, authenticated;