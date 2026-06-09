import { describe, it, expect } from "vitest";
import { renderRadarSvg } from "../../src/services/radar.js";

describe("renderRadarSvg", () => {
  it("returns an svg string", () => {
    const svg = renderRadarSvg(["kinesthetic"]);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });
  it("includes all 8 intelligence type labels", () => {
    const svg = renderRadarSvg(["musical", "spatial"]);
    for (const label of ["Лінгвістичний", "Просторовий", "Музичний", "Натуралістичний"]) {
      expect(svg).toContain(label);
    }
  });
  it("marks highlighted axes with accent color", () => {
    const accent = "#1FB6A6";
    const svg = renderRadarSvg(["musical"]);
    expect(svg).toContain(accent);
  });
});
