import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "box-photos";

async function listAll(prefix: string): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    for (const f of data) {
      const path = `${prefix}/${f.name}`;
      if (f.id === null) out.push(...(await listAll(path)));
      else out.push(path);
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return out;
}

async function findOrphans(userId: string) {
  const [files, boxes, items] = await Promise.all([
    listAll(userId),
    supabase.from("boxes").select("photos"),
    supabase.from("items").select("photo"),
  ]);
  if (boxes.error) throw boxes.error;
  if (items.error) throw items.error;
  const used = new Set<string>([
    ...boxes.data.flatMap((b) => b.photos ?? []),
    ...items.data.map((i) => i.photo).filter((p): p is string => !!p),
  ]);
  return files.filter((f) => !used.has(f));
}

export function CleanupPhotos({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const [orphans, setOrphans] = useState<string[] | null>(null);

  async function scan() {
    setBusy(true);
    try { setOrphans(await findOrphans(userId)); }
    catch { toast.error("No se pudieron revisar las fotos"); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!orphans?.length) return;
    if (!confirm(`¿Borrar definitivamente ${orphans.length} foto(s)? No se puede deshacer.`)) return;
    setBusy(true);
    try {
      for (let i = 0; i < orphans.length; i += 100) {
        const { error } = await supabase.storage.from(BUCKET).remove(orphans.slice(i, i + 100));
        if (error) throw error;
      }
      toast.success("Fotos borradas");
      setOrphans([]);
    } catch { toast.error("No se pudieron borrar"); }
    finally { setBusy(false); }
  }

  return (
    <div className="box-card">
      <h2 className="mb-2 font-display text-2xl font-extrabold">Fotos sin caja</h2>
      <p className="mb-3 text-muted-foreground">Fotos que siguen guardadas aunque su caja u objeto ya se borró.</p>
      {orphans === null ? (
        <button disabled={busy} onClick={scan} className="btn-secondary w-full">{busy ? "Buscando…" : "Buscar fotos sobrantes"}</button>
      ) : orphans.length === 0 ? (
        <p className="font-semibold">No hay fotos sobrantes. ✅</p>
      ) : (
        <button disabled={busy} onClick={remove} className="btn-primary w-full">
          <Trash2 className="h-5 w-5" /> {busy ? "Borrando…" : `Borrar ${orphans.length} foto(s) definitivamente`}
        </button>
      )}
    </div>
  );
}
