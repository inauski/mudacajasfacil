CREATE FUNCTION public.guard_new_box_photos() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE p text;
BEGIN
 FOREACH p IN ARRAY NEW.photos LOOP
  IF p NOT LIKE NEW.user_id::text || '/' || NEW.id::text || '/%' THEN RAISE EXCEPTION 'Invalid photo path' USING ERRCODE = '42501'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_new_box_photos() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER boxes_z_guard_photos BEFORE INSERT ON public.boxes FOR EACH ROW EXECUTE FUNCTION public.guard_new_box_photos();