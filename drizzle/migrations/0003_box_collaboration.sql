CREATE TABLE public.box_shares (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 box_id uuid NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 recipient_email text NOT NULL CHECK (recipient_email = lower(btrim(recipient_email))),
 recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('reader','commenter','editor')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(box_id, recipient_email)
);
GRANT SELECT, DELETE ON public.box_shares TO authenticated;
GRANT ALL ON public.box_shares TO service_role;
ALTER TABLE public.box_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY shares_owner_read ON public.box_shares FOR SELECT TO authenticated USING (user_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY shares_owner_revoke ON public.box_shares FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX box_shares_recipient_idx ON public.box_shares(recipient_id, box_id);

CREATE FUNCTION public.box_access(_box_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT CASE WHEN b.user_id = auth.uid() THEN 'owner' ELSE (SELECT s.role FROM public.box_shares s WHERE s.box_id = b.id AND s.recipient_id = auth.uid() LIMIT 1) END FROM public.boxes b WHERE b.id = _box_id
$$;
REVOKE ALL ON FUNCTION public.box_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.box_access(uuid) TO authenticated;

CREATE FUNCTION public.accept_box_invites() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE verified_email text;
BEGIN
 SELECT lower(email) INTO verified_email FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL AND deleted_at IS NULL;
 IF verified_email IS NULL THEN RETURN; END IF;
 UPDATE public.box_shares SET recipient_id = auth.uid() WHERE recipient_id IS NULL AND recipient_email = verified_email;
END $$;
REVOKE ALL ON FUNCTION public.accept_box_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_box_invites() TO authenticated;

CREATE FUNCTION public.set_box_share(_box_id uuid, _email text, _role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; target_email text := lower(btrim(_email));
BEGIN
 SELECT user_id INTO owner_id FROM public.boxes WHERE id = _box_id FOR UPDATE;
 IF auth.uid() IS NULL OR owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
 IF _role NOT IN ('reader','commenter','editor') OR target_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(target_email) > 254 THEN RAISE EXCEPTION 'Invalid invitation'; END IF;
 IF EXISTS (SELECT 1 FROM auth.users WHERE id = owner_id AND lower(email) = target_email) THEN RAISE EXCEPTION 'Cannot invite owner'; END IF;
 INSERT INTO public.box_shares(box_id,user_id,recipient_email,role) VALUES (_box_id,owner_id,target_email,_role)
 ON CONFLICT (box_id,recipient_email) DO UPDATE SET role = EXCLUDED.role;
END $$;
REVOKE ALL ON FUNCTION public.set_box_share(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_box_share(uuid,text,text) TO authenticated;

CREATE TABLE public.box_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), box_id uuid NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
 user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.box_comments TO authenticated;
GRANT ALL ON public.box_comments TO service_role;
ALTER TABLE public.box_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_read ON public.box_comments FOR SELECT TO authenticated USING (public.box_access(box_id) IS NOT NULL);
CREATE POLICY comments_add ON public.box_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.box_access(box_id) IN ('owner','editor','commenter'));
CREATE POLICY comments_delete ON public.box_comments FOR DELETE TO authenticated USING (public.box_access(box_id) = 'owner' OR (user_id = auth.uid() AND public.box_access(box_id) IN ('editor','commenter')));
CREATE INDEX box_comments_box_idx ON public.box_comments(box_id,created_at);

DROP POLICY "boxes select own" ON public.boxes;
DROP POLICY "boxes update own" ON public.boxes;
CREATE POLICY boxes_read_access ON public.boxes FOR SELECT TO authenticated USING (public.box_access(id) IS NOT NULL);
CREATE POLICY boxes_edit_access ON public.boxes FOR UPDATE TO authenticated USING (public.box_access(id) IN ('owner','editor')) WITH CHECK (public.box_access(id) IN ('owner','editor'));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE p text;
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.number IS DISTINCT FROM OLD.number THEN RAISE EXCEPTION 'Immutable box identity' USING ERRCODE = '42501'; END IF;
 IF auth.uid() IS DISTINCT FROM OLD.user_id AND (NEW.code IS DISTINCT FROM OLD.code OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN RAISE EXCEPTION 'Owner only' USING ERRCODE = '42501'; END IF;
 FOREACH p IN ARRAY NEW.photos LOOP
 IF p NOT LIKE OLD.user_id::text || '/' || OLD.id::text || '/%' THEN RAISE EXCEPTION 'Invalid photo path' USING ERRCODE = '42501'; END IF;
 END LOOP;
 NEW.updated_at := now(); NEW.code := upper(btrim(coalesce(NEW.code,'')));
 IF NEW.code = '' THEN NEW.code := OLD.code; END IF;
 RETURN NEW;
END $$;

DROP POLICY "items select own" ON public.items;
DROP POLICY "items insert own" ON public.items;
DROP POLICY "items update own" ON public.items;
DROP POLICY "items delete own" ON public.items;
CREATE POLICY items_read_access ON public.items FOR SELECT TO authenticated USING (public.box_access(box_id) IS NOT NULL);
CREATE POLICY items_add_access ON public.items FOR INSERT TO authenticated WITH CHECK (public.box_access(box_id) IN ('owner','editor') AND user_id = (SELECT b.user_id FROM public.boxes b WHERE b.id = box_id));
CREATE POLICY items_edit_access ON public.items FOR UPDATE TO authenticated USING (public.box_access(box_id) IN ('owner','editor')) WITH CHECK (public.box_access(box_id) IN ('owner','editor'));
CREATE POLICY items_delete_access ON public.items FOR DELETE TO authenticated USING (public.box_access(box_id) IN ('owner','editor'));
CREATE FUNCTION public.guard_box_item() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid;
BEGIN
 IF TG_OP = 'UPDATE' AND (NEW.box_id IS DISTINCT FROM OLD.box_id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN RAISE EXCEPTION 'Immutable item identity' USING ERRCODE = '42501'; END IF;
 SELECT user_id INTO owner_id FROM public.boxes WHERE id = NEW.box_id;
 NEW.user_id := owner_id;
 IF NEW.photo IS NOT NULL AND NEW.photo NOT LIKE owner_id::text || '/' || NEW.box_id::text || '/%' THEN RAISE EXCEPTION 'Invalid photo path' USING ERRCODE = '42501'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_box_item() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER items_guard BEFORE INSERT OR UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.guard_box_item();

CREATE FUNCTION public.box_photo_access(_path text, _write boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.boxes b WHERE b.user_id::text = split_part(_path,'/',1) AND b.id::text = split_part(_path,'/',2)
 AND CASE WHEN _write THEN public.box_access(b.id) IN ('owner','editor') ELSE public.box_access(b.id) IS NOT NULL AND (_path = ANY(b.photos) OR EXISTS (SELECT 1 FROM public.items i WHERE i.box_id = b.id AND i.photo = _path)) END)
$$;
REVOKE ALL ON FUNCTION public.box_photo_access(text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.box_photo_access(text,boolean) TO authenticated;
DROP POLICY IF EXISTS "photos select own" ON storage.objects;
DROP POLICY IF EXISTS "photos insert own" ON storage.objects;
DROP POLICY IF EXISTS "photos update own" ON storage.objects;
DROP POLICY IF EXISTS "photos delete own" ON storage.objects;
CREATE POLICY photos_read_access ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'box-photos' AND (split_part(name,'/',1) = auth.uid()::text OR public.box_photo_access(name,false)));
CREATE POLICY photos_add_access ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'box-photos' AND public.box_photo_access(name,true));
CREATE POLICY photos_delete_access ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'box-photos' AND (split_part(name,'/',1) = auth.uid()::text OR (public.box_photo_access(name,true) AND (public.box_photo_access(name,false) OR owner_id = auth.uid()::text))));