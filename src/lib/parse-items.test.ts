import { describe, expect, it } from "vitest";
import { parseItems } from "./parse-items";

describe("parseItems", () => {
  it("splits dictation by commas and 'y' and reads number words", () => {
    expect(parseItems("cargador del portátil, dos sartenes y libro de cocina")).toEqual([
      { name: "Cargador del portátil", quantity: 1 },
      { name: "Sartenes", quantity: 2 },
      { name: "Libro de cocina", quantity: 1 },
    ]);
  });
  it("splits by lines and reads digits", () => {
    expect(parseItems("3 tazas\nlámpara")).toEqual([
      { name: "Tazas", quantity: 3 },
      { name: "Lámpara", quantity: 1 },
    ]);
  });
  it("defaults quantity to 1", () => {
    expect(parseItems("una manta")[0]?.quantity).toBe(1);
    expect(parseItems("toallas")[0]?.quantity).toBe(1);
  });
});
