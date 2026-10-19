CREATE TABLE public.platform_legal_settings (
 id boolean PRIMARY KEY DEFAULT true CONSTRAINT singleton_legal_settings CHECK (id),
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_legal_settings TO anon, authenticated;
GRANT ALL ON public.platform_legal_settings TO service_role;
ALTER TABLE public.platform_legal_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public legal disclosures" ON public.platform_legal_settings FOR SELECT TO anon, authenticated USING (true);
CREATE FUNCTION public.operator_save_legal_settings(_details jsonb, _reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old jsonb;
BEGIN
 IF NOT private.is_platform_operator() THEN RAISE EXCEPTION 'Nur für den autorisierten Betreiber.'; END IF;
 IF length(btrim(coalesce(_reason,''))) < 3 THEN RAISE EXCEPTION 'Änderungsgrund erforderlich.'; END IF;
 IF jsonb_typeof(_details) IS DISTINCT FROM 'object' OR octet_length(_details::text)>100000 THEN RAISE EXCEPTION 'Ungültige Unternehmensangaben.'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_each(_details) WHERE jsonb_typeof(value)<>'string' OR length(value #>> '{}')>10000) THEN RAISE EXCEPTION 'Nur Textangaben bis 10000 Zeichen erlaubt.'; END IF;
 PERFORM pg_advisory_xact_lock(721840);
 SELECT details INTO old FROM platform_legal_settings WHERE id=true;
 INSERT INTO platform_legal_settings(id,details,updated_at) VALUES(true,_details,now()) ON CONFLICT(id) DO UPDATE SET details=excluded.details, updated_at=excluded.updated_at;
 INSERT INTO subscription_audit(administrator,reason,before_value,after_value) VALUES(auth.uid(),'Rechtliches: '||_reason,old,_details);
END $$;
REVOKE ALL ON FUNCTION public.operator_save_legal_settings(jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.operator_save_legal_settings(jsonb,text) TO authenticated;