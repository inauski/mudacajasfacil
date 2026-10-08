import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { inventoryQuery, toCSV } from "@/lib/inventory";
import { statusLabel } from "@/lib/boxes";

export const Route = createFileRoute("/_authenticated/exportar")({
  head: () => ({ meta: [{ title: "Exportar · Muda Fácil" }, { name: "description", content: "Descarga tu inventario en CSV o imprímelo caja por caja." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(inventoryQuery),
  component: ExportPage,
});

function ExportPage() {
  const { data: boxes } = useSuspenseQuery(inventoryQuery);
  const totalItems = boxes.reduce((n, b) => n + b.items.length, 0);

  function downloadCSV() {
    const blob = new Blob([toCSV(boxes)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `inventario-mudanza-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="px-4 pt-6">
      <div className="no-print">
        <h1 className="mb-1 font-display text-4xl font-extrabold">Exportar</h1>
        <p className="mb-5 text-muted-foreground">{boxes.length} cajas · {totalItems} objetos</p>
        <div className="mb-8 grid gap-3">
          <button onClick={downloadCSV} className="btn-primary"><Download className="h-5 w-5" /> Descargar CSV (Excel / Sheets)</button>
          <button onClick={() => window.print()} className="btn-secondary"><Printer className="h-5 w-5" /> Imprimir o guardar PDF</button>
        </div>
        <h2 className="field-label">Vista previa de impresión</h2>
      </div>

      <div className="print-sheet space-y-4">
        <h1 className="hidden font-display text-2xl font-extrabold print:block">Inventario de mudanza</h1>
        {boxes.map((b) => (
          <section key={b.id} className="print-box rounded-xl border-2 border-foreground bg-card p-4">
            <div className="flex items-baseline justify-between gap-2 border-b-2 border-foreground pb-2">
              <span className="font-display text-3xl font-extrabold">{b.code}</span>
              <span className="text-sm font-semibold">{statusLabel(b.status)}</span>
            </div>
            <p className="mt-2 font-semibold">{b.room || "Sin habitación"}{b.location ? ` · ${b.location}` : ""}</p>
            {(b.essential || b.fragile) && (
              <p className="mt-1 text-sm font-bold uppercase">{b.essential && "★ Abrir primero  "}{b.fragile && "⚠ Frágil"}</p>
            )}
            {b.notes && <p className="mt-1 text-sm italic">{b.notes}</p>}
            <ul className="mt-2 space-y-1">
              {b.items.map((it) => (
                <li key={it.id} className="flex items-center gap-2 text-sm">
                  <span className="inline-block h-4 w-4 shrink-0 border-2 border-foreground text-center text-[10px] leading-3">{it.unpacked ? "✓" : ""}</span>
                  <span className="flex-1">{it.name}</span><span>×{it.quantity}</span>
                </li>
              ))}
              {!b.items.length && <li className="text-sm text-muted-foreground">(sin objetos)</li>}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
