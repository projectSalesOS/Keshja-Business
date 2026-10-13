CREATE TYPE public.org_role AS ENUM ('owner','admin','member');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  legal_form text,
  street text, postal_code text, city text, country text NOT NULL DEFAULT 'DE',
  email text, phone text, website text,
  tax_number text, vat_id text,
  iban text, bic text, bank_name text,
  small_business boolean NOT NULL DEFAULT false,
  default_payment_days integer NOT NULL DEFAULT 14 CHECK (default_payment_days BETWEEN 0 AND 365),
  invite_code text UNIQUE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE INDEX organization_members_user_idx ON public.organization_members(user_id);

ALTER TABLE public.profiles ADD COLUMN active_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Helper (security definer, avoid RLS recursion)
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.is_org_member(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _org AND user_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION private.is_org_admin(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _org AND user_id = auth.uid() AND role IN ('owner','admin'));
$$;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_org_member(uuid), private.is_org_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.set_org_invite_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER set_org_invite_code BEFORE INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION private.set_org_invite_code();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
GRANT SELECT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org lesen" ON public.organizations FOR SELECT TO authenticated USING (private.is_org_member(id) OR created_by = auth.uid());
CREATE POLICY "Org anlegen" ON public.organizations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Org aendern" ON public.organizations FOR UPDATE TO authenticated USING (private.is_org_admin(id)) WITH CHECK (private.is_org_admin(id));

CREATE POLICY "Mitglieder lesen" ON public.organization_members FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY "Mitglieder aendern" ON public.organization_members FOR UPDATE TO authenticated
  USING (private.is_org_admin(organization_id) AND role <> 'owner') WITH CHECK (private.is_org_admin(organization_id) AND role <> 'owner');
CREATE POLICY "Mitglieder entfernen" ON public.organization_members FOR DELETE TO authenticated
  USING ((private.is_org_admin(organization_id) AND role <> 'owner') OR (user_id = auth.uid() AND role <> 'owner'));

-- Org profiles of colleagues readable
CREATE POLICY "Profile von Kollegen lesen" ON public.profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.organization_members m WHERE m.user_id = profiles.id AND private.is_org_member(m.organization_id)));

-- RPCs
CREATE OR REPLACE FUNCTION public.create_organization(_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Nicht angemeldet'; END IF;
  IF coalesce(btrim(_name),'') = '' THEN RAISE EXCEPTION 'Bitte einen Unternehmensnamen angeben.'; END IF;
  INSERT INTO public.organizations(name, created_by) VALUES (btrim(_name), auth.uid()) RETURNING id INTO _id;
  INSERT INTO public.organization_members(organization_id, user_id, role) VALUES (_id, auth.uid(), 'owner');
  UPDATE public.profiles SET active_organization_id = _id WHERE id = auth.uid();
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.join_organization(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Nicht angemeldet'; END IF;
  SELECT id INTO _id FROM public.organizations WHERE invite_code = upper(btrim(_code));
  IF _id IS NULL THEN RAISE EXCEPTION 'Einladungscode ungültig.'; END IF;
  INSERT INTO public.organization_members(organization_id, user_id, role) VALUES (_id, auth.uid(), 'member')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  UPDATE public.profiles SET active_organization_id = _id WHERE id = auth.uid();
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.regenerate_org_invite_code(_org uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c text := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
BEGIN
  IF NOT private.is_org_admin(_org) THEN RAISE EXCEPTION 'Keine Berechtigung.'; END IF;
  UPDATE public.organizations SET invite_code = _c WHERE id = _org;
  RETURN _c;
END $$;

REVOKE EXECUTE ON FUNCTION public.create_organization(text), public.join_organization(text), public.regenerate_org_invite_code(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_organization(text), public.join_organization(text), public.regenerate_org_invite_code(uuid) TO authenticated;