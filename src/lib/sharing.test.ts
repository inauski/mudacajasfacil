import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { canEditBox, canComment, canManageBox, safeDestination } from "./sharing";
import { boxDocument } from "./box-document";

describe("permisos de caja", () => {
  it("el lector solo lee", () => { expect(canEditBox("reader")).toBe(false); expect(canComment("reader")).toBe(false); expect(canManageBox("reader")).toBe(false); });
  it("el comentador comenta pero no edita", () => { expect(canComment("commenter")).toBe(true); expect(canEditBox("commenter")).toBe(false); expect(canManageBox("commenter")).toBe(false); });
  it("el editor edita y comenta sin administrar", () => { expect(canEditBox("editor")).toBe(true); expect(canComment("editor")).toBe(true); expect(canManageBox("editor")).toBe(false); });
  it("solo el propietario administra", () => { expect(canManageBox("owner")).toBe(true); expect(canEditBox("owner")).toBe(true); });
  it("un acceso revocado no concede acciones", () => { expect(canEditBox(null)).toBe(false); expect(canComment(null)).toBe(false); expect(canManageBox(null)).toBe(false); });
});

describe("destino de acceso seguro", () => {
  it("conserva una caja local y rechaza destinos externos", () => {
    const path = "/cajas/12345678-1234-1234-1234-123456789012";
    expect(safeDestination(path)).toBe(path);
    for (const path of ["https://evil.test", "//evil.test", "/cajas/../auth", "/cajas?next=https://evil.test"]) expect(safeDestination(path)).toBe("/cajas");
  });
});

describe("documento de una caja", () => {
  it("exporta solo la caja elegida y escapa el contenido del usuario", () => {
    const boxes = [
      { code: "C-001", room: "Cocina", location: "Garaje", status: "llena", notes: '<script>alert(1)</script>', essential: true, fragile: true, items: [{ name: "Sartén", quantity: 2, unpacked: false, origin: "Cajón superior" }] },
      { code: "C-002", room: "Salón", location: "", status: "vacia", notes: "", essential: false, fragile: false, items: [{ name: "Libro privado", quantity: 1, unpacked: false }] },
    ];
    const selected = boxes[0]; if (!selected) throw new Error("Missing fixture");
    const html = boxDocument(selected);
    expect(html).toContain("C-001"); expect(html).toContain("Sartén"); expect(html).toContain("Cajón superior");
    expect(html).not.toContain("C-002"); expect(html).not.toContain("Libro privado"); expect(html).not.toContain("<script>");
  });
});
