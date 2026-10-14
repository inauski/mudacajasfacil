import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Item = { id: string; name: string; quantity: number; unpacked: boolean; origin?: string };

export function ItemsList({ items, onChange }: { items: Item[]; onChange: () => Promise<unknown> }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [origin, setOrigin] = useState("");
  const sorted = [...items].sort((a, b) => Number(a.unpacked) - Number(b.unpacked) || a.name.localeCompare(b.name, "es"));

  async function update(id: string, patch: Partial<Item>) {
    const { error } = await supabase.from("items").update(patch).eq("id", id);
    if (error) toast.error("No se pudo guardar");
    await onChange();
  }
  async function remove(it: Item) {
    if (!confirm(`¿Borrar «${it.name}»?`)) return;
    const { error } = await supabase.from("items").delete().eq("id", it.id);
    if (error) toast.error("No se pudo borrar");
    await onChange();
  }

  if (!items.length) return <p className="mb-6 rounded-lg border-2 border-dashed border-foreground/30 p-4 text-center text-muted-foreground">Aún no hay objetos en esta caja.</p>;

  return (
    <ul className="mb-6 divide-y divide-foreground/15 rounded-xl border-2 border-foreground bg-card">
      {sorted.map((it) => editId === it.id ? (
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
      ) : (
        <li key={it.id} className="flex items-center gap-3 p-2 pl-3">
          <input type="checkbox" checked={it.unpacked} onChange={(e) => update(it.id, { unpacked: e.target.checked })}
            aria-label="Desembalado" className="h-7 w-7 shrink-0 accent-[var(--primary)]" />
          <div className="min-w-0 flex-1">
            <span className={`block text-base ${it.unpacked ? "text-muted-foreground line-through" : ""}`}>{it.name}</span>
            {it.origin && <span className="block text-sm text-muted-foreground">Estaba en: {it.origin}</span>}
          </div>
          <span className="font-semibold text-muted-foreground">×{it.quantity}</span>
          <button aria-label="Editar" onClick={() => { setEditId(it.id); setName(it.name); setQty(it.quantity); setOrigin(it.origin ?? ""); }} className="flex h-11 w-11 items-center justify-center"><Pencil className="h-5 w-5" /></button>
          <button aria-label="Borrar" onClick={() => remove(it)} className="flex h-11 w-11 items-center justify-center text-destructive"><Trash2 className="h-5 w-5" /></button>
        </li>
      ))}
    </ul>
  );
}
