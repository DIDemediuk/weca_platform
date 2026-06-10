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
  it("paints the profile in the primary type's header color", () => {
    const svg = renderRadarSvg(["musical"]);
    expect(svg).toContain('stroke="#5BC0EB"'); // musical = sky, як у смужці хедера
    expect(svg).not.toContain("#1FB6A6");
  });
  it("marks each highlighted axis with its own header color", () => {
    const svg = renderRadarSvg(["kinesthetic", "intrapersonal"]);
    expect(svg).toContain('stroke="#2F8A57"'); // полігон у кольорі головного (green)
    expect(svg).toContain('fill="#13294B"');   // вершина другого типу (navy)
  });
});
