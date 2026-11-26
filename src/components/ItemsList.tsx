import { useState } from "react";
import { Pencil, Trash2, Check, X, ArrowRightLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ItemPhoto } from "@/components/ItemPhoto";

type Item = { id: string; name: string; quantity: number; unpacked: boolean; origin?: string; photo?: string | null };

export function ItemsList({ items, onChange, boxId, userId, readOnly = false }: { items: Item[]; onChange: () => Promise<unknown>; boxId: string; userId: string; readOnly?: boolean }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [origin, setOrigin] = useState("");
  const [moveId, setMoveId] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const [moving, setMoving] = useState(false);
  const { data: targets = [] } = useQuery({
    queryKey: ["move-targets", userId, boxId],
    enabled: !readOnly && moveId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.from("boxes").select("id, code, room").eq("user_id", userId).neq("id", boxId).order("number");
      if (error) throw error;
      return data;
    },
  });
  async function move(it: Item) {
    if (readOnly || !target) return;
    setMoving(true);
    try {
      let newPhoto: string | null = null;
      if (it.photo) {
        const dl = await supabase.storage.from("box-photos").download(it.photo);
        if (dl.error) throw dl.error;
        newPhoto = `${userId}/${target}/item-${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage.from("box-photos").upload(newPhoto, dl.data, { contentType: "image/jpeg" });
        if (up.error) throw up.error;
      }
      const { error } = await supabase.rpc("move_item", { _item_id: it.id, _target_box: target, _new_photo: newPhoto as string });
      if (error) { if (newPhoto) await supabase.storage.from("box-photos").remove([newPhoto]); throw error; }
      if (it.photo) await supabase.storage.from("box-photos").remove([it.photo]);
      const dest = targets.find((t) => t.id === target);
      toast.success(`«${it.name}» movido a ${dest?.code ?? "otra caja"}`);
      setMoveId(null); setTarget("");
      await onChange();
    } catch { toast.error("No se pudo mover el objeto"); }
    setMoving(false);
  }
  const sorted = [...items].sort((a, b) => Number(a.unpacked) - Number(b.unpacked) || a.name.localeCompare(b.name, "es"));

  async function update(id: string, patch: Partial<Item>) {
    if (readOnly) return;
    const { error } = await supabase.from("items").update(patch).eq("id", id);
    if (error) toast.error("No se pudo guardar");
    await onChange();
  }
  async function remove(it: Item) {
    if (readOnly) return;
    if (!confirm(`¿Borrar «${it.name}»?`)) return;
    const { error } = await supabase.from("items").delete().eq("id", it.id);
    if (error) toast.error("No se pudo borrar");
    await onChange();
  }

  if (!items.length) return <p className="mb-6 rounded-lg border-2 border-dashed border-foreground/30 p-4 text-center text-muted-foreground">Aún no hay objetos en esta caja.</p>;

  return (
    <ul className="mb-6 divide-y divide-foreground/15 rounded-xl border-2 border-foreground bg-card">
      {sorted.map((it) => !readOnly && editId === it.id ? (
        <li key={it.id} className="space-y-2 p-2">
          <div className="flex items-center gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className="field h-12 flex-1 text-base" autoFocus aria-label="Nombre" />
            <input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} className="field h-12 w-16 px-2 text-center text-base" aria-label="Cantidad" />
          </div>
          <div className="flex items-center gap-2">
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="¿Dónde estaba?" className="field h-12 flex-1 text-base" aria-label="Dónde estaba" />
            <button aria-label="Guardar" onClick={async () => { await update(it.id, { name: name.trim() || it.name, quantity: qty, origin: origin.trim() }); setEditId(null); }} className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Check /></button>
            <button aria-label="Cancelar" onClick={() => setEditId(null)} className="flex h-12 w-10 items-center justify-center"><X /></button>
          </div>
        </li>
      ) : !readOnly && moveId === it.id ? (
        <li key={it.id} className="space-y-2 p-2">
          <p className="text-base font-semibold">Mover «{it.name}» a:</p>
          <div className="flex items-center gap-2">
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="field h-12 flex-1 text-base" aria-label="Caja de destino">
              <option value="">{targets.length ? "Elige una caja" : "No hay otras cajas"}</option>
              {targets.map((t) => <option key={t.id} value={t.id}>{t.code}{t.room ? ` · ${t.room}` : ""}</option>)}
            </select>
            <button aria-label="Mover" disabled={!target || moving} onClick={() => void move(it)} className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"><Check /></button>
            <button aria-label="Cancelar" onClick={() => { setMoveId(null); setTarget(""); }} className="flex h-12 w-10 items-center justify-center"><X /></button>
          </div>
        </li>
      ) : (
        <li key={it.id} className="flex items-center gap-2 p-2 pl-3">
          <input type="checkbox" disabled={readOnly} checked={it.unpacked} onChange={(e) => update(it.id, { unpacked: e.target.checked })}
            aria-label="Desembalado" className="h-7 w-7 shrink-0 accent-[var(--primary)]" />
          <ItemPhoto itemId={it.id} boxId={boxId} userId={userId} photo={it.photo ?? null} onChange={onChange} readOnly={readOnly} />
          <div className="min-w-0 flex-1">
            <span className={`block text-base ${it.unpacked ? "text-muted-foreground line-through" : ""}`}>{it.name}</span>
            {it.origin && <span className="block text-sm text-muted-foreground">Estaba en: {it.origin}</span>}
          </div>
          <span className="font-semibold text-muted-foreground">×{it.quantity}</span>
          {!readOnly && <>
            <button aria-label="Editar" onClick={() => { setEditId(it.id); setName(it.name); setQty(it.quantity); setOrigin(it.origin ?? ""); }} className="flex h-11 w-11 items-center justify-center"><Pencil className="h-5 w-5" /></button>
            <button aria-label="Mover a otra caja" onClick={() => { setMoveId(it.id); setTarget(""); }} className="flex h-11 w-11 items-center justify-center"><ArrowRightLeft className="h-5 w-5" /></button>
            <button aria-label="Borrar" onClick={() => remove(it)} className="flex h-11 w-11 items-center justify-center text-destructive"><Trash2 className="h-5 w-5" /></button>
          </>}
        </li>
      ))}
    </ul>
  );
}
