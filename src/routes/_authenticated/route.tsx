import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { Package, Plus, Search, FileDown, Settings } from "lucide-react";

const TABS = [
  { to: "/cajas", label: "Cajas", icon: Package },
  { to: "/buscar", label: "Buscar", icon: Search },
  { to: "/cajas/nueva", label: "Nueva", icon: Plus },
  { to: "/exportar", label: "Exportar", icon: FileDown },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
] as const;
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

function Layout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col pb-24 print:pb-0">
      <Outlet />
      <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t-2 border-foreground bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {TABS.map((t) => (
            <Link key={t.to} to={t.to} className="flex flex-col items-center gap-1 py-3 text-[11px] font-semibold" activeProps={{ className: "text-primary" }} activeOptions={{ exact: t.to === "/cajas" }}>
              <t.icon className="h-6 w-6" /> {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
