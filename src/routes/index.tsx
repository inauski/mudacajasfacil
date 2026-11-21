import { pageMeta } from "@/lib/sharing";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { DESTINATION_KEY, safeDestination } from "@/lib/sharing";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: pageMeta("Organiza tu mudanza · Muda Fácil", "Cajas, objetos y fotos privados con acceso compartido por invitación.") }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const destination = safeDestination(sessionStorage.getItem(DESTINATION_KEY));
    if (data.session) { sessionStorage.removeItem(DESTINATION_KEY); throw redirect({ to: destination }); }
    throw redirect({ to: "/auth", search: { redirect: destination } });
  },
});
