import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ROOMS = [
  "Salón",
  "Cocina",
  "Dormitorio principal",
  "Dormitorio 2",
  "Dormitorio 3",
  "Baño",
  "Despacho",
  "Pasillo",
  "Terraza",
  "Trastero/Garaje",
];

export const STATUSES = [
  { value: "vacia", label: "Vacía" },
  { value: "llena", label: "Llena" },
  { value: "cerrada", label: "Cerrada" },
  { value: "transportada", label: "Transportada" },
  { value: "desembalada", label: "Desembalada" },
] as const;

export type BoxStatus = (typeof STATUSES)[number]["value"];

export const statusLabel = (s: string) => STATUSES.find((x) => x.value === s)?.label ?? s;

export const boxesQuery = queryOptions({
  queryKey: ["boxes"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("boxes")
      .select("*, items(count)")
      .order("number", { ascending: false });
    if (error) throw error;
    return data.map((b) => ({
      ...b,
      itemCount: (b.items as unknown as { count: number }[])?.[0]?.count ?? 0,
    }));
  },
});

export const boxQuery = (id: string) =>
  queryOptions({
    queryKey: ["box", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boxes")
        .select("*, items(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
