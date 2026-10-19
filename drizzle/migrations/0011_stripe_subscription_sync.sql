CREATE TABLE public.stripe_events (
  id text PRIMARY KEY,
  environment text NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_events TO service_role;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tariff_plans ADD COLUMN stripe_price_monthly text;
ALTER TABLE public.tariff_plans ADD COLUMN stripe_price_annual text;
UPDATE public.tariff_plans SET stripe_price_monthly = 'basic_monthly', stripe_price_annual = 'basic_annual' WHERE id = 'basic';
UPDATE public.tariff_plans SET stripe_price_monthly = 'premium_monthly', stripe_price_annual = 'premium_annual' WHERE id = 'premium';

ALTER TABLE public.subscriptions ADD COLUMN billing_interval text;
ALTER TABLE public.subscriptions ADD COLUMN stripe_environment text;