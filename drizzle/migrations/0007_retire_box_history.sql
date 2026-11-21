CREATE OR REPLACE FUNCTION public.record_box_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 RETURN NULL;
END $$;
COMMENT ON TABLE public.box_activity IS 'DEPRECATED: box history removed at user request; existing records preserved, new activity recording disabled.';