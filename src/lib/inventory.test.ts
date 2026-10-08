import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { normalize, toCSV } from "./inventory";

describe("search normalization", () => {
  it("ignores accents and case", () => {
    expect(normalize("Lámpara GRANDE")).toBe("lampara grande");
    expect(normalize("Sartén").includes(normalize("sarten"))).toBe(true);
  });
});

describe("CSV export", () => {
  it("has BOM, header and one row per item", () => {
    const csv = toCSV([{ id: "1", code: "C-001", number: 1, room: "Cocina", status: "llena", location: "", notes: "", essential: true, fragile: false,
      items: [{ id: "a", name: "Sartén", quantity: 2, unpacked: false }] }]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("C-001;Cocina;Llena;;Sí;No;Sartén;2;No");
  });
});
