import { statusLabel } from "@/lib/boxes";
import type { DocumentBox } from "@/lib/box-document";

export function BoxPrint({ box }: { box: DocumentBox }) {
  return <section className="print-sheet hidden print:block">
    <h1 className="font-display text-3xl font-extrabold">Muda Fácil · {box.code}</h1>
    <p className="mt-3 font-semibold">{box.room || "Sin habitación"} · {statusLabel(box.status)}</p>
    {box.location && <p>Ubicación: {box.location}</p>}
    <p className="mt-2 font-semibold">{box.essential && "★ Abrir primero "}{box.fragile && "⚠ Frágil"}</p>
    {box.notes && <p className="mt-2 whitespace-pre-wrap">{box.notes}</p>}
    <ul className="mt-4 space-y-3">{box.items.map((i, index) => <li key={index} className="print-box flex gap-3 border-b border-border pb-2">
      <span>{i.unpacked ? "☑" : "☐"}</span><div><p>{i.name} ×{i.quantity}</p>{i.origin && <p className="text-sm">Estaba en: {i.origin}</p>}</div>
    </li>)}</ul>
    {!box.items.length && <p className="mt-4">Sin objetos.</p>}
    <p className="mt-6 text-sm">Copia impresa sin permisos revocables.</p>
  </section>;
}
