import { useInfiniteQuery } from "@tanstack/react-query";
import { History, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { statusLabel } from "@/lib/boxes";
import { ROLE_LABELS } from "@/lib/sharing";
import type { Json } from "@/integrations/supabase/types";

const actions: Record<string, string> = {
  box_created: "Creó la caja", box_updated: "Modificó la caja",
  item_added: "Añadió un objeto", item_updated: "Modificó un objeto", item_deleted: "Eliminó un objeto",
  comment_added: "Comentó en la caja", comment_deleted: "Eliminó un comentario",
  share_granted: "Compartió la caja", share_updated: "Cambió un permiso", share_revoked: "Retiró un acceso",
};
const fields: Record<string, string> = {
  code: "código", room: "habitación", location: "ubicación", status: "estado", notes: "notas",
  essential: "abrir primero", fragile: "frágil", photos: "fotos", created_at: "fecha de creación",
};
function detailText(details: Json) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  const parts: string[] = [];
  if (typeof details["name"] === "string") parts.push(details["name"]);
  if (Array.isArray(details["fields"])) parts.push(details["fields"].filter((v): v is string => typeof v === "string").map(v => fields[v] ?? v).join(", "));
  if (typeof details["status"] === "string") parts.push(statusLabel(details["status"]));
  const role = details["role"];
  if (role === "reader" || role === "editor" || role === "commenter") parts.push(ROLE_LABELS[role]);
  return parts.join(" · ");
}

export function BoxHistory({ boxId, userId }: { boxId: string; userId: string }) {
  const query = useInfiniteQuery({
    queryKey: ["box-history", boxId], initialPageParam: 0, refetchInterval: 15000,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.from("box_activity").select("*").eq("box_id", boxId)
        .order("created_at", { ascending: false }).order("id", { ascending: false }).range(pageParam, pageParam + 29);
      if (error) throw error;
      return data;
    },
    getNextPageParam: (last, pages) => last.length === 30 ? pages.length * 30 : undefined,
  });
  const events = query.data?.pages.flat() ?? [];
  return <section className="mb-8 border-t border-border pt-5" aria-labelledby="box-history-title">
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 id="box-history-title" className="field-label mb-0 flex items-center gap-2"><History className="size-5" />Historial de la caja</h2>
      <Button variant="ghost" size="icon" aria-label="Actualizar historial" title="Actualizar historial" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw /></Button>
    </div>
    <p className="mb-4 text-xs text-muted-foreground">Acciones registradas desde la activación del historial.</p>
    {query.isPending && <p role="status" className="text-sm text-muted-foreground">Cargando historial…</p>}
    {query.isError ? <p role="alert" className="text-sm text-destructive">No se pudo cargar el historial. Comprueba tu acceso y vuelve a intentarlo.</p> : <>
      {!query.isPending && !events.length && <p className="text-sm text-muted-foreground">Todavía no hay acciones registradas.</p>}
      <ol className="space-y-4">{events.map(event => <li key={event.id} className="border-l-2 border-border pl-3">
        <p className="break-words text-sm font-semibold">{actions[event.action] ?? "Acción registrada"}</p>
        {detailText(event.details) && <p className="break-words text-sm">{detailText(event.details)}</p>}
        <p className="break-all text-sm text-muted-foreground">{event.actor_id === userId ? `Tú · ${event.actor_label}` : event.actor_label}</p>
        <time dateTime={event.created_at} className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "medium" })}</time>
      </li>)}</ol>
      {query.hasNextPage && <Button variant="outline" className="mt-4 h-12 w-full" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? "Cargando…" : "Ver acciones anteriores"}</Button>}
    </>}
  </section>;
}