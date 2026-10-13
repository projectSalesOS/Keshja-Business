-- Kunden
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  contact_person text,
  street text,
  postal_code text,
  city text,
  country text NOT NULL DEFAULT 'DE',
  email text,
  phone text,
  customer_number text,
  vat_id text,
  notes text,
  archived_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX customers_org_number_uniq ON public.customers(organization_id, customer_number) WHERE customer_number IS NOT NULL AND customer_number <> '';
CREATE INDEX customers_org_idx ON public.customers(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kunden lesen" ON public.customers FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY "Kunden anlegen" ON public.customers FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id) AND created_by = auth.uid());
CREATE POLICY "Kunden aendern" ON public.customers FOR UPDATE TO authenticated USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY "Kunden loeschen" ON public.customers FOR DELETE TO authenticated USING (private.is_org_admin(organization_id));
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Belege: Unternehmen + Kunde
ALTER TABLE public.receipts ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.receipts ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
CREATE INDEX receipts_org_idx ON public.receipts(organization_id);
COMMENT ON COLUMN public.receipts.household_id IS 'DEPRECATED: private Haushalte entfallen, ersetzt durch organization_id';

CREATE OR REPLACE FUNCTION private.can_access_business_receipt(_org uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN _org IS NOT NULL THEN private.is_org_member(_org) ELSE _user = auth.uid() END
$$;
REVOKE ALL ON FUNCTION private.can_access_business_receipt(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_access_business_receipt(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Belege aendern" ON public.receipts;
DROP POLICY IF EXISTS "Belege anlegen" ON public.receipts;
DROP POLICY IF EXISTS "Belege lesen" ON public.receipts;
DROP POLICY IF EXISTS "Belege loeschen" ON public.receipts;
CREATE POLICY "Belege lesen" ON public.receipts FOR SELECT TO authenticated USING (private.can_access_business_receipt(organization_id, user_id));
CREATE POLICY "Belege anlegen" ON public.receipts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND household_id IS NULL AND organization_id IS NOT NULL AND private.is_org_member(organization_id));
CREATE POLICY "Belege aendern" ON public.receipts FOR UPDATE TO authenticated USING (private.can_access_business_receipt(organization_id, user_id)) WITH CHECK (household_id IS NULL AND organization_id IS NOT NULL AND private.is_org_member(organization_id));
CREATE POLICY "Belege loeschen" ON public.receipts FOR DELETE TO authenticated USING (private.can_access_business_receipt(organization_id, user_id));

DROP POLICY IF EXISTS "Positionen aendern" ON public.receipt_items;
DROP POLICY IF EXISTS "Positionen anlegen" ON public.receipt_items;
DROP POLICY IF EXISTS "Positionen lesen" ON public.receipt_items;
DROP POLICY IF EXISTS "Positionen loeschen" ON public.receipt_items;
CREATE POLICY "Positionen lesen" ON public.receipt_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = receipt_items.receipt_id AND private.can_access_business_receipt(r.organization_id, r.user_id)));
CREATE POLICY "Positionen anlegen" ON public.receipt_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = receipt_items.receipt_id AND private.can_access_business_receipt(r.organization_id, r.user_id)));
CREATE POLICY "Positionen aendern" ON public.receipt_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = receipt_items.receipt_id AND private.can_access_business_receipt(r.organization_id, r.user_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = receipt_items.receipt_id AND private.can_access_business_receipt(r.organization_id, r.user_id)));
CREATE POLICY "Positionen loeschen" ON public.receipt_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = receipt_items.receipt_id AND private.can_access_business_receipt(r.organization_id, r.user_id)));

-- Wiederkehrende Geschäftsausgaben (bisherige Fixkosten)
ALTER TABLE public.fixed_costs ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.fixed_costs ADD COLUMN description text;
ALTER TABLE public.fixed_costs ADD COLUMN start_date date NOT NULL DEFAULT current_date;
ALTER TABLE public.fixed_costs ADD COLUMN end_date date;
ALTER TABLE public.fixed_costs ADD COLUMN active boolean NOT NULL DEFAULT true;
ALTER TABLE public.fixed_costs ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.fixed_costs ADD CONSTRAINT fixed_costs_interval_chk CHECK (interval IN ('monatlich','vierteljährlich','jährlich')) NOT VALID;
ALTER TABLE public.fixed_costs ADD CONSTRAINT fixed_costs_amount_chk CHECK (amount > 0) NOT VALID;
ALTER TABLE public.fixed_costs ADD CONSTRAINT fixed_costs_dates_chk CHECK (end_date IS NULL OR end_date >= start_date);
CREATE INDEX fixed_costs_org_idx ON public.fixed_costs(organization_id);
DROP POLICY IF EXISTS "Eigene Fixkosten verwalten" ON public.fixed_costs;
CREATE POLICY "Wiederkehrende lesen" ON public.fixed_costs FOR SELECT TO authenticated USING (private.can_access_business_receipt(organization_id, user_id));
CREATE POLICY "Wiederkehrende anlegen" ON public.fixed_costs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND organization_id IS NOT NULL AND private.is_org_member(organization_id));
CREATE POLICY "Wiederkehrende aendern" ON public.fixed_costs FOR UPDATE TO authenticated USING (private.can_access_business_receipt(organization_id, user_id)) WITH CHECK (organization_id IS NOT NULL AND private.is_org_member(organization_id));
CREATE POLICY "Wiederkehrende loeschen" ON public.fixed_costs FOR DELETE TO authenticated USING (organization_id IS NOT NULL AND private.is_org_admin(organization_id));

-- Einnahmen & Ausgaben
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income','expense')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  booking_date date NOT NULL DEFAULT current_date,
  category text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'bezahlt' CHECK (status IN ('offen','bezahlt')),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  receipt_id uuid REFERENCES public.receipts(id) ON DELETE SET NULL,
  recurring_expense_id uuid REFERENCES public.fixed_costs(id) ON DELETE SET NULL,
  recurring_period date,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX transactions_receipt_uniq ON public.transactions(receipt_id) WHERE receipt_id IS NOT NULL;
CREATE UNIQUE INDEX transactions_recurring_uniq ON public.transactions(recurring_expense_id, recurring_period) WHERE recurring_expense_id IS NOT NULL;
CREATE INDEX transactions_org_date_idx ON public.transactions(organization_id, booking_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buchungen lesen" ON public.transactions FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY "Buchungen anlegen" ON public.transactions FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id) AND created_by = auth.uid());
CREATE POLICY "Buchungen aendern" ON public.transactions FOR UPDATE TO authenticated USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY "Buchungen loeschen" ON public.transactions FOR DELETE TO authenticated USING (private.is_org_admin(organization_id));
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Verknüpfungen dürfen nur innerhalb desselben Unternehmens bestehen
CREATE OR REPLACE FUNCTION private.check_same_org_links()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.customers c WHERE c.id = NEW.customer_id AND c.organization_id = NEW.organization_id) THEN
    RAISE EXCEPTION 'Kunde gehört nicht zu diesem Unternehmen.';
  END IF;
  IF TG_TABLE_NAME = 'transactions' THEN
    IF NEW.receipt_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.receipts r WHERE r.id = NEW.receipt_id AND r.organization_id = NEW.organization_id) THEN
      RAISE EXCEPTION 'Beleg gehört nicht zu diesem Unternehmen.';
    END IF;
    IF NEW.recurring_expense_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.fixed_costs f WHERE f.id = NEW.recurring_expense_id AND f.organization_id = NEW.organization_id) THEN
      RAISE EXCEPTION 'Wiederkehrende Ausgabe gehört nicht zu diesem Unternehmen.';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER transactions_same_org BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION private.check_same_org_links();
CREATE TRIGGER receipts_same_org BEFORE INSERT OR UPDATE ON public.receipts FOR EACH ROW EXECUTE FUNCTION private.check_same_org_links();

-- Fällige wiederkehrende Ausgaben buchen (manuell ausgelöst, idempotent)
CREATE OR REPLACE FUNCTION public.book_due_recurring_expenses(_org uuid)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  f record; _d date; _step interval; _n int; _count int := 0; _rows int;
BEGIN
  IF NOT private.is_org_member(_org) THEN RAISE EXCEPTION 'Keine Berechtigung.'; END IF;
  FOR f IN SELECT * FROM public.fixed_costs WHERE organization_id = _org AND active LOOP
    _step := CASE f.interval WHEN 'jährlich' THEN interval '1 year' WHEN 'vierteljährlich' THEN interval '3 months' ELSE interval '1 month' END;
    _n := 0;
    LOOP
      _d := (f.start_date + _step * _n)::date;
      EXIT WHEN _d > current_date OR (f.end_date IS NOT NULL AND _d > f.end_date) OR _n >= 240;
      INSERT INTO public.transactions(organization_id, type, amount, booking_date, category, description, status, recurring_expense_id, recurring_period)
      VALUES (_org, 'expense', f.amount, _d, f.category, f.name, 'offen', f.id, _d)
      ON CONFLICT (recurring_expense_id, recurring_period) WHERE recurring_expense_id IS NOT NULL DO NOTHING;
      GET DIAGNOSTICS _rows = ROW_COUNT;
      _count := _count + _rows;
      _n := _n + 1;
    END LOOP;
  END LOOP;
  RETURN _count;
END $$;
REVOKE ALL ON FUNCTION public.book_due_recurring_expenses(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_due_recurring_expenses(uuid) TO authenticated;

-- Private Haushalte stilllegen (Daten bleiben erhalten)
COMMENT ON TABLE public.households IS 'DEPRECATED: private Haushalte entfallen in Keshja Business';
COMMENT ON COLUMN public.profiles.household_id IS 'DEPRECATED: private Haushalte entfallen in Keshja Business';
REVOKE EXECUTE ON FUNCTION public.create_household(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.join_household(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.leave_household() FROM PUBLIC, anon, authenticated;