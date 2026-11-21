import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { canComment, type BoxRole } from "@/lib/sharing";

export function BoxComments({ boxId, userId, role }: { boxId: string; userId: string; role: BoxRole }) {
  const [body, setBody] = useState(""); const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const key = ["box-comments", boxId];
  const { data: comments = [], isError } = useQuery({ queryKey: key, refetchInterval: 15000, queryFn: async () => {
    const { data, error } = await supabase.from("box_comments").select("*").eq("box_id", boxId).order("created_at");
    if (error) throw error; return data;
  }});
  async function send() {
    if (!body.trim()) return; setBusy(true);
    const { error } = await supabase.from("box_comments").insert({ box_id: boxId, user_id: userId, body: body.trim() });
    setBusy(false); if (error) { toast.error("No se pudo comentar. Comprueba tu acceso."); return; }
    setBody(""); await client.invalidateQueries({ queryKey: key });
  }
  async function remove(id: string) {
    if (!confirm("¿Borrar este comentario?")) return;
    const { error } = await supabase.from("box_comments").delete().eq("id", id);
    if (error) toast.error("No se pudo borrar"); await client.invalidateQueries({ queryKey: key });
  }
  return <section className="mb-8 space-y-3 border-t border-border pt-5">
    <h2 className="field-label">Comentarios</h2>
    {isError && <p className="text-sm text-destructive">No se pudieron cargar los comentarios.</p>}
    {!comments.length && <p className="text-sm text-muted-foreground">Sin comentarios.</p>}
    {comments.map(c => <article key={c.id} className="border-b border-border pb-3">
      <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{c.user_id === userId ? "Tú" : "Colaborador"} · {new Date(c.created_at).toLocaleString("es-ES")}</p>
        {(role === "owner" || (canComment(role) && c.user_id === userId)) && <Button size="icon" variant="ghost" aria-label="Borrar comentario" title="Borrar comentario" onClick={() => void remove(c.id)}><Trash2 /></Button>}
      </div><p className="break-words whitespace-pre-wrap">{c.body}</p>
    </article>)}
    {canComment(role) && <form onSubmit={e => { e.preventDefault(); void send(); }} className="space-y-2">
      <label htmlFor="comment" className="text-sm font-semibold">Añadir comentario</label>
      <Textarea id="comment" maxLength={2000} required value={body} onChange={e => setBody(e.target.value)} rows={3} />
      <Button disabled={busy || !body.trim()} className="h-12 w-full"><Send /> {busy ? "Enviando…" : "Publicar comentario"}</Button>
    </form>}
  </section>;
}
