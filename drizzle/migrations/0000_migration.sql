CREATE TABLE public.box_counters (
  user_id uuid PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.box_counters TO authenticated;
GRANT ALL ON public.box_counters TO service_role;
ALTER TABLE public.box_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own counter select" ON public.box_counters FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  number integer NOT NULL DEFAULT 0,
  code text NOT NULL DEFAULT '',
  room text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'vacia' CHECK (status IN ('vacia','llena','cerrada','transportada','desembalada')),
  location text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  essential boolean NOT NULL DEFAULT false,
  fragile boolean NOT NULL DEFAULT false,
  photos text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boxes TO authenticated;
GRANT ALL ON public.boxes TO service_role;
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boxes select own" ON public.boxes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "boxes insert own" ON public.boxes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "boxes update own" ON public.boxes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "boxes delete own" ON public.boxes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  box_id uuid NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  tags text[] NOT NULL DEFAULT '{}',
  photo text,
  unpacked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX items_box_idx ON public.items(box_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items select own" ON public.items FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "items insert own" ON public.items FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.boxes b WHERE b.id = box_id AND b.user_id = auth.uid()));
CREATE POLICY "items update own" ON public.items FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.boxes b WHERE b.id = box_id AND b.user_id = auth.uid()));
CREATE POLICY "items delete own" ON public.items FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.assign_box_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  NEW.user_id := auth.uid();
  IF NEW.user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.box_counters(user_id, last_number) VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET last_number = box_counters.last_number + 1
  RETURNING last_number INTO n;
  NEW.number := n;
  NEW.code := 'C-' || lpad(n::text, 3, '0');
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.assign_box_code() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER boxes_assign_code BEFORE INSERT ON public.boxes FOR EACH ROW EXECUTE FUNCTION public.assign_box_code();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); NEW.number := OLD.number; NEW.code := OLD.code; NEW.user_id := OLD.user_id; RETURN NEW; END $$;
CREATE TRIGGER boxes_touch BEFORE UPDATE ON public.boxes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "photos select own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'box-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "photos insert own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'box-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "photos update own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'box-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "photos delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'box-photos' AND (storage.foldername(name))[1] = auth.uid()::text);