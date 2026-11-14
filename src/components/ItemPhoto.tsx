import { useEffect, useRef, useState } from "react";
import { Camera, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { compress } from "@/components/BoxPhotos";

const BUCKET = "box-photos";

export function ItemPhoto({ itemId, boxId, userId, photo, onChange }: { itemId: string; boxId: string; userId: string; photo: string | null; onChange: () => Promise<unknown> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photo) { setUrl(null); return; }
    supabase.storage.from(BUCKET).createSignedUrl(photo, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [photo]);

  async function upload(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    try {
      const blob = await compress(f);
      const path = `${userId}/${boxId}/item-${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      const { error: e2 } = await supabase.from("items").update({ photo: path }).eq("id", itemId);
      if (e2) throw e2;
      if (photo) await supabase.storage.from(BUCKET).remove([photo]);
      await onChange();
    } catch { toast.error("No se pudo subir la foto"); }
    setBusy(false);
  }

  async function remove() {
    if (!photo || !confirm("¿Borrar la foto de este objeto?")) return;
    await supabase.from("items").update({ photo: null }).eq("id", itemId);
    await supabase.storage.from(BUCKET).remove([photo]);
    setOpen(false);
    await onChange();
  }

  return (
    <>
      {photo ? (
        <button aria-label="Ver foto de cómo estaba" onClick={() => setOpen(true)} className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 border-foreground bg-muted">
          {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        </button>
      ) : (
        <button aria-label="Añadir foto de cómo estaba" disabled={busy} onClick={() => ref.current?.click()}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-foreground/40 ${busy ? "animate-pulse" : ""}`}>
          <Camera className="h-5 w-5" />
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      {open && url && (
        <div className="fixed inset-0 z-50 flex flex-col bg-foreground">
          <div className="flex items-center justify-between p-3 text-background">
            <span className="font-semibold">Cómo estaba</span>
            <div className="flex gap-2">
              <button aria-label="Cambiar foto" onClick={() => ref.current?.click()} className="flex h-12 w-12 items-center justify-center"><Camera /></button>
              <button aria-label="Borrar foto" onClick={remove} className="flex h-12 w-12 items-center justify-center"><Trash2 /></button>
              <button aria-label="Cerrar" onClick={() => setOpen(false)} className="flex h-12 w-12 items-center justify-center"><X className="h-7 w-7" /></button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto">
            <img src={url} alt="Cómo estaba el objeto" className="max-h-full max-w-full object-contain" />
          </div>
        </div>
      )}
    </>
  );
}
