import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InstallHelp } from "@/components/InstallHelp";

export const Route = createFileRoute("/_authenticated/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes y privacidad · Muda Fácil" }, { name: "description", content: "Tu sesión, instalación en el móvil y cómo protegemos tus datos." }] }),
  component: Settings,
});

const CHECKS = [
  "Cada caja, objeto y foto lleva tu identificador de usuario.",
  "La base de datos solo te deja ver, crear, editar o borrar filas con tu identificador (seguridad por filas).",
  "Otra persona, aunque conozca el enlace de una caja tuya, no recibe nada: la consulta vuelve vacía.",
  "Tus fotos están en un almacén privado, en una carpeta con tu identificador; solo tú puedes subir o abrir sus archivos.",
  "Las fotos se muestran con enlaces firmados que caducan en 1 hora.",
  "La numeración C-001… es tuya: la asigna el servidor solo para tu cuenta.",
];

function Settings() {
  const { user, queryClient } = Route.useRouteContext();
  const navigate = useNavigate();
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
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
      <InstallHelp />
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
