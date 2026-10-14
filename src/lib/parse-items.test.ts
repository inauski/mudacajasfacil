import { describe, expect, it } from "vitest";
import { mergeTranscripts, parseItems } from "./parse-items";

describe("parseItems", () => {
  it("splits dictation by commas and 'y' and reads number words", () => {
    expect(parseItems("cargador del portátil, dos sartenes y libro de cocina")).toEqual([
      { name: "Cargador del portátil", quantity: 1 },
      { name: "Sartenes", quantity: 2 },
      { name: "Libro de cocina", quantity: 1 },
    ]);
  });
  it("each 'y' starts a new item", () => {
    expect(parseItems("sartén y libro y cargador y rotuladores").map((i) => i.name)).toEqual(["Sartén", "Libro", "Cargador", "Rotuladores"]);
  });
  it("adds a repeated item only once", () => {
    expect(parseItems("sartén, Sarten, libro").map((i) => i.name)).toEqual(["Sartén", "Libro"]);
  });
  it("splits by lines and reads digits", () => {
    expect(parseItems("3 tazas\nlámpara")).toEqual([
      { name: "Tazas", quantity: 3 },
      { name: "Lámpara", quantity: 1 },
    ]);
  });
  it("defaults quantity to 1", () => {
    expect(parseItems("una manta")[0]?.quantity).toBe(1);
  });
});

describe("mergeTranscripts", () => {
  it("drops cumulative repeats from the browser", () => {
    const t = mergeTranscripts(["sartén", "sartén y libro", "sartén y libro y cargador"]);
    expect(parseItems(t).map((i) => i.name)).toEqual(["Sartén", "Libro", "Cargador"]);
  });
  it("keeps separate chunks", () => {
    expect(mergeTranscripts(["sartén", "libro"])).toBe("sartén, libro");
  });
});
