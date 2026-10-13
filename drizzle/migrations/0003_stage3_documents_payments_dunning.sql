
-- ===== Dokumente (Angebote, Rechnungen, Stornorechnungen) =====
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('quote','invoice','cancellation')),
  number text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','accepted','rejected','cancelled')),
  customer_id uuid REFERENCES public.customers(id),
  customer_snapshot jsonb,
  company_snapshot jsonb,
  doc_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  service_date date,
  service_period_end date,
  payment_days integer CHECK (payment_days IS NULL OR payment_days BETWEEN 0 AND 365),
  due_date date,
  intro text,
  terms text,
  small_business boolean NOT NULL DEFAULT false,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_total numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  source_quote_id uuid UNIQUE REFERENCES public.documents(id),
  cancels_document_id uuid UNIQUE REFERENCES public.documents(id),
  issued_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documents_number_unique UNIQUE (organization_id, kind, number),
  CONSTRAINT documents_issued_has_number CHECK (status = 'draft' OR number IS NOT NULL)
);
CREATE INDEX documents_org_kind_idx ON public.documents(organization_id, kind, doc_date DESC);

CREATE TABLE public.document_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  description text NOT NULL CHECK (length(btrim(description)) > 0),
  quantity numeric(12,3) NOT NULL DEFAULT 1,
  unit text,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 19 CHECK (tax_rate IN (0,7,19)),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX document_items_doc_idx ON public.document_items(document_id, position);

-- ===== Nummernkreise =====
CREATE TABLE public.number_sequences (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('quote','invoice')),
  year integer NOT NULL,
  last_value integer NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, kind, year)
);

-- ===== Zahlungen =====
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.documents(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  method text,
  note text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_invoice_idx ON public.payments(invoice_id);

ALTER TABLE public.transactions ADD COLUMN payment_id uuid UNIQUE REFERENCES public.payments(id) ON DELETE CASCADE;

-- ===== Mahnwesen =====
CREATE TABLE public.dunning_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.documents(id),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 3),
  open_amount numeric(12,2) NOT NULL,
  notice_date date NOT NULL DEFAULT CURRENT_DATE,
  new_due_date date NOT NULL,
  sent_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, level)
);

-- ===== Grants =====
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_items TO authenticated;
GRANT SELECT ON public.number_sequences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dunning_notices TO authenticated;
GRANT ALL ON public.documents, public.document_items, public.number_sequences, public.payments, public.dunning_notices TO service_role;

-- ===== Hilfsfunktionen =====
CREATE OR REPLACE FUNCTION private.invoice_paid(_invoice uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum(amount),0) FROM public.payments WHERE invoice_id = _invoice;
$$;
REVOKE ALL ON FUNCTION private.invoice_paid(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.invoice_paid(uuid) TO authenticated;

-- Gleiche-Organisation-Prüfung für Dokumente und Anhänge
CREATE OR REPLACE FUNCTION private.check_doc_links()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o uuid;
BEGIN
  IF TG_TABLE_NAME = 'documents' THEN
    IF NEW.customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM customers WHERE id = NEW.customer_id AND organization_id = NEW.organization_id) THEN
      RAISE EXCEPTION 'Kunde gehört nicht zu diesem Unternehmen.'; END IF;
    FOREACH _o IN ARRAY ARRAY[NEW.source_quote_id, NEW.cancels_document_id] LOOP
      IF _o IS NOT NULL AND NOT EXISTS (SELECT 1 FROM documents WHERE id = _o AND organization_id = NEW.organization_id) THEN
        RAISE EXCEPTION 'Verknüpftes Dokument gehört nicht zu diesem Unternehmen.'; END IF;
    END LOOP;
  ELSE
    SELECT organization_id INTO _o FROM documents WHERE id = (CASE TG_TABLE_NAME WHEN 'document_items' THEN NEW.document_id ELSE NEW.invoice_id END);
    IF _o IS NULL OR _o <> NEW.organization_id THEN
      RAISE EXCEPTION 'Dokument gehört nicht zu diesem Unternehmen.'; END IF;
  END IF;
  RETURN NEW;
END $$;

-- Integrität: ausgegebene Dokumente sind inhaltlich unveränderlich
CREATE OR REPLACE FUNCTION private.protect_documents()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'Ausgegebene Dokumente können nicht gelöscht werden.'; END IF;
    RETURN OLD;
  END IF;
  IF NEW.organization_id <> OLD.organization_id OR NEW.kind <> OLD.kind THEN
    RAISE EXCEPTION 'Unternehmen und Dokumentart sind unveränderlich.'; END IF;
  IF OLD.status = 'draft' THEN
    IF NEW.status <> 'draft' AND current_setting('keshja.issuing', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'Dokumente werden nur über „Ausgeben“ festgeschrieben.'; END IF;
    IF NEW.status = 'draft' AND NEW.number IS NOT NULL THEN
      RAISE EXCEPTION 'Entwürfe erhalten keine Nummer.'; END IF;
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - ARRAY['status','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','updated_at']) THEN
    RAISE EXCEPTION 'Ausgegebene Dokumente dürfen nicht verändert werden. Bitte Storno bzw. Korrektur verwenden.'; END IF;
  IF NEW.status <> OLD.status THEN
    IF OLD.kind = 'quote' AND OLD.status = 'issued' AND NEW.status IN ('accepted','rejected') THEN NULL;
    ELSIF OLD.kind = 'quote' AND OLD.status IN ('accepted','rejected') AND NEW.status = 'issued'
          AND NOT EXISTS (SELECT 1 FROM documents WHERE source_quote_id = OLD.id) THEN NULL;
    ELSIF OLD.kind = 'invoice' AND OLD.status = 'issued' AND NEW.status = 'cancelled'
          AND EXISTS (SELECT 1 FROM documents WHERE cancels_document_id = OLD.id) THEN NULL;
    ELSE RAISE EXCEPTION 'Dieser Statuswechsel ist nicht zulässig.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION private.protect_document_items()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _st text;
BEGIN
  SELECT status INTO _st FROM documents WHERE id = coalesce(NEW.document_id, OLD.document_id);
  IF _st IS NULL THEN RETURN coalesce(NEW, OLD); END IF; -- Dokument wird gerade gelöscht
  IF _st <> 'draft' AND current_setting('keshja.issuing', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Positionen ausgegebener Dokumente sind unveränderlich.'; END IF;
  IF TG_OP = 'UPDATE' AND NEW.document_id <> OLD.document_id THEN
    RAISE EXCEPTION 'Positionen können nicht verschoben werden.'; END IF;
  RETURN coalesce(NEW, OLD);
END $$;

-- Zahlungen: nur auf ausgegebene Rechnungen; Finanzbuchung synchron halten
CREATE OR REPLACE FUNCTION private.payment_before()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE d record;
BEGIN
  SELECT kind, status INTO d FROM documents WHERE id = NEW.invoice_id;
  IF d.kind IS DISTINCT FROM 'invoice' OR d.status <> 'issued' THEN
    RAISE EXCEPTION 'Zahlungen können nur zu ausgegebenen, nicht stornierten Rechnungen erfasst werden.'; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.invoice_id <> OLD.invoice_id OR NEW.organization_id <> OLD.organization_id) THEN
    RAISE EXCEPTION 'Die Rechnung einer Zahlung kann nicht geändert werden.'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION private.payment_after()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE d record;
BEGIN
  SELECT number, customer_id INTO d FROM documents WHERE id = NEW.invoice_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO transactions(organization_id, type, amount, booking_date, category, description, status, customer_id, payment_id, created_by)
    VALUES (NEW.organization_id, 'income', NEW.amount, NEW.payment_date, 'Umsatzerlöse',
            'Zahlungseingang Rechnung ' || d.number, 'bezahlt', d.customer_id, NEW.id, auth.uid());
  ELSE
    UPDATE transactions SET amount = NEW.amount, booking_date = NEW.payment_date
     WHERE payment_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

-- Gekoppelte Finanzbuchungen nur über die Zahlung ändern/löschen
CREATE OR REPLACE FUNCTION private.protect_payment_transactions()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN coalesce(NEW, OLD); END IF;
  IF TG_OP = 'DELETE' AND OLD.payment_id IS NOT NULL THEN
    RAISE EXCEPTION 'Diese Einnahme gehört zu einer Rechnungszahlung. Bitte die Zahlung bei der Rechnung korrigieren.'; END IF;
  IF TG_OP = 'UPDATE' AND (OLD.payment_id IS NOT NULL OR NEW.payment_id IS NOT NULL)
     AND (NEW.payment_id IS DISTINCT FROM OLD.payment_id OR NEW.amount <> OLD.amount
          OR NEW.booking_date <> OLD.booking_date OR NEW.type <> OLD.type OR NEW.status <> OLD.status) THEN
    RAISE EXCEPTION 'Diese Einnahme gehört zu einer Rechnungszahlung. Bitte die Zahlung bei der Rechnung korrigieren.'; END IF;
  IF TG_OP = 'INSERT' AND NEW.payment_id IS NOT NULL THEN
    RAISE EXCEPTION 'Zahlungsbuchungen entstehen nur über die Zahlungserfassung.'; END IF;
  RETURN coalesce(NEW, OLD);
END $$;

-- Mahnungen nur für überfällige, offene Rechnungen
CREATE OR REPLACE FUNCTION private.dunning_before()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE d record; _open numeric;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'sent_at') IS DISTINCT FROM (to_jsonb(OLD) - 'sent_at') THEN
      RAISE EXCEPTION 'Mahnungen sind unveränderlich; nur der Versandstatus kann gesetzt werden.'; END IF;
    RETURN NEW;
  END IF;
  SELECT kind, status, due_date, total INTO d FROM documents WHERE id = NEW.invoice_id;
  IF d.kind IS DISTINCT FROM 'invoice' OR d.status <> 'issued' THEN
    RAISE EXCEPTION 'Mahnungen sind nur für ausgegebene Rechnungen möglich.'; END IF;
  IF d.due_date IS NULL OR d.due_date >= current_date THEN
    RAISE EXCEPTION 'Die Rechnung ist noch nicht überfällig.'; END IF;
  _open := d.total - private.invoice_paid(NEW.invoice_id);
  IF _open <= 0 THEN RAISE EXCEPTION 'Die Rechnung ist bereits vollständig bezahlt.'; END IF;
  IF NEW.level > 1 AND NOT EXISTS (SELECT 1 FROM dunning_notices WHERE invoice_id = NEW.invoice_id AND level = NEW.level - 1) THEN
    RAISE EXCEPTION 'Bitte zuerst die vorherige Mahnstufe erstellen.'; END IF;
  NEW.open_amount := _open;
  NEW.notice_date := current_date;
  IF NEW.new_due_date <= current_date THEN RAISE EXCEPTION 'Die neue Zahlungsfrist muss in der Zukunft liegen.'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER documents_same_org BEFORE INSERT OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION private.check_doc_links();
CREATE TRIGGER document_items_same_org BEFORE INSERT OR UPDATE ON public.document_items FOR EACH ROW EXECUTE FUNCTION private.check_doc_links();
CREATE TRIGGER payments_same_org BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION private.check_doc_links();
CREATE TRIGGER dunning_same_org BEFORE INSERT ON public.dunning_notices FOR EACH ROW EXECUTE FUNCTION private.check_doc_links();
CREATE TRIGGER documents_protect BEFORE UPDATE OR DELETE ON public.documents FOR EACH ROW EXECUTE FUNCTION private.protect_documents();
CREATE TRIGGER document_items_protect BEFORE INSERT OR UPDATE OR DELETE ON public.document_items FOR EACH ROW EXECUTE FUNCTION private.protect_document_items();
CREATE TRIGGER payments_before BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION private.payment_before();
CREATE TRIGGER payments_after AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION private.payment_after();
CREATE TRIGGER transactions_protect_payment BEFORE INSERT OR UPDATE OR DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION private.protect_payment_transactions();
CREATE TRIGGER dunning_before BEFORE INSERT OR UPDATE ON public.dunning_notices FOR EACH ROW EXECUTE FUNCTION private.dunning_before();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== RLS =====
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.number_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dunning_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dokumente lesen" ON public.documents FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY "Dokumente anlegen" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(organization_id) AND created_by = auth.uid() AND status = 'draft' AND number IS NULL);
CREATE POLICY "Dokumente aendern" ON public.documents FOR UPDATE TO authenticated
  USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY "Entwuerfe loeschen" ON public.documents FOR DELETE TO authenticated
  USING (private.is_org_member(organization_id) AND status = 'draft');

CREATE POLICY "Positionen lesen" ON public.document_items FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY "Positionen anlegen" ON public.document_items FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY "Positionen aendern" ON public.document_items FOR UPDATE TO authenticated
  USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY "Positionen loeschen" ON public.document_items FOR DELETE TO authenticated USING (private.is_org_member(organization_id));

CREATE POLICY "Nummernkreise lesen" ON public.number_sequences FOR SELECT TO authenticated USING (private.is_org_member(organization_id));

CREATE POLICY "Zahlungen lesen" ON public.payments FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY "Zahlungen anlegen" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(organization_id) AND created_by = auth.uid());
CREATE POLICY "Zahlungen aendern" ON public.payments FOR UPDATE TO authenticated
  USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY "Zahlungen loeschen" ON public.payments FOR DELETE TO authenticated USING (private.is_org_admin(organization_id));

CREATE POLICY "Mahnungen lesen" ON public.dunning_notices FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY "Mahnungen anlegen" ON public.dunning_notices FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(organization_id) AND created_by = auth.uid());
CREATE POLICY "Mahnungen aendern" ON public.dunning_notices FOR UPDATE TO authenticated
  USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY "Mahnungen loeschen" ON public.dunning_notices FOR DELETE TO authenticated
  USING (private.is_org_admin(organization_id) AND sent_at IS NULL);

-- ===== RPCs =====
CREATE OR REPLACE FUNCTION private.recalc_document(_doc uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _sub numeric := 0; _tax numeric := 0; _sb boolean;
BEGIN
  SELECT small_business INTO _sb FROM documents WHERE id = _doc;
  SELECT coalesce(sum(round(quantity * unit_price, 2)),0) INTO _sub FROM document_items WHERE document_id = _doc;
  IF NOT _sb THEN
    SELECT coalesce(sum(t),0) INTO _tax FROM (
      SELECT round(sum(round(quantity * unit_price, 2)) * tax_rate / 100, 2) AS t
      FROM document_items WHERE document_id = _doc GROUP BY tax_rate) s;
  END IF;
  UPDATE documents SET subtotal = _sub, tax_total = _tax, total = _sub + _tax WHERE id = _doc;
END $$;

CREATE OR REPLACE FUNCTION private.next_number(_org uuid, _kind text, _date date)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _y int := extract(year FROM _date)::int; _seq text := CASE WHEN _kind = 'quote' THEN 'quote' ELSE 'invoice' END; _n int;
BEGIN
  INSERT INTO number_sequences(organization_id, kind, year, last_value) VALUES (_org, _seq, _y, 1)
  ON CONFLICT (organization_id, kind, year) DO UPDATE SET last_value = number_sequences.last_value + 1
  RETURNING last_value INTO _n;
  RETURN (CASE WHEN _seq = 'quote' THEN 'AN' ELSE 'RE' END) || '-' || _y || '-' || lpad(_n::text, 4, '0');
END $$;

CREATE OR REPLACE FUNCTION public.issue_document(_doc uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d documents%ROWTYPE; o organizations%ROWTYPE; c customers%ROWTYPE; _missing text[] := '{}'; _num text;
BEGIN
  SELECT * INTO d FROM documents WHERE id = _doc FOR UPDATE;
  IF d.id IS NULL OR NOT private.is_org_member(d.organization_id) THEN RAISE EXCEPTION 'Dokument nicht gefunden.'; END IF;
  IF d.status <> 'draft' THEN RAISE EXCEPTION 'Das Dokument wurde bereits ausgegeben (%).', d.number; END IF;
  IF d.kind NOT IN ('quote','invoice') THEN RAISE EXCEPTION 'Dieses Dokument kann nicht ausgegeben werden.'; END IF;
  SELECT * INTO o FROM organizations WHERE id = d.organization_id;
  SELECT * INTO c FROM customers WHERE id = d.customer_id;
  IF c.id IS NULL THEN _missing := _missing || 'Kunde'; END IF;
  IF NOT EXISTS (SELECT 1 FROM document_items WHERE document_id = _doc) THEN _missing := _missing || 'mindestens eine Position'; END IF;
  IF coalesce(btrim(o.street),'') = '' OR coalesce(btrim(o.postal_code),'') = '' OR coalesce(btrim(o.city),'') = '' THEN
    _missing := _missing || 'vollständige Unternehmensanschrift'; END IF;
  IF d.kind = 'invoice' THEN
    IF coalesce(btrim(o.tax_number),'') = '' AND coalesce(btrim(o.vat_id),'') = '' THEN
      _missing := _missing || 'Steuernummer oder USt-IdNr. des Unternehmens'; END IF;
    IF c.id IS NOT NULL AND (coalesce(btrim(c.street),'') = '' OR coalesce(btrim(c.city),'') = '') THEN
      _missing := _missing || 'Kundenanschrift'; END IF;
    IF d.service_date IS NULL THEN _missing := _missing || 'Leistungsdatum'; END IF;
    IF d.service_period_end IS NOT NULL AND d.service_period_end < d.service_date THEN
      RAISE EXCEPTION 'Das Ende des Leistungszeitraums liegt vor dem Beginn.'; END IF;
  ELSE
    IF d.valid_until IS NOT NULL AND d.valid_until < d.doc_date THEN
      RAISE EXCEPTION 'Die Gültigkeit endet vor dem Angebotsdatum.'; END IF;
  END IF;
  IF array_length(_missing,1) > 0 THEN
    RAISE EXCEPTION 'Ausgabe nicht möglich. Es fehlt: %', array_to_string(_missing, ', '); END IF;

  PERFORM set_config('keshja.issuing', 'on', true);
  UPDATE documents SET small_business = o.small_business WHERE id = _doc;
  IF o.small_business THEN UPDATE document_items SET tax_rate = 0 WHERE document_id = _doc; END IF;
  PERFORM private.recalc_document(_doc);
  _num := private.next_number(d.organization_id, d.kind, d.doc_date);
  UPDATE documents SET
    status = 'issued', number = _num, issued_at = now(),
    payment_days = CASE WHEN d.kind = 'invoice' THEN coalesce(d.payment_days, o.default_payment_days) END,
    due_date = CASE WHEN d.kind = 'invoice' THEN d.doc_date + coalesce(d.payment_days, o.default_payment_days) END,
    company_snapshot = jsonb_build_object('name',o.name,'legal_form',o.legal_form,'street',o.street,'postal_code',o.postal_code,
      'city',o.city,'country',o.country,'email',o.email,'phone',o.phone,'website',o.website,'tax_number',o.tax_number,
      'vat_id',o.vat_id,'iban',o.iban,'bic',o.bic,'bank_name',o.bank_name,'small_business',o.small_business),
    customer_snapshot = jsonb_build_object('name',c.name,'contact_person',c.contact_person,'street',c.street,
      'postal_code',c.postal_code,'city',c.city,'country',c.country,'customer_number',c.customer_number,'vat_id',c.vat_id)
  WHERE id = _doc;
  PERFORM set_config('keshja.issuing', 'off', true);
  RETURN _num;
END $$;

CREATE OR REPLACE FUNCTION public.create_invoice_from_quote(_quote uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q documents%ROWTYPE; _id uuid;
BEGIN
  SELECT * INTO q FROM documents WHERE id = _quote FOR UPDATE;
  IF q.id IS NULL OR NOT private.is_org_member(q.organization_id) THEN RAISE EXCEPTION 'Angebot nicht gefunden.'; END IF;
  IF q.kind <> 'quote' OR q.status <> 'accepted' THEN RAISE EXCEPTION 'Nur angenommene Angebote können in eine Rechnung umgewandelt werden.'; END IF;
  IF EXISTS (SELECT 1 FROM documents WHERE source_quote_id = _quote) THEN
    RAISE EXCEPTION 'Aus diesem Angebot wurde bereits eine Rechnung erstellt.'; END IF;
  INSERT INTO documents(organization_id, kind, customer_id, doc_date, intro, terms, source_quote_id, created_by)
  VALUES (q.organization_id, 'invoice', q.customer_id, current_date, q.intro, NULL, q.id, auth.uid())
  RETURNING id INTO _id;
  INSERT INTO document_items(document_id, organization_id, position, description, quantity, unit, unit_price, tax_rate)
  SELECT _id, organization_id, position, description, quantity, unit, unit_price, tax_rate FROM document_items WHERE document_id = _quote;
  PERFORM private.recalc_document(_id);
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_invoice(_invoice uuid, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i documents%ROWTYPE; _id uuid; _num text;
BEGIN
  SELECT * INTO i FROM documents WHERE id = _invoice FOR UPDATE;
  IF i.id IS NULL OR NOT private.is_org_member(i.organization_id) THEN RAISE EXCEPTION 'Rechnung nicht gefunden.'; END IF;
  IF NOT private.is_org_admin(i.organization_id) THEN RAISE EXCEPTION 'Nur Inhaber und Admins dürfen Rechnungen stornieren.'; END IF;
  IF i.kind <> 'invoice' OR i.status <> 'issued' THEN RAISE EXCEPTION 'Nur ausgegebene Rechnungen können storniert werden.'; END IF;
  IF EXISTS (SELECT 1 FROM payments WHERE invoice_id = _invoice) THEN
    RAISE EXCEPTION 'Zu dieser Rechnung sind Zahlungen erfasst. Bitte diese zuerst korrigieren oder entfernen.'; END IF;
  _num := private.next_number(i.organization_id, 'invoice', current_date);
  PERFORM set_config('keshja.issuing', 'on', true);
  INSERT INTO documents(organization_id, kind, number, status, customer_id, customer_snapshot, company_snapshot, doc_date,
    service_date, service_period_end, intro, terms, small_business, subtotal, tax_total, total, cancels_document_id, issued_at, created_by)
  VALUES (i.organization_id, 'cancellation', _num, 'issued', i.customer_id, i.customer_snapshot, i.company_snapshot, current_date,
    i.service_date, i.service_period_end, 'Stornorechnung zu Rechnung ' || i.number || ' vom ' || to_char(i.doc_date,'DD.MM.YYYY') || '.',
    nullif(btrim(coalesce(_reason,'')),''), i.small_business, -i.subtotal, -i.tax_total, -i.total, i.id, now(), auth.uid())
  RETURNING id INTO _id;
  INSERT INTO document_items(document_id, organization_id, position, description, quantity, unit, unit_price, tax_rate)
  SELECT _id, organization_id, position, description, -quantity, unit, unit_price, tax_rate FROM document_items WHERE document_id = _invoice;
  UPDATE documents SET status = 'cancelled' WHERE id = _invoice;
  PERFORM set_config('keshja.issuing', 'off', true);
  RETURN _id;
END $$;

-- Entwurfssummen bei Positionsänderung aktualisieren
CREATE OR REPLACE FUNCTION private.items_recalc()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM documents WHERE id = coalesce(NEW.document_id, OLD.document_id) AND status = 'draft') THEN
    PERFORM private.recalc_document(coalesce(NEW.document_id, OLD.document_id));
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER document_items_recalc AFTER INSERT OR UPDATE OR DELETE ON public.document_items FOR EACH ROW EXECUTE FUNCTION private.items_recalc();

REVOKE ALL ON FUNCTION public.issue_document(uuid), public.create_invoice_from_quote(uuid), public.cancel_invoice(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.issue_document(uuid), public.create_invoice_from_quote(uuid), public.cancel_invoice(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION private.recalc_document(uuid), private.next_number(uuid, text, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.recalc_document(uuid) TO authenticated;
