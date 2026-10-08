import { useEffect, useState } from "react";
import { Download, Share, PlusSquare } from "lucide-react";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallHelp() {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIP); };
    window.addEventListener("beforeinstallprompt", h);
    const done = () => setInstalled(true);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("appinstalled", done); };
  }, []);

  if (installed) return <div className="box-card"><p className="font-semibold">✅ Muda Fácil ya está instalada en tu pantalla de inicio.</p></div>;

  return (
    <div className="box-card space-y-3">
      <h2 className="font-display text-2xl font-extrabold">Instalar en el móvil</h2>
      {evt && (
        <button className="btn-primary w-full" onClick={async () => { await evt.prompt(); await evt.userChoice; setEvt(null); }}>
          <Download className="h-5 w-5" /> Instalar Muda Fácil
        </button>
      )}
      {ios ? (
        <ol className="space-y-2 text-base">
          <li>1. Abre esta página en <b>Safari</b>.</li>
          <li className="flex items-center gap-1">2. Pulsa <Share className="inline h-5 w-5" /> <b>Compartir</b>.</li>
          <li className="flex items-center gap-1">3. Elige <PlusSquare className="inline h-5 w-5" /> <b>Añadir a pantalla de inicio</b>.</li>
        </ol>
      ) : !evt && (
        <ol className="space-y-2 text-base">
          <li>1. Abre el menú <b>⋮</b> de Chrome.</li>
          <li>2. Pulsa <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>.</li>
        </ol>
      )}
      <p className="text-sm text-muted-foreground">La instalación funciona en la versión publicada de la app, no dentro del editor.</p>
    </div>
  );
}
