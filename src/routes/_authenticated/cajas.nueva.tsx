import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BoxForm } from "@/components/BoxForm";

export const Route = createFileRoute("/_authenticated/cajas/nueva")({
  head: () => ({
    meta: [
      { title: "Nueva caja · Mudanza" },
      { name: "description", content: "Crea una nueva caja con su código correlativo." },
    ],
  }),
  component: NewBox,
});

function NewBox() {
  const navigate = useNavigate();
  const { queryClient, user } = Route.useRouteContext();
  return (
    <div className="px-4 pt-6">
      <h1 className="mb-1 font-display text-4xl font-extrabold">Nueva caja</h1>
      <p className="mb-6 text-muted-foreground">El código (C-001, C-002…) se asigna solo.</p>
      <BoxForm
        submitLabel="Crear caja"
        onSubmit={async (v) => {
          const { data, error } = await supabase.from("boxes").insert({ ...v, user_id: user.id }).select().single();
          if (error) { toast.error("No se pudo crear la caja"); return; }
          await queryClient.invalidateQueries({ queryKey: ["boxes"] });
          toast.success(`Caja ${data.code} creada`);
          navigate({ to: "/cajas/$id", params: { id: data.id } });
        }}
      />
    </div>
  );
}
