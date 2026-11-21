import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Share2, Copy, Mail, Download, Printer, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, type BoxRole } from "@/lib/sharing";
import { documentFile, downloadFile, type DocumentBox } from "@/lib/box-document";

export function ShareBox({ box, role }: { box: DocumentBox & { id: string }; role: BoxRole }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [access, setAccess] = useState<"reader" | "commenter" | "editor">("reader");
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const { data: shares = [] } = useQuery({ queryKey: ["box-shares", box.id], enabled: open && role === "owner", queryFn: async () => {
    const { data, error } = await supabase.from("box_shares").select("*").eq("box_id", box.id).order("created_at");
    if (error) throw error; return data;
  }});
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/cajas/${box.id}`;
  const message = `Te comparto una caja en Muda Fácil. Entra con el correo al que te he dado acceso: ${link}`;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["box-shares", box.id] });
  async function grant(target: string, targetRole: string) {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("set_box_share", { _box_id: box.id, _email: target, _role: targetRole });
      if (error) throw error;
      setEmail(""); await refresh(); toast.success("Permiso guardado. Envía el enlace al destinatario.");
    } catch { toast.error("No se pudo guardar el permiso. Comprueba el correo y tu acceso."); }
    finally { setBusy(false); }
  }
  async function revoke(id: string, recipient: string) {
    if (!confirm(`¿Revocar el acceso de ${recipient}?`)) return;
    const { error } = await supabase.from("box_shares").delete().eq("id", id).select("id");
    if (error) { toast.error("No se pudo revocar"); return; }
    await refresh(); toast.success("Acceso revocado");
  }
  async function shareDevice(file = false) {
    try {
      if (file) {
        const document = documentFile(box);
        if (navigator.canShare?.({ files: [document] })) await navigator.share({ files: [document], title: `Caja ${box.code}` });
        else { downloadFile(document); toast.info("Documento descargado: puedes enviarlo como archivo."); }
      } else if (navigator.share) await navigator.share({ title: "Caja compartida · Muda Fácil", text: "Inicia sesión con el correo autorizado.", url: link });
      else { await navigator.clipboard.writeText(link); toast.success("Enlace copiado"); }
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("No se pudo compartir. Copia el enlace o descarga el documento."); }
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" className="h-12 w-full"><Share2 /> Compartir / imprimir</Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogTitle>Compartir caja {box.code}</DialogTitle>
      <DialogDescription>El enlace abre la caja actual solo a las personas autorizadas. Inician sesión con su correo confirmado.</DialogDescription>
      {role === "owner" ? <section className="space-y-3">
        <h3 className="font-semibold">Personas con acceso</h3>
        <form className="space-y-2" onSubmit={e => { e.preventDefault(); void grant(email, access); }}>
          <label htmlFor="recipient-email" className="text-sm font-semibold">Correo del destinatario</label>
          <Input id="recipient-email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className="h-12" placeholder="persona@ejemplo.com" />
          <label htmlFor="new-access" className="text-sm font-semibold">Permiso</label>
          <select id="new-access" value={access} onChange={e => setAccess(e.target.value as typeof access)} className="field h-12">
            <option value="reader">Lector · puede leer</option><option value="commenter">Comentador · leer y comentar</option><option value="editor">Editor · leer y editar contenido</option>
          </select>
          <Button className="h-12 w-full" disabled={busy}>Dar acceso</Button>
        </form>
        <p className="text-sm text-muted-foreground">No se envía un correo automáticamente: guarda el permiso y envía el enlace abajo. Solo tú administras permisos y eliminas la caja.</p>
        {shares.map(s => <div key={s.id} className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
          <div className="w-full min-w-0"><p className="break-all text-sm font-semibold">{s.recipient_email}</p><p className="text-xs text-muted-foreground">{s.recipient_id ? "Acceso aceptado" : "Pendiente de iniciar sesión"}</p></div>
          <select aria-label={`Permiso de ${s.recipient_email}`} value={s.role} disabled={busy} onChange={e => void grant(s.recipient_email, e.target.value)} className="field h-11 min-w-0 flex-1">
            {(["reader", "commenter", "editor"] as const).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <Button variant="ghost" size="icon" aria-label={`Revocar acceso de ${s.recipient_email}`} title="Revocar acceso" onClick={() => void revoke(s.id, s.recipient_email)}><Trash2 /></Button>
        </div>)}
        <p className="text-xs text-muted-foreground">Al revocar, se bloquean nuevas consultas. Las fotos ya abiertas pueden seguir visibles hasta un minuto.</p>
      </section> : <p className="text-sm">Tu permiso: {ROLE_LABELS[role]}. Solo el propietario puede dar acceso a otras personas.</p>}
      <section className="space-y-2 border-t border-border pt-4">
        <h3 className="font-semibold">Enviar enlace protegido</h3>
        <Input readOnly value={link} aria-label="Enlace protegido" onFocus={e => e.target.select()} />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-12" onClick={() => void shareDevice()}><Share2 /> Compartir</Button>
          <Button variant="outline" className="h-12" onClick={async () => { try { await navigator.clipboard.writeText(link); toast.success("Enlace copiado"); } catch { toast.info("Selecciona y copia el enlace de arriba."); } }}><Copy /> Copiar</Button>
          <Button asChild variant="outline" className="h-12"><a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a></Button>
          <Button asChild variant="outline" className="h-12"><a href={`mailto:?subject=${encodeURIComponent("Caja compartida · Muda Fácil")}&body=${encodeURIComponent(message)}`}><Mail /> Correo</a></Button>
          <Button asChild variant="outline" className="col-span-2 h-12"><a href={`https://mail.google.com/mail/?view=cm&su=${encodeURIComponent("Caja compartida · Muda Fácil")}&body=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><Mail /> Gmail</a></Button>
        </div>
        <p className="text-xs text-muted-foreground">Bluetooth y Drive pueden aparecer en el menú del dispositivo si son compatibles. No se conecta ninguna cuenta externa.</p>
      </section>
      <section className="space-y-2 border-t border-border pt-4">
        <h3 className="font-semibold">Documento de esta caja</h3>
        <p className="text-sm text-muted-foreground">Copia HTML con la información y objetos, sin fotos. Una copia descargada, enviada o impresa no se actualiza y no tiene permisos revocables.</p>
        <Button variant="outline" className="h-12 w-full" onClick={() => downloadFile(documentFile(box))}><Download /> Descargar documento</Button>
        <Button variant="outline" className="h-12 w-full" onClick={() => void shareDevice(true)}><Share2 /> Compartir archivo</Button>
        <Button variant="outline" className="h-12 w-full" onClick={() => { setOpen(false); window.setTimeout(() => window.print(), 200); }}><Printer /> Imprimir esta caja</Button>
      </section>
    </DialogContent>
  </Dialog>;
}
