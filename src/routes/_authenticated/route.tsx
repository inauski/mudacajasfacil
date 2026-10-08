import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { Package, Plus, LogOut } from "lucide-react";
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
  const { queryClient } = Route.useRouteContext();
  const navigate = useNavigate();
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col pb-24">
      <Outlet />
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-foreground bg-card">
        <div className="mx-auto grid max-w-xl grid-cols-3">
          <Link to="/cajas" className="flex flex-col items-center gap-1 py-3 text-xs font-semibold" activeProps={{ className: "text-primary" }} activeOptions={{ exact: true }}>
            <Package className="h-6 w-6" /> Cajas
          </Link>
          <Link to="/cajas/nueva" className="flex flex-col items-center gap-1 py-3 text-xs font-semibold" activeProps={{ className: "text-primary" }}>
            <Plus className="h-6 w-6" /> Nueva caja
          </Link>
          <button onClick={signOut} className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted-foreground">
            <LogOut className="h-6 w-6" /> Salir
          </button>
        </div>
      </nav>
    </div>
  );
}
