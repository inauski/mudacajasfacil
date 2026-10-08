import { useState } from "react";
import { ROOMS, STATUSES } from "@/lib/boxes";

export type BoxFormValues = {
  room: string;
  status: string;
  location: string;
  notes: string;
  essential: boolean;
  fragile: boolean;
};

export function BoxForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<BoxFormValues>;
  submitLabel: string;
  onSubmit: (v: BoxFormValues) => Promise<void>;
}) {
  const initRoom = initial?.room ?? "";
  const isCustom = initRoom !== "" && !ROOMS.includes(initRoom);
  const [roomSel, setRoomSel] = useState(isCustom ? "__otra" : initRoom);
  const [customRoom, setCustomRoom] = useState(isCustom ? initRoom : "");
  const [status, setStatus] = useState(initial?.status ?? "vacia");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [essential, setEssential] = useState(initial?.essential ?? false);
  const [fragile, setFragile] = useState(initial?.fragile ?? false);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSubmit({
            room: (roomSel === "__otra" ? customRoom : roomSel).trim(),
            status, location: location.trim(), notes: notes.trim(), essential, fragile,
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label className="field-label">Habitación de origen</label>
        <div className="grid grid-cols-2 gap-2">
          {[...ROOMS, "__otra"].map((r) => (
            <button type="button" key={r} onClick={() => setRoomSel(r)}
              className={`chip ${roomSel === r ? "chip-active" : ""}`}>
              {r === "__otra" ? "Otra…" : r}
            </button>
          ))}
        </div>
        {roomSel === "__otra" && (
          <input autoFocus value={customRoom} onChange={(e) => setCustomRoom(e.target.value)} placeholder="Escribe la habitación" className="field mt-2" />
        )}
      </div>

      <div>
        <label className="field-label">Estado</label>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button type="button" key={s.value} onClick={() => setStatus(s.value)} className={`chip ${status === s.value ? "chip-active" : ""}`}>{s.label}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="loc">Ubicación actual</label>
        <input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej. Garaje de mis padres, estantería 2" className="field" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setEssential(!essential)} className={`chip h-14 ${essential ? "chip-essential" : ""}`}>⭐ Abrir primero</button>
        <button type="button" onClick={() => setFragile(!fragile)} className={`chip h-14 ${fragile ? "chip-fragile" : ""}`}>⚠️ Frágil</button>
      </div>

      <div>
        <label className="field-label" htmlFor="notes">Notas</label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="field h-auto py-3" />
      </div>

      <button disabled={busy} className="btn-primary w-full">{busy ? "Guardando…" : submitLabel}</button>
    </form>
  );
}
