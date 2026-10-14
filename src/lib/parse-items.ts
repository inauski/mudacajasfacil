export type DraftItem = { name: string; quantity: number; origin?: string };

const NUMBERS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20,
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/** Split free text / dictation into items. Separators: newlines, commas, ";", ".", and the conjunctions "y"/"e". Repeated names are merged once. */
export function parseItems(text: string): DraftItem[] {
  const out: DraftItem[] = [];
  const seen = new Set<string>();
  text
    .split(/[\n,;.]+|\s+(?:y|e)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((part) => {
      let item: DraftItem = { name: cap(part), quantity: 1 };
      const m = part.match(/^(\d+|[a-záéíóúñ]+)\s+(.+)$/i);
      if (m && m[1] && m[2]) {
        const w = m[1];
        const n = /^\d+$/.test(w) ? parseInt(w, 10) : NUMBERS[w.toLowerCase()];
        if (n && n > 0) item = { name: cap(m[2]), quantity: n };
      }
      const k = norm(item.name);
      if (seen.has(k)) return;
      seen.add(k);
      out.push(item);
    });
  return out;
}

/**
 * Merge speech-recognition final chunks. Some mobile browsers resend the whole
 * phrase so far as each new final ("sartén", "sartén y libro"…); keep only the
 * longest version so nothing is added twice.
 */
export function mergeTranscripts(chunks: string[]): string {
  const kept: string[] = [];
  for (const raw of chunks) {
    const c = raw.trim();
    if (!c) continue;
    const last = kept[kept.length - 1];
    if (last !== undefined) {
      const a = norm(last), b = norm(c);
      if (b.startsWith(a)) { kept[kept.length - 1] = c; continue; }
      if (a.startsWith(b) || a === b) continue;
    }
    kept.push(c);
  }
  return kept.join(", ");
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
