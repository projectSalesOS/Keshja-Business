ALTER TABLE public.tariff_plans
  ADD COLUMN price_cents_monthly integer NOT NULL DEFAULT 0,
  ADD COLUMN price_cents_annual integer NOT NULL DEFAULT 0;

UPDATE public.tariff_plans SET price_cents_monthly = 0, price_cents_annual = 0 WHERE id = 'free';
UPDATE public.tariff_plans SET price_cents_monthly = 1290, price_cents_annual = 11880 WHERE id = 'basic';
UPDATE public.tariff_plans SET price_cents_monthly = 1990, price_cents_annual = 20280 WHERE id = 'premium';

COMMENT ON COLUMN public.tariff_plans.price_cents IS 'DEPRECATED: replaced by price_cents_monthly and price_cents_annual';

ALTER TABLE public.profiles
  ADD COLUMN email text,
  ADD COLUMN operator_notified_at timestamp with time zone;

UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE u.id = p.id;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.operator_set_plan(_plan text, _values jsonb, _reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  old tariff_plans%ROWTYPE;
  fresh tariff_plans%ROWTYPE;
BEGIN
  IF NOT private.is_platform_operator() THEN
    RAISE EXCEPTION 'Nur für den autorisierten Betreiber.';
  END IF;
  IF length(btrim(coalesce(_reason,''))) < 3 THEN
    RAISE EXCEPTION 'Grund erforderlich.';
  END IF;
  SELECT * INTO old FROM tariff_plans WHERE id = _plan FOR UPDATE;
  UPDATE tariff_plans SET
    price_cents_monthly = (_values->>'price_cents_monthly')::integer,
    price_cents_annual = (_values->>'price_cents_annual')::integer,
    price_cents = (_values->>'price_cents_monthly')::integer,
    manual_limit = (_values->>'manual_limit')::integer,
    ocr_limit = (_values->>'ocr_limit')::integer,
    documents = (_values->>'documents')::boolean,
    voice = (_values->>'voice')::boolean,
    logo = (_values->>'logo')::boolean,
    advanced_reports = (_values->>'advanced_reports')::boolean
  WHERE id = _plan
  RETURNING * INTO fresh;
  IF fresh.id IS NULL THEN
    RAISE EXCEPTION 'Tarif nicht gefunden';
  END IF;
  INSERT INTO subscription_audit(administrator, reason, before_value, after_value)
  VALUES(auth.uid(), _reason, to_jsonb(old), to_jsonb(fresh));
END
$function$;