CREATE FUNCTION public.operator_bootstrap_status() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object(
  'open', NOT EXISTS(SELECT 1 FROM platform_operators),
  'eligible', NOT EXISTS(SELECT 1 FROM platform_operators) AND auth.uid() IS NOT NULL AND auth.uid() = (SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL ORDER BY created_at, id LIMIT 1)
 ) $$;
CREATE FUNCTION public.claim_initial_operator(_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Anmeldung erforderlich.'; END IF;
 IF length(btrim(coalesce(_reason,'')))<3 THEN RAISE EXCEPTION 'Bitte einen Grund angeben.'; END IF;
 LOCK TABLE platform_operators IN EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM platform_operators) THEN RAISE EXCEPTION 'Ersteinrichtung ist abgeschlossen.'; END IF;
 IF auth.uid() IS DISTINCT FROM (SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL ORDER BY created_at, id LIMIT 1) THEN RAISE EXCEPTION 'Nur das erste bestätigte Konto (Projektinhaber) kann die Ersteinrichtung durchführen.'; END IF;
 INSERT INTO platform_operators(user_id) VALUES(auth.uid());
 INSERT INTO subscription_audit(administrator,reason,after_value) VALUES(auth.uid(),'Ersteinrichtung Betreiber: '||_reason,jsonb_build_object('operator_user',auth.uid(),'action','bootstrap'));
END $$;
REVOKE ALL ON FUNCTION public.operator_bootstrap_status(), public.claim_initial_operator(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.operator_bootstrap_status(), public.claim_initial_operator(text) TO authenticated;