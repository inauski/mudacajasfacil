import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { statusLabel } from "@/lib/boxes";

export const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export const inventoryQuery = queryOptions({
  queryKey: ["inventory"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("boxes")
      .select("id, code, number, room, status, location, notes, essential, fragile, items(id, name, quantity, unpacked)")
      .order("number");
    if (error) throw error;
    return data;
  },
});

export type InvBox = Awaited<ReturnType<typeof inventoryQuery.queryFn & {}>>[number];

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV with ";" separator and BOM so Excel (es) opens accents and columns correctly. */
export function toCSV(boxes: InvBox[]): string {
  const head = ["Caja", "Habitación", "Estado", "Ubicación", "Esencial", "Frágil", "Objeto", "Cantidad", "Desembalado"];
  const rows: unknown[][] = [];
  for (const b of boxes) {
    const base = [b.code, b.room, statusLabel(b.status), b.location, b.essential ? "Sí" : "No", b.fragile ? "Sí" : "No"];
    if (!b.items.length) rows.push([...base, "", "", ""]);
    for (const it of b.items) rows.push([...base, it.name, it.quantity, it.unpacked ? "Sí" : "No"]);
  }
  return "\uFEFF" + [head, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
}
