import { HelpCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

type Step = { title: string; body: string; tip?: string };

const STEPS: Step[] = [
  {
    title: "Crea una caja",
    body:
      "Pulsa «Nueva» en la barra de abajo, o el botón ＋ naranja. Escribe la habitación de origen (o «Otra…» para escribir la tuya), el estado, la ubicación actual y las notas. Marca «Abrir primero» si es esencial y «Frágil» si lleva cosas delicadas.",
    tip: "El número C-001, C-002… te lo da la app sola. Puedes cambiarlo desde «Editar caja».",
  },
  {
    title: "Apunta dónde estaba",
    body:
      "Antes de dictar, rellena «¿Dónde estaban estos objetos?» (por ejemplo: estantería del salón). Luego, en la pantalla de revisión, puedes corregirlo objeto por objeto.",
    tip: "Sirve para colocar cada cosa exactamente igual al llegar.",
  },
  {
    title: "Añade los objetos dictando",
    body:
      "Pulsa el botón grande «Dictar objetos» y di los objetos seguidos separándolos con una pausa o con la palabra «y»: «sartén y libro y cargador y rotuladores». Pulsa «Parar y revisar» cuando termines.",
    tip: "Cada «y» cuenta como un objeto nuevo y cada objeto se guarda una sola vez.",
  },
  {
    title: "O escríbelos",
    body:
      "Escribe uno por línea o separados por comas: «2 sartenes, cargador, libro de cocina». Pulsa «Revisar y añadir». También puedes usar el micrófono del teclado del móvil en ese mismo cuadro.",
    tip: "Si dices la cantidad («2 sartenes»), se guarda sola.",
  },
  {
    title: "Revisa y guarda de golpe",
    body:
      "Aparece la lista con cada objeto, su cantidad y su «¿Dónde estaba?». Cambia el nombre, la cantidad o quítalo con la papelera. Cuando esté bien, pulsa «Guardar todo».",
    tip: "Nada se guarda hasta que pulses «Guardar todo».",
  },
  {
    title: "Haz fotos",
    body:
      "Con el botón de cámara de cada objeto guardas una foto de cómo estaba colocado. Con «Fotos de la caja» haces fotos de la caja entera (desde la galería o con la cámara). Toca una miniatura para verla a pantalla completa.",
    tip: "Las fotos se comprimen y se guardan en privado.",
  },
  {
    title: "Marca el estado y la ubicación",
    body:
      "En la ficha de la caja, pulsa el estado que corresponda: Vacía, Llena, Cerrada, Transportada o Desembalada. Cambia la ubicación con «Editar caja» cuando la muevas de sitio.",
  },
  {
    title: "Busca un objeto",
    body:
      "Pulsa «Buscar» y escribe lo que sea (con o sin tildes, con mayúsculas). Te dice el objeto, la cantidad, la caja, la habitación, el estado y la ubicación. Toca el resultado para abrir esa caja.",
  },
  {
    title: "Al desembalar",
    body:
      "Marca la casilla de cada objeto que sacas. Cuando la caja esté vacía, pulsa «Desembalada»: se tacha en la lista para que veas lo que falta.",
  },
  {
    title: "Exportar o imprimir",
    body:
      "En «Exportar» descargas un CSV (se abre en Excel o Google Sheets) o pulsas «Imprimir» para tener una hoja limpia, caja por caja, con casillas para marcar.",
  },
  {
    title: "Instalar en el móvil",
    body:
      "En «Ajustes» tienes las instrucciones para añadirla a la pantalla de inicio: en iPhone, Safari → Compartir → «Añadir a pantalla de inicio»; en Android, el menú ⋮ de Chrome → «Instalar aplicación».",
  },
  {
    title: "Comparte una caja si quieres",
    body:
      "Desde la ficha de la caja puedes compartirla con la persona que elijas, dándole permiso de solo ver, comentar o editar. También puedes enviarla como documento o imprimirla.",
    tip: "Si no compartes nada, nadie más puede ver tus cajas: el acceso solo se da si tú lo decides.",
  },
  {
    title: "Tu espacio es privado",
    body:
      "Nadie tiene acceso a tus cajas, objetos y fotos si tú no se lo das. Puedes quitar el acceso a quien se lo hayas dado en cualquier momento. En «Ajustes» tienes la lista de comprobación de privacidad y el botón para borrar de una vez las fotos que quedaron sueltas al eliminar cajas.",
  },
];

export function HowToHelp({ label = "¿Cómo funciona?" }: { label?: string }) {
  return (
    <Dialog>
      <DialogTrigger className="btn-secondary w-full">
        <HelpCircle className="h-5 w-5" /> {label}
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] w-[94vw] max-w-lg gap-0 overflow-y-auto rounded-xl border-2 border-foreground bg-card p-0 shadow-[6px_6px_0_0_var(--foreground)]">
        <div className="sticky top-0 z-10 border-b-2 border-foreground bg-card px-5 pb-3 pt-5">
          <DialogTitle className="font-display text-3xl font-extrabold">Cómo funciona Muda Fácil</DialogTitle>
          <DialogDescription className="mt-1 text-base">
            Ve los pasos en orden, o salta al que te haga falta.
          </DialogDescription>
        </div>

        <ol className="space-y-4 px-5 py-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-primary font-display text-lg font-extrabold text-primary-foreground">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-xl font-extrabold leading-tight">{s.title}</h3>
                <p className="mt-1 text-base leading-snug">{s.body}</p>
                {s.tip && <p className="mt-1 text-sm font-semibold text-primary">✓ {s.tip}</p>}
              </div>
            </li>
          ))}
        </ol>

        <div className="border-t-2 border-foreground px-5 py-4">
          <p className="mb-3 text-base">
            ¿Te falta algo? Puedes empezar de nuevo en cualquier momento: cada paso se puede repetir.
          </p>
          <DialogClose className="btn-primary w-full">
            <X className="h-5 w-5" /> Entendido
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
