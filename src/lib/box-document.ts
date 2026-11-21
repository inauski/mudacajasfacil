import { statusLabel } from "@/lib/boxes";

export type DocumentBox = {
  code: string; room: string; location: string; status: string; notes: string; essential: boolean; fragile: boolean;
  items: { name: string; quantity: number; unpacked: boolean; origin?: string; photo?: string | null }[];
};
const escapeHTML = (text: unknown) => String(text ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** Self-contained snapshot of exactly one box. Never contains a protected app link or session. */
export function boxDocument(box: DocumentBox): string {
  const e = escapeHTML;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(box.code)} · Muda Fácil</title></head><body>
<header><h1>Muda Fácil · ${e(box.code)}</h1><p>Copia del inventario. Sin permisos revocables. No se actualiza con la app.</p></header>
<h2>${e(box.room || "Sin habitación")}</h2><p>Estado: ${e(statusLabel(box.status))} · Ubicación: ${e(box.location || "Sin indicar")}</p>
<p>${box.essential ? "★ Abrir primero " : ""}${box.fragile ? "⚠ Frágil" : ""}</p><p>${e(box.notes)}</p>
<table><thead><tr><th>Desembalado</th><th>Objeto</th><th>Cantidad</th><th>Dónde estaba</th></tr></thead><tbody>${box.items.map(i => `<tr><td>${i.unpacked ? "☑" : "☐"}</td><td>${e(i.name)}</td><td>${i.quantity}</td><td>${e(i.origin)}</td></tr>`).join("")}</tbody></table>
${box.items.length ? "" : "<p>Sin objetos.</p>"}</body></html>`;
}
export function documentFile(box: DocumentBox): File {
  return new File([boxDocument(box)], `caja-${box.code.replace(/[^a-z0-9-]/gi, "_")}.html`, { type: "text/html;charset=utf-8" });
}
export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a"); a.href = url; a.download = file.name; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
