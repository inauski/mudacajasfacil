import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { inventoryQuery, normalize } from "@/lib/inventory";
import { statusLabel } from "@/lib/boxes";

export const Route = createFileRoute("/_authenticated/buscar")({
  head: () => ({ meta: [{ title: "Buscar · Muda Fácil" }, { name: "description", content: "Encuentra en qué caja está cada objeto." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(inventoryQuery),
  component: SearchPage,
});

function SearchPage() {
  const { data: boxes } = useSuspenseQuery(inventoryQuery);
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const n = normalize(q);
    if (!n) return [];
    const out: { key: string; title: string; qty?: number; unpacked?: boolean; box: (typeof boxes)[number]; noteHit?: boolean }[] = [];
    for (const b of boxes) {
      for (const it of b.items) if (normalize(it.name).includes(n)) out.push({ key: it.id, title: it.name, qty: it.quantity, unpacked: it.unpacked, box: b });
      if (b.notes && normalize(b.notes).includes(n)) out.push({ key: "n" + b.id, title: b.notes, box: b, noteHit: true });
    }
    return out.slice(0, 100);
  }, [q, boxes]);

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 font-display text-4xl font-extrabold">Buscar</h1>
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
        <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="¿Qué buscas? Ej: sarten" className="field pl-12" />
      </div>
      {q && <p className="mb-3 text-sm text-muted-foreground">{results.length} resultado{results.length === 1 ? "" : "s"}</p>}
      <ul className="space-y-2">
        {results.map((r) => (
          <li key={r.key}>
            <Link to="/cajas/$id" params={{ id: r.box.id }} className="block rounded-xl border-2 border-foreground bg-card p-3 active:translate-y-px">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-lg font-semibold ${r.unpacked ? "line-through opacity-60" : ""}`}>
                  {r.noteHit ? <span className="text-sm font-normal italic">Nota: {r.title}</span> : r.title}
                </p>
                {r.qty !== undefined && <span className="font-bold text-muted-foreground">×{r.qty}</span>}
              </div>
              <p className="mt-1 text-sm">
                <span className="font-display text-base font-extrabold">{r.box.code}</span> · {r.box.room || "Sin habitación"} · <span className="font-semibold">{statusLabel(r.box.status)}</span>
              </p>
              {r.box.location && <p className="text-sm text-muted-foreground">📍 {r.box.location}</p>}
            </Link>
          </li>
        ))}
      </ul>
      {q && !results.length && <p className="py-8 text-center text-muted-foreground">No hay nada con «{q}».</p>}
    </div>
  );
}
