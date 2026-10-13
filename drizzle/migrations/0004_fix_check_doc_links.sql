
CREATE OR REPLACE FUNCTION private.check_doc_links()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o uuid; _ref uuid;
BEGIN
  IF TG_TABLE_NAME = 'documents' THEN
    IF NEW.customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM customers WHERE id = NEW.customer_id AND organization_id = NEW.organization_id) THEN
      RAISE EXCEPTION 'Kunde gehört nicht zu diesem Unternehmen.'; END IF;
    FOREACH _o IN ARRAY ARRAY[NEW.source_quote_id, NEW.cancels_document_id] LOOP
      IF _o IS NOT NULL AND NOT EXISTS (SELECT 1 FROM documents WHERE id = _o AND organization_id = NEW.organization_id) THEN
        RAISE EXCEPTION 'Verknüpftes Dokument gehört nicht zu diesem Unternehmen.'; END IF;
    END LOOP;
  ELSE
    _ref := coalesce(to_jsonb(NEW)->>'document_id', to_jsonb(NEW)->>'invoice_id')::uuid;
    SELECT organization_id INTO _o FROM documents WHERE id = _ref;
    IF _o IS NULL OR _o <> NEW.organization_id THEN
      RAISE EXCEPTION 'Dokument gehört nicht zu diesem Unternehmen.'; END IF;
  END IF;
  RETURN NEW;
END $$;
