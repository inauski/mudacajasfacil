import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Trash2, Keyboard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseItems, type DraftItem } from "@/lib/parse-items";

type SR = { start(): void; stop(): void; lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };

function getSR(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function QuickAddItems({ boxId, userId, onSaved }: { boxId: string; userId: string; onSaved: () => Promise<unknown> }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [drafts, setDrafts] = useState<DraftItem[] | null>(null);
  const [saving, setSaving] = useState(false);
  const recRef = useRef<SR | null>(null);
  const finalRef = useRef<string[]>([]);

  useEffect(() => setSupported(!!getSR()), []);

  function startVoice() {
    const C = getSR();
    if (!C) return;
    const rec = new C();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = true;
    finalRef.current = [];
    rec.onresult = (e) => {
      let tmp = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        // each final result corresponds to a pause → treat as a separate item chunk
        if (r.isFinal) finalRef.current.push(r[0].transcript.trim());
        else tmp += r[0].transcript;
      }
      setInterim([...finalRef.current, tmp].filter(Boolean).join(", "));
    };
    rec.onerror = (e) => { if (e.error === "not-allowed") toast.error("Permite el acceso al micrófono"); };
    rec.onend = () => {
      setListening(false);
      const all = finalRef.current.join(", ");
      setInterim("");
      if (all.trim()) setDrafts(parseItems(all));
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  function stopVoice() { recRef.current?.stop(); }

  function review() {
    const d = parseItems(text);
    if (!d.length) return toast.error("Escribe al menos un objeto");
    setDrafts(d);
  }

  async function saveAll() {
    if (!drafts) return;
    const rows = drafts.filter((d) => d.name.trim()).map((d) => ({
      box_id: boxId, user_id: userId, name: d.name.trim(), quantity: Math.max(1, d.quantity || 1),
    }));
    if (!rows.length) { setDrafts(null); return; }
    setSaving(true);
    const { error } = await supabase.from("items").insert(rows);
    setSaving(false);
    if (error) { toast.error("No se pudieron guardar"); return; }
    toast.success(`${rows.length} objeto${rows.length > 1 ? "s" : ""} añadido${rows.length > 1 ? "s" : ""}`);
    setDrafts(null);
    setText("");
    await onSaved();
  }

  if (drafts) {
    return (
      <div className="box-card mb-6 space-y-3">
        <h3 className="field-label mb-0">Revisa antes de guardar ({drafts.length})</h3>
        {drafts.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={d.name} onChange={(e) => setDrafts(drafts.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
              className="field h-12 flex-1 text-base" aria-label="Nombre" />
            <input type="number" min={1} inputMode="numeric" value={d.quantity}
              onChange={(e) => setDrafts(drafts.map((x, j) => j === i ? { ...x, quantity: parseInt(e.target.value) || 1 } : x))}
              className="field h-12 w-16 px-2 text-center text-base" aria-label="Cantidad" />
            <button type="button" aria-label="Quitar" onClick={() => setDrafts(drafts.filter((_, j) => j !== i))}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-foreground"><Trash2 className="h-5 w-5" /></button>
          </div>
        ))}
        <button type="button" onClick={() => setDrafts([...drafts, { name: "", quantity: 1 }])} className="w-full py-2 font-semibold underline">+ Añadir otro</button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setDrafts(null)} className="btn-secondary">Cancelar</button>
          <button type="button" disabled={saving} onClick={saveAll} className="btn-primary">{saving ? "Guardando…" : "Guardar todo"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-3">
      {supported && (
        <button type="button" onClick={listening ? stopVoice : startVoice}
          className={`flex h-24 w-full items-center justify-center gap-3 rounded-xl border-2 border-foreground text-xl font-bold ${listening ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
          style={{ boxShadow: "4px 4px 0 0 var(--foreground)" }}>
          {listening ? <><MicOff className="h-8 w-8" /> Parar y revisar</> : <><Mic className="h-8 w-8" /> Dictar objetos</>}
        </button>
      )}
      {listening && <p className="min-h-6 rounded-lg bg-card p-3 text-base">{interim || "Escuchando… di los objetos separados por pausas o «y»."}</p>}
      {!listening && (
        <div className="box-card space-y-2">
          <label htmlFor="batch" className="field-label mb-0 flex items-center gap-2"><Keyboard className="h-4 w-4" /> {supported ? "O escribe" : "Escribe o usa el micrófono del teclado"}</label>
          <textarea id="batch" rows={4} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={"Uno por línea o separados por comas\nEj: 2 sartenes, cargador, libro de cocina"}
            className="field h-auto py-3 text-base" />
          <button type="button" onClick={review} className="btn-secondary w-full">Revisar y añadir</button>
        </div>
      )}
    </div>
  );
}
