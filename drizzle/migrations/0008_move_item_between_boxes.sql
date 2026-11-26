CREATE OR REPLACE FUNCTION public.guard_box_item() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid;
BEGIN
 IF TG_OP = 'UPDATE' AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at OR (NEW.box_id IS DISTINCT FROM OLD.box_id AND coalesce(current_setting('app.moving_item', true), '') <> NEW.id::text)) THEN RAISE EXCEPTION 'Immutable item identity' USING ERRCODE = '42501'; END IF;
 SELECT user_id INTO owner_id FROM public.boxes WHERE id = NEW.box_id;
 NEW.user_id := owner_id;
 IF NEW.photo IS NOT NULL AND NEW.photo NOT LIKE owner_id::text || '/' || NEW.box_id::text || '/%' THEN RAISE EXCEPTION 'Invalid photo path' USING ERRCODE = '42501'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.move_item(_item_id uuid, _target_box uuid, _new_photo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE src uuid; src_owner uuid; dst_owner uuid;
BEGIN
 SELECT i.box_id INTO src FROM public.items i WHERE i.id = _item_id;
 IF src IS NULL THEN RAISE EXCEPTION 'Item not found' USING ERRCODE = '42501'; END IF;
 IF src = _target_box THEN RETURN; END IF;
 IF public.box_access(src) NOT IN ('owner','editor') OR public.box_access(_target_box) NOT IN ('owner','editor') THEN RAISE EXCEPTION 'No access' USING ERRCODE = '42501'; END IF;
 SELECT user_id INTO src_owner FROM public.boxes WHERE id = src;
 SELECT user_id INTO dst_owner FROM public.boxes WHERE id = _target_box;
 IF src_owner IS DISTINCT FROM dst_owner THEN RAISE EXCEPTION 'Different owner' USING ERRCODE = '42501'; END IF;
 PERFORM set_config('app.moving_item', _item_id::text, true);
 UPDATE public.items SET box_id = _target_box, photo = _new_photo WHERE id = _item_id;
 PERFORM set_config('app.moving_item', '', true);
END $$;
REVOKE ALL ON FUNCTION public.move_item(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_item(uuid, uuid, text) TO authenticated;