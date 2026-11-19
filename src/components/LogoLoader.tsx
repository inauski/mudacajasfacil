export function LogoLoader() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background"
      role="status"
      aria-label="Cargando"
    >
      <img
        src="/icon-192.png"
        alt="Muda Fácil"
        className="logo-pulse h-24 w-24 rounded-3xl"
      />
      <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
        Cargando…
      </p>
    </div>
  );
}
