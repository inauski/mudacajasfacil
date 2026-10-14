CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now(); NEW.number := OLD.number; NEW.user_id := OLD.user_id;
  NEW.code := upper(btrim(coalesce(NEW.code, '')));
  IF NEW.code = '' THEN NEW.code := OLD.code; END IF;
  RETURN NEW;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS boxes_user_code_unique ON public.boxes (user_id, upper(code));