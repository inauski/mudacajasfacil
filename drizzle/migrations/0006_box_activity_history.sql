CREATE TABLE public.box_activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 box_id uuid NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
 actor_id uuid,
 actor_label text NOT NULL,
 action text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT SELECT ON public.box_activity TO authenticated;
GRANT ALL ON public.box_activity TO service_role;
ALTER TABLE public.box_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_read_access ON public.box_activity FOR SELECT TO authenticated USING (public.box_access(box_id) IS NOT NULL);
CREATE INDEX box_activity_timeline_idx ON public.box_activity(box_id, created_at DESC, id DESC);
CREATE FUNCTION public.record_box_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row_data jsonb; previous_data jsonb; target uuid; event text; info jsonb := '{}'::jsonb; label text; changed text[];
BEGIN
 row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_OP = 'UPDATE' THEN previous_data := to_jsonb(OLD); END IF;
 target := CASE WHEN TG_TABLE_NAME = 'boxes' THEN (row_data->>'id')::uuid ELSE (row_data->>'box_id')::uuid END;
 IF NOT EXISTS (SELECT 1 FROM public.boxes WHERE id = target) THEN RETURN NULL; END IF;
 IF TG_TABLE_NAME = 'boxes' THEN
  IF TG_OP = 'INSERT' THEN event := 'box_created'; ELSE
   SELECT array_agg(key ORDER BY key) INTO changed FROM jsonb_each(row_data) WHERE key NOT IN ('updated_at') AND value IS DISTINCT FROM previous_data->key;
   IF changed IS NULL THEN RETURN NULL; END IF;
   event := 'box_updated'; info := jsonb_build_object('fields', changed);
   IF 'status' = ANY(changed) THEN info := info || jsonb_build_object('status', row_data->>'status'); END IF;
  END IF;
 ELSIF TG_TABLE_NAME = 'items' THEN
  IF TG_OP = 'UPDATE' AND row_data = previous_data THEN RETURN NULL; END IF;
  event := CASE TG_OP WHEN 'INSERT' THEN 'item_added' WHEN 'UPDATE' THEN 'item_updated' ELSE 'item_deleted' END;
  info := jsonb_build_object('name', row_data->>'name');
 ELSIF TG_TABLE_NAME = 'box_comments' THEN
  event := CASE TG_OP WHEN 'INSERT' THEN 'comment_added' ELSE 'comment_deleted' END;
 ELSIF TG_TABLE_NAME = 'box_shares' THEN
  IF TG_OP = 'UPDATE' AND row_data->>'role' IS NOT DISTINCT FROM previous_data->>'role' THEN RETURN NULL; END IF;
  event := CASE TG_OP WHEN 'INSERT' THEN 'share_granted' WHEN 'UPDATE' THEN 'share_updated' ELSE 'share_revoked' END;
  info := jsonb_build_object('role', row_data->>'role');
 END IF;
 SELECT email INTO label FROM auth.users WHERE id = auth.uid();
 INSERT INTO public.box_activity(box_id,actor_id,actor_label,action,details) VALUES(target, auth.uid(), coalesce(label,'Sistema'),event,info);
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.record_box_activity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER boxes_activity AFTER INSERT OR UPDATE ON public.boxes FOR EACH ROW EXECUTE FUNCTION public.record_box_activity();
CREATE TRIGGER items_activity AFTER INSERT OR UPDATE OR DELETE ON public.items FOR EACH ROW EXECUTE FUNCTION public.record_box_activity();
CREATE TRIGGER comments_activity AFTER INSERT OR DELETE ON public.box_comments FOR EACH ROW EXECUTE FUNCTION public.record_box_activity();
CREATE TRIGGER shares_activity AFTER INSERT OR UPDATE OR DELETE ON public.box_shares FOR EACH ROW EXECUTE FUNCTION public.record_box_activity();