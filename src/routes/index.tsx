import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mudanza en cajas · Organiza tu mudanza" },
      { name: "description", content: "Inventario privado de tu mudanza: cajas numeradas, objetos, fotos y búsqueda." },
      { property: "og:title", content: "Mudanza en cajas" },
      { property: "og:description", content: "Inventario privado de tu mudanza, caja a caja." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/cajas" : "/auth" });
  },
});
