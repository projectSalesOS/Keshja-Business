ALTER TABLE public.receipts ADD COLUMN net_total numeric, ADD COLUMN vat_total numeric, ADD COLUMN vat_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.receipts ADD CONSTRAINT receipt_vat_totals CHECK ((net_total IS NULL AND vat_total IS NULL) OR (net_total IS NOT NULL AND vat_total IS NOT NULL AND abs(net_total + vat_total - total) <= 0.03));
CREATE OR REPLACE FUNCTION public.validate_receipt_vat() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r jsonb; n numeric := 0; t numeric := 0; g numeric := 0;
BEGIN
 IF jsonb_typeof(NEW.vat_breakdown) <> 'array' OR jsonb_array_length(NEW.vat_breakdown) > 20 THEN RAISE EXCEPTION 'Ungültige Umsatzsteueraufteilung'; END IF;
 IF jsonb_array_length(NEW.vat_breakdown) = 0 THEN
  IF NEW.net_total IS NOT NULL OR NEW.vat_total IS NOT NULL THEN RAISE EXCEPTION 'Steuersätze fehlen'; END IF;
  RETURN NEW;
 END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(NEW.vat_breakdown) LOOP
  IF jsonb_typeof(r->'rate') IS DISTINCT FROM 'number' OR jsonb_typeof(r->'net') IS DISTINCT FROM 'number' OR jsonb_typeof(r->'tax') IS DISTINCT FROM 'number' OR jsonb_typeof(r->'gross') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Umsatzsteuerwerte fehlen'; END IF;
  IF (r->>'rate')::numeric < 0 OR (r->>'rate')::numeric > 100 OR abs((r->>'net')::numeric + (r->>'tax')::numeric - (r->>'gross')::numeric) > 0.03 OR abs((r->>'net')::numeric * (r->>'rate')::numeric / 100 - (r->>'tax')::numeric) > 0.03 THEN RAISE EXCEPTION 'Umsatzsteuerwerte stimmen nicht überein'; END IF;
  n := n + (r->>'net')::numeric; t := t + (r->>'tax')::numeric; g := g + (r->>'gross')::numeric;
 END LOOP;
 IF NEW.net_total IS NULL OR NEW.vat_total IS NULL OR abs(n-NEW.net_total)>0.03 OR abs(t-NEW.vat_total)>0.03 OR abs(g-NEW.total)>0.03 THEN RAISE EXCEPTION 'Netto, Steuer und Brutto stimmen nicht mit dem Zahlbetrag überein'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_receipt_vat() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validate_receipt_vat BEFORE INSERT OR UPDATE ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.validate_receipt_vat();