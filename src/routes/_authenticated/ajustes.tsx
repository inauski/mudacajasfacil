import { pageMeta } from "@/lib/sharing";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InstallHelp } from "@/components/InstallHelp";
import { CleanupPhotos } from "@/components/CleanupPhotos";
import { HowToHelp } from "@/components/HowToHelp";

export const Route = createFileRoute("/_authenticated/ajustes")({
  head: () => ({ meta: pageMeta("Ajustes y privacidad · Muda Fácil", "Sesión, instalación y permisos de tus cajas compartidas.") }),
  component: Settings,
});

const CHECKS = [
  "Tu inventario no es público: solo tú y los destinatarios autorizados ven cada caja.",
  "Lector: leer. Comentador: leer y añadir comentarios. Editor: modificar los campos y objetos de la caja.",
  "Solo el propietario puede dar o revocar acceso, cambiar el código y eliminar la caja.",
  "El destinatario inicia sesión con el correo confirmado al que has dado permiso.",
  "Las fotos son privadas. Sus enlaces caducan en un minuto; las copias e impresiones no tienen permisos revocables.",
  "La numeración de tus cajas es independiente de las cajas compartidas contigo.",
];

function Settings() {
  const { user, queryClient } = Route.useRouteContext();
  const navigate = useNavigate();
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: "/cajas" }, replace: true });
  }
  return (
    <div className="space-y-5 px-4 pt-6">
      <h1 className="font-display text-4xl font-extrabold">Ajustes</h1>
      <div className="box-card">
        <p className="field-label mb-1">Sesión</p>
        <p className="flex items-center gap-2 text-lg font-semibold"><span className="h-3 w-3 rounded-full bg-primary" /> Conectado</p>
        <p className="break-all text-muted-foreground">{user.email}</p>
        <button onClick={signOut} className="btn-secondary mt-3 w-full"><LogOut className="h-5 w-5" /> Cerrar sesión</button>
      </div>
      <HowToHelp label="Ver las instrucciones de uso" />
      <InstallHelp />
      <CleanupPhotos userId={user.id} />
      <div className="box-card">
        <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-extrabold"><ShieldCheck className="h-7 w-7 text-primary" /> Tu espacio es privado</h2>
        <ul className="space-y-3">
          {CHECKS.map((c) => <li key={c} className="flex gap-2"><span className="font-bold text-primary">✓</span><span>{c}</span></li>)}
        </ul>
      </div>
      <div className="h-4" />
    </div>
  );
}
