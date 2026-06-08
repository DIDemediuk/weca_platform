import { describe, it, expect } from "vitest";
import { renderReportHtml } from "../../src/services/reportTemplate.js";
import { SEED_INTELLIGENCES } from "../../src/domain/intelligences.seed.js";
import type { Report } from "../../src/domain/types.js";

const byType = (t: string) => SEED_INTELLIGENCES.find((i) => i.type === t)!;

const report: Report = {
  id: "abc", childName: "Артем", shift: "3",
  primaryType: "kinesthetic", secondaryType: "interpersonal",
  example: "Капітанство у квесті.", wovenExample: "Оживлений абзац про Артема.",
  photoPath: "file:///uploads/a.jpg", createdAt: new Date().toISOString(),
};

describe("renderReportHtml", () => {
  const html = renderReportHtml({
    report,
    primary: byType("kinesthetic"),
    secondary: byType("interpersonal"),
    radarSvg: "<svg>RADAR</svg>",
  });

  it("shows child name and shift", () => {
    expect(html).toContain("Артем");
    expect(html).toContain("3");
  });
  it("includes chosen type descriptions", () => {
    expect(html).toContain(byType("kinesthetic").title);
    expect(html).toContain(byType("interpersonal").title);
  });
  it("excludes non-chosen type descriptions", () => {
    expect(html).not.toContain(byType("musical").strengths);
    expect(html).not.toContain(byType("linguistic").strengths);
  });
  it("embeds the woven example and the radar", () => {
    expect(html).toContain("Оживлений абзац про Артема.");
    expect(html).toContain("<svg>RADAR</svg>");
  });
  it("escapes html in user content", () => {
    const evil = renderReportHtml({
      report: { ...report, childName: "<b>x</b>" },
      primary: byType("kinesthetic"), radarSvg: "<svg></svg>",
    });
    expect(evil).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
