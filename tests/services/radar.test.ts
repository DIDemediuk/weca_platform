import { describe, it, expect } from "vitest";
import { renderRadarSvg } from "../../src/services/radar.js";

describe("renderRadarSvg", () => {
  it("returns an svg string", () => {
    const svg = renderRadarSvg(["kinesthetic"]);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });
  it("includes all 8 axis labels", () => {
    const svg = renderRadarSvg(["musical", "spatial"]);
    for (const label of ["Лінгв.", "Логіко", "Простор.", "Тілесно", "Музич.", "Міжособ.", "Внутріш.", "Натурал."]) {
      expect(svg).toContain(label);
    }
  });
  it("marks highlighted axes with accent color", () => {
    const accent = "#1FB6A6";
    const svg = renderRadarSvg(["musical"]);
    expect(svg).toContain(accent);
  });
});
