import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "box-photos";

async function compress(file: File, max = 1600, quality = 0.8): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("compress"))), "image/jpeg", quality));
}

export function BoxPhotos({ boxId, userId, photos, onChange }: { boxId: string; userId: string; photos: string[]; onChange: () => Promise<unknown> }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const touchX = useRef(0);

  useEffect(() => {
    if (!photos.length) { setUrls({}); return; }
    supabase.storage.from(BUCKET).createSignedUrls(photos, 3600).then(({ data }) => {
      const m: Record<string, string> = {};
      data?.forEach((d) => { if (d.path && d.signedUrl) m[d.path] = d.signedUrl; });
      setUrls(m);
    });
  }, [photos.join("|")]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const added: string[] = [];
    for (const f of Array.from(files)) {
      try {
        const blob = await compress(f);
        const path = `${userId}/${boxId}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        added.push(path);
      } catch { toast.error(`No se pudo subir ${f.name}`); }
    }
    if (added.length) {
      const { error } = await supabase.from("boxes").update({ photos: [...photos, ...added] }).eq("id", boxId);
      if (error) toast.error("No se pudo guardar la foto");
      await onChange();
    }
    setBusy(false);
  }

  async function remove(path: string) {
    if (!confirm("¿Borrar esta foto?")) return;
    await supabase.storage.from(BUCKET).remove([path]);
    await supabase.from("boxes").update({ photos: photos.filter((p) => p !== path) }).eq("id", boxId);
    setViewer(null);
    await onChange();
  }

  const go = (d: number) => setViewer((v) => v === null ? v : (v + d + photos.length) % photos.length);

  return (
    <div className="mb-6">
      <h2 className="field-label">Fotos ({photos.length})</h2>
      {photos.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <button key={p} onClick={() => setViewer(i)} className="aspect-square overflow-hidden rounded-lg border-2 border-foreground bg-muted">
              {urls[p] && <img src={urls[p]} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button disabled={busy} onClick={() => camRef.current?.click()} className="btn-secondary"><Camera className="h-5 w-5" /> Cámara</button>
        <button disabled={busy} onClick={() => fileRef.current?.click()} className="btn-secondary"><ImagePlus className="h-5 w-5" /> Galería</button>
      </div>
      {busy && <p className="mt-2 text-center text-sm text-muted-foreground">Comprimiendo y subiendo…</p>}
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />

      {viewer !== null && photos[viewer] && (
        <div className="fixed inset-0 z-50 flex flex-col bg-foreground"
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touchX.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }}>
          <div className="flex items-center justify-between p-3 text-background">
            <span className="font-semibold">{viewer + 1} / {photos.length}</span>
            <div className="flex gap-2">
              <button aria-label="Borrar foto" onClick={() => remove(photos[viewer])} className="flex h-12 w-12 items-center justify-center"><Trash2 /></button>
              <button aria-label="Cerrar" onClick={() => setViewer(null)} className="flex h-12 w-12 items-center justify-center"><X className="h-7 w-7" /></button>
            </div>
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-auto">
            <img src={urls[photos[viewer]]} alt="" className="max-h-full max-w-full touch-pinch-zoom object-contain" />
            {photos.length > 1 && <>
              <button aria-label="Anterior" onClick={() => go(-1)} className="absolute left-2 flex h-12 w-12 items-center justify-center rounded-full bg-background/80"><ChevronLeft /></button>
              <button aria-label="Siguiente" onClick={() => go(1)} className="absolute right-2 flex h-12 w-12 items-center justify-center rounded-full bg-background/80"><ChevronRight /></button>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}
