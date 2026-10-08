export type DraftItem = { name: string; quantity: number };

const NUMBERS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20,
};

/** Split free text / dictation into items. Separators: newlines, commas, ";", ".", and the conjunctions "y"/"e". */
export function parseItems(text: string): DraftItem[] {
  return text
    .split(/[\n,;.]+|\s+(?:y|e)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(\d+|[a-záéíóúñ]+)\s+(.+)$/i);
      if (m) {
        const n = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : NUMBERS[m[1].toLowerCase()];
        if (n && n > 0) return { name: cap(m[2]), quantity: n };
      }
      return { name: cap(part), quantity: 1 };
    });
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
