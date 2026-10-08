import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, Star, Plus, Search } from "lucide-react";
import { boxesQuery, STATUSES, statusLabel } from "@/lib/boxes";

export const Route = createFileRoute("/_authenticated/cajas/")({
  head: () => ({
    meta: [
      { title: "Mis cajas · Mudanza" },
      { name: "description", content: "Listado de tus cajas de mudanza con filtros por habitación y estado." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(boxesQuery),
  component: BoxesList,
});

function BoxesList() {
  const { data: boxes } = useSuspenseQuery(boxesQuery);
  const [room, setRoom] = useState("");
  const [status, setStatus] = useState("");
  const rooms = useMemo(() => Array.from(new Set(boxes.map((b) => b.room).filter(Boolean))).sort(), [boxes]);
  const filtered = boxes.filter((b) => (!room || b.room === room) && (!status || b.status === status));

  return (
    <div className="px-4 pt-6">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mudanza</p>
          <h1 className="font-display text-4xl font-extrabold">Mis cajas</h1>
        </div>
        <span className="stamp">{boxes.length} cajas</span>
      </header>
      <Link to="/buscar" className="field mb-3 flex items-center gap-3 text-muted-foreground"><Search className="h-5 w-5" /> Buscar un objeto…</Link>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <select value={room} onChange={(e) => setRoom(e.target.value)} className="h-12 rounded-lg border-2 border-foreground bg-card px-3 text-base">
          <option value="">Todas las habitaciones</option>
          {rooms.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-12 rounded-lg border-2 border-foreground bg-card px-3 text-base">
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {boxes.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-foreground/40 p-8 text-center">
          <p className="mb-4 text-lg">Aún no tienes cajas.</p>
          <Link to="/cajas/nueva" className="btn-primary"><Plus className="h-5 w-5" /> Crear la primera</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((b) => (
            <li key={b.id}>
              <Link to="/cajas/$id" params={{ id: b.id }} className={`box-card block ${b.status === "desembalada" ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`font-display text-3xl font-extrabold leading-none ${b.status === "desembalada" ? "line-through" : ""}`}>{b.code}</p>
                    <p className="mt-1 truncate text-base font-medium">{b.room || "Sin habitación"}</p>
                    {b.location && <p className="truncate text-sm text-muted-foreground">📍 {b.location}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">{statusLabel(b.status)}</span>
                    <span className="text-sm text-muted-foreground">{b.itemCount} objetos</span>
                  </div>
                </div>
                {(b.essential || b.fragile) && (
                  <div className="mt-3 flex gap-2">
                    {b.essential && <span className="tag-essential"><Star className="h-3.5 w-3.5" /> Abrir primero</span>}
                    {b.fragile && <span className="tag-fragile"><AlertTriangle className="h-3.5 w-3.5" /> Frágil</span>}
                  </div>
                )}
              </Link>
            </li>
          ))}
          {filtered.length === 0 && <p className="py-8 text-center text-muted-foreground">Ninguna caja coincide con los filtros.</p>}
        </ul>
      )}

      <Link to="/cajas/nueva" aria-label="Nueva caja" className="fixed bottom-24 right-5 z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-foreground bg-primary text-primary-foreground shadow-[4px_4px_0_0_var(--foreground)]">
        <Plus className="h-8 w-8" />
      </Link>
    </div>
  );
}
