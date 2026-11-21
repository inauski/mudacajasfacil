import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { boxQuery, STATUSES, statusLabel } from "@/lib/boxes";
import { canEditBox, ROLE_LABELS, pageMeta } from "@/lib/sharing";
import { Button } from "@/components/ui/button";
import { BoxForm } from "@/components/BoxForm";
import { QuickAddItems } from "@/components/QuickAddItems";
import { ItemsList } from "@/components/ItemsList";
import { BoxPhotos } from "@/components/BoxPhotos";
import { ShareBox } from "@/components/ShareBox";
import { BoxComments } from "@/components/BoxComments";
import { BoxPrint } from "@/components/BoxPrint";
import { BoxHistory } from "@/components/BoxHistory";

export const Route = createFileRoute("/_authenticated/cajas/$id")({
  head: () => ({ meta: pageMeta("Ficha de caja · Muda Fácil", "Información y contenido de una caja privada o compartida contigo.") }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(boxQuery(params.id)),
  component: BoxDetail,
});

function BoxDetail() {
  const { id } = Route.useParams();
  const { queryClient, user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { data: box } = useSuspenseQuery(boxQuery(id));
  const [editing, setEditing] = useState(false);
  if (!box) return <div className="space-y-4 p-6"><h1 className="font-display text-2xl font-bold">Caja no disponible</h1><p>Esta caja no existe o no tienes acceso. Entra con el correo al que te han dado permiso y confirma tu cuenta.</p><Button asChild variant="outline"><Link to="/cajas">Volver a cajas</Link></Button><Button asChild variant="outline"><Link to="/ajustes">Cambiar de cuenta</Link></Button></div>;
  const editable = canEditBox(box.role);
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["box", id] }),
    queryClient.invalidateQueries({ queryKey: ["boxes"] }),
    queryClient.invalidateQueries({ queryKey: ["inventory"] }),
    queryClient.invalidateQueries({ queryKey: ["box-history", id] }),
  ]);
  async function setStatus(status: string) {
    if (!editable) return;
    const { data, error } = await supabase.from("boxes").update({ status }).eq("id", id).select("id");
    if (error || !data?.length) { toast.error("No se pudo cambiar el estado. Comprueba tu acceso."); return; }
    await refresh();
  }
  async function remove() {
    if (!box || box.role !== "owner" || !confirm(`¿Borrar la caja ${box.code} y su contenido?`)) return;
    const { data, error } = await supabase.from("boxes").delete().eq("id", id).select("id");
    if (error || !data?.length) { toast.error("No se pudo borrar"); return; }
    await refresh(); navigate({ to: "/cajas" });
  }
  return <div className="px-4 pt-4">
    <div className="no-print">
      <Link to="/cajas" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Cajas</Link>
      <div className="box-card mb-4">
        <p className="break-words font-display text-5xl font-extrabold leading-none">{box.code}</p>
        <p className="mt-2 text-lg font-medium">{box.room || "Sin habitación"}</p>
        {box.location && <p className="text-muted-foreground">📍 {box.location}</p>}
        <div className="mt-3 flex flex-wrap gap-2"><span className="stamp">{statusLabel(box.status)}</span>{box.essential && <span className="tag-essential">⭐ Abrir primero</span>}{box.fragile && <span className="tag-fragile">⚠️ Frágil</span>}</div>
        {box.notes && <p className="mt-3 whitespace-pre-wrap text-sm">{box.notes}</p>}
        <p className="mt-3 text-sm font-semibold">{box.role === "owner" ? "Tu caja" : "Compartida contigo"} · {ROLE_LABELS[box.role]}</p>
      </div>
      <div className="mb-5"><ShareBox box={box} role={box.role} /></div>
      {editing && editable ? <BoxForm initial={box} allowCodeEdit={box.role === "owner"} submitLabel="Guardar cambios" onSubmit={async v => {
        const { data, error } = await supabase.from("boxes").update(v).eq("id", id).select("id");
        if (error || !data?.length) { toast.error(error?.code === "23505" ? "Ya tienes otra caja con ese número" : "No se pudo guardar. Comprueba tu acceso."); return; }
        await refresh(); setEditing(false);
      }} /> : <>
        {editable && <>
          <h2 className="field-label">Cambio rápido de estado</h2>
          <div className="mb-5 grid grid-cols-2 gap-2">{STATUSES.map(s => <Button variant="selection" key={s.value} aria-pressed={box.status === s.value} data-selected={box.status === s.value} onClick={() => void setStatus(s.value)} className="h-14 px-2 text-base font-semibold"><Check className={box.status === s.value ? "visible" : "invisible"} aria-hidden="true" />{s.label}</Button>)}</div>
          <Button variant="outline" onClick={() => setEditing(true)} className="mb-6 h-12 w-full">Editar caja</Button>
        </>}
        <h2 className="field-label">Objetos ({box.items.filter(i => !i.unpacked).length} pendientes de {box.items.length})</h2>
        {editable && <QuickAddItems boxId={box.id} userId={box.user_id} onSaved={refresh} />}
        <ItemsList items={box.items} onChange={refresh} boxId={box.id} userId={box.user_id} readOnly={!editable} />
        <BoxPhotos boxId={box.id} userId={box.user_id} photos={box.photos} onChange={refresh} readOnly={!editable} />
        <BoxComments boxId={box.id} userId={user.id} role={box.role} />
        <BoxHistory boxId={box.id} userId={user.id} />
        {box.role === "owner" && <Button variant="ghost" onClick={() => void remove()} className="mb-8 h-12 text-destructive"><Trash2 /> Borrar caja</Button>}
      </>}
    </div>
    <BoxPrint box={box} />
  </div>;
}
