import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { boxQuery, STATUSES, statusLabel } from "@/lib/boxes";
import { BoxForm } from "@/components/BoxForm";
import { QuickAddItems } from "@/components/QuickAddItems";
import { ItemsList } from "@/components/ItemsList";
import { BoxPhotos } from "@/components/BoxPhotos";

export const Route = createFileRoute("/_authenticated/cajas/$id")({
  head: () => ({
    meta: [
      { title: "Ficha de caja · Mudanza" },
      { name: "description", content: "Detalle, estado y contenido de la caja." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(boxQuery(params.id)),
  component: BoxDetail,
});

function BoxDetail() {
  const { id } = Route.useParams();
  const { queryClient, user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { data: box } = useSuspenseQuery(boxQuery(id));
  const [editing, setEditing] = useState(false);

  if (!box) return <div className="p-6">Caja no encontrada. <Link to="/cajas" className="underline">Volver</Link></div>;

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["box", id] }),
    queryClient.invalidateQueries({ queryKey: ["boxes"] }),
  ]);

  async function setStatus(status: string) {
    const { error } = await supabase.from("boxes").update({ status }).eq("id", id);
    if (error) { toast.error("No se pudo cambiar el estado"); return; }
    await refresh();
  }

  async function remove() {
    if (!confirm(`¿Borrar la caja ${box!.code} y su contenido?`)) return;
    const { error } = await supabase.from("boxes").delete().eq("id", id);
    if (error) { toast.error("No se pudo borrar"); return; }
    await queryClient.invalidateQueries({ queryKey: ["boxes"] });
    navigate({ to: "/cajas" });
  }

  return (
    <div className="px-4 pt-4">
      <Link to="/cajas" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Cajas</Link>
      <div className="box-card mb-5">
        <p className="font-display text-6xl font-extrabold leading-none">{box.code}</p>
        <p className="mt-2 text-lg font-medium">{box.room || "Sin habitación"}</p>
        {box.location && <p className="text-muted-foreground">📍 {box.location}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="stamp">{statusLabel(box.status)}</span>
          {box.essential && <span className="tag-essential">⭐ Abrir primero</span>}
          {box.fragile && <span className="tag-fragile">⚠️ Frágil</span>}
        </div>
        {box.notes && <p className="mt-3 whitespace-pre-wrap text-sm">{box.notes}</p>}
      </div>

      {editing ? (
        <BoxForm
          initial={box}
          submitLabel="Guardar cambios"
          onSubmit={async (v) => {
            const { error } = await supabase.from("boxes").update(v).eq("id", id);
            if (error) { toast.error(error.code === "23505" ? "Ya tienes otra caja con ese número" : "No se pudo guardar"); return; }
            await refresh();
            setEditing(false);
          }}
        />
      ) : (
        <>
          <h2 className="field-label">Cambio rápido de estado</h2>
          <div className="mb-5 grid grid-cols-2 gap-2">
            {STATUSES.map((s) => (
              <button key={s.value} onClick={() => setStatus(s.value)} className={`chip h-14 ${box.status === s.value ? "chip-active" : ""}`}>{s.label}</button>
            ))}
          </div>
          <button onClick={() => setEditing(true)} className="btn-secondary mb-6 w-full">Editar caja</button>

          <h2 className="field-label">Objetos ({box.items.filter((i) => !i.unpacked).length} pendientes de {box.items.length})</h2>
          <QuickAddItems boxId={box.id} userId={user.id} onSaved={refresh} />
          <ItemsList items={box.items} onChange={refresh} />
          <BoxPhotos boxId={box.id} userId={user.id} photos={box.photos} onChange={refresh} />
          <button onClick={remove} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-destructive"><Trash2 className="h-4 w-4" /> Borrar caja</button>
        </>
      )}
    </div>
  );
}
