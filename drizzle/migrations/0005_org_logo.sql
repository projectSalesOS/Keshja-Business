ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_path text;

CREATE POLICY "org members read logos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'org-logos' AND private.is_org_member(((storage.foldername(name))[1])::uuid));
CREATE POLICY "org admins upload logos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'org-logos' AND private.is_org_admin(((storage.foldername(name))[1])::uuid));
CREATE POLICY "org admins update logos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'org-logos' AND private.is_org_admin(((storage.foldername(name))[1])::uuid));
CREATE POLICY "org admins delete logos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'org-logos' AND private.is_org_admin(((storage.foldername(name))[1])::uuid));