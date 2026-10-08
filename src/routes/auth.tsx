import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Mudanza en cajas" },
      { name: "description", content: "Inicia sesión o crea tu cuenta para organizar tu mudanza en privado." },
      { property: "og:title", content: "Entrar · Mudanza en cajas" },
      { property: "og:description", content: "Organiza tu mudanza caja a caja, en tu espacio privado." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/cajas", replace: true }); });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error("Email o contraseña incorrectos");
      navigate({ to: "/cajas", replace: true });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      setBusy(false);
      if (error) return toast.error(error.message);
      if (data.session) navigate({ to: "/cajas", replace: true });
      else setSent(true);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <span className="stamp mb-4 inline-block">Este lado arriba ↑</span>
        <h1 className="font-display text-5xl font-extrabold leading-[0.95]">Mudanza<br />en cajas</h1>
        <p className="mt-3 text-lg text-muted-foreground">Sabe qué hay en cada caja. Solo tú ves tu inventario.</p>
      </div>
      {sent ? (
        <div className="box-card">
          <p className="text-lg font-semibold">Revisa tu correo</p>
          <p className="mt-1 text-muted-foreground">Te hemos enviado un enlace para confirmar tu cuenta en {email}.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="box-card space-y-4">
          <div>
            <label className="field-label" htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
          </div>
          <div>
            <label className="field-label" htmlFor="pw">Contraseña</label>
            <input id="pw" type="password" required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
          </div>
          <button disabled={busy} className="btn-primary w-full">{busy ? "Un momento…" : mode === "login" ? "Entrar" : "Crear cuenta"}</button>
          <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="w-full py-2 text-center font-semibold underline">
            {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Entra"}
          </button>
        </form>
      )}
    </div>
  );
}
