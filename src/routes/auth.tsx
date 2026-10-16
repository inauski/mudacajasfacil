import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

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
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/cajas", replace: true }); });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error("Email o contraseña incorrectos"); return; }
      navigate({ to: "/cajas", replace: true });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      if (data.session) navigate({ to: "/cajas", replace: true });
      else setSent(true);
    }
  }

  async function signInWithGoogle() {
    setGoogleBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setGoogleBusy(false);
    if (result.error) { toast.error("No se pudo iniciar sesión con Google"); return; }
    if (result.redirected) return;
    navigate({ to: "/cajas", replace: true });
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
          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">o</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <button type="button" disabled={googleBusy} onClick={signInWithGoogle} className="btn-secondary flex w-full items-center justify-center gap-3 py-3">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2a7 7 0 0 1-6.6-4.8H1.4v3.1A12 12 0 0 0 12 24Z" />
              <path fill="#FBBC05" d="M5.4 14.5a7.2 7.2 0 0 1 0-4.9V6.5H1.4a12 12 0 0 0 0 10.9l4-3Z" />
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8L20 3.2A12 12 0 0 0 1.4 6.5l4 3.1A7 7 0 0 1 12 4.8Z" />
            </svg>
            {googleBusy ? "Un momento…" : "Continuar con Google"}
          </button>
        </form>
      )}
    </div>
  );
}
