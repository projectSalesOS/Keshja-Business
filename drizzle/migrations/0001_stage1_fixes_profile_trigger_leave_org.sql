-- 1) Profil-Trigger auf auth.users (handle_new_user nutzt ON CONFLICT DO NOTHING)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Backfill: fehlende Profile bestehender Konten anlegen, vorhandene nicht anfassen
INSERT INTO public.profiles (id, display_name)
SELECT u.id, COALESCE(NULLIF(u.raw_user_meta_data->>'display_name',''), NULLIF(u.raw_user_meta_data->>'full_name',''), NULLIF(u.raw_user_meta_data->>'name',''), split_part(COALESCE(u.email,''),'@',1))
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- create/join: Profil per UPSERT, nur active_organization_id setzen
CREATE OR REPLACE FUNCTION public.create_organization(_name text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Nicht angemeldet'; END IF;
  IF coalesce(btrim(_name),'') = '' THEN RAISE EXCEPTION 'Bitte einen Unternehmensnamen angeben.'; END IF;
  INSERT INTO public.organizations(name, created_by) VALUES (btrim(_name), auth.uid()) RETURNING id INTO _id;
  INSERT INTO public.organization_members(organization_id, user_id, role) VALUES (_id, auth.uid(), 'owner');
  INSERT INTO public.profiles(id, active_organization_id) VALUES (auth.uid(), _id)
    ON CONFLICT (id) DO UPDATE SET active_organization_id = EXCLUDED.active_organization_id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.join_organization(_code text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Nicht angemeldet'; END IF;
  SELECT id INTO _id FROM public.organizations WHERE invite_code = upper(btrim(coalesce(_code,'')));
  IF _id IS NULL THEN RAISE EXCEPTION 'Einladungscode ungültig.'; END IF;
  INSERT INTO public.organization_members(organization_id, user_id, role) VALUES (_id, auth.uid(), 'member')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  INSERT INTO public.profiles(id, active_organization_id) VALUES (auth.uid(), _id)
    ON CONFLICT (id) DO UPDATE SET active_organization_id = EXCLUDED.active_organization_id;
  RETURN _id;
END $$;

-- 2) Organisation verlassen
CREATE OR REPLACE FUNCTION public.leave_organization(_org uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _role public.org_role;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Nicht angemeldet'; END IF;
  SELECT role INTO _role FROM public.organization_members WHERE organization_id = _org AND user_id = auth.uid();
  IF _role IS NULL THEN RAISE EXCEPTION 'Du bist kein Mitglied dieses Unternehmens.'; END IF;
  IF _role = 'owner' AND NOT EXISTS (
    SELECT 1 FROM public.organization_members WHERE organization_id = _org AND role = 'owner' AND user_id <> auth.uid()
  ) THEN
    RAISE EXCEPTION 'Als einziger Inhaber kannst du das Unternehmen nicht verlassen.';
  END IF;
  DELETE FROM public.organization_members WHERE organization_id = _org AND user_id = auth.uid();
  UPDATE public.profiles SET active_organization_id = NULL WHERE id = auth.uid() AND active_organization_id = _org;
END $$;
REVOKE EXECUTE ON FUNCTION public.leave_organization(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_organization(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_organization(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_organization(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_organization(text) TO authenticated;