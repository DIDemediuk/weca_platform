import { describe, it, expect } from "vitest";
import { renderReportHtml } from "../../src/services/reportTemplate.js";
import { SEED_INTELLIGENCES } from "../../src/domain/intelligences.seed.js";
import type { Report } from "../../src/domain/types.js";

const byType = (t: string) => SEED_INTELLIGENCES.find((i) => i.type === t)!;

const report: Report = {
  id: "abc", childName: "Артем", shift: "3",
  primaryType: "kinesthetic", secondaryType: "interpersonal",
  example: "Капітанство у квесті.", wovenExample: "Оживлений абзац про Артема.",
  talentBridge: "Місток про Артема.",
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
  it("renders the talent strip on every page", () => {
    const count = html.split('class="talent-strip"').length - 1;
    expect(count).toBe(4);
  });
  it("sizes segments by talent: primary 3x, secondary 2x, rest 1x", () => {
    expect(html).toContain('data-type="kinesthetic" style="flex:3');
    expect(html).toContain('data-type="interpersonal" style="flex:2');
    expect(html).toContain('data-type="musical" style="flex:1');
    expect(html).toContain('data-type="naturalistic" style="flex:1');
  });
  it("renders one long segment when secondary type is missing", () => {
    const solo = renderReportHtml({
      report: { ...report, secondaryType: undefined },
      primary: byType("kinesthetic"),
      radarSvg: "<svg></svg>",
    });
    expect(solo).toContain('data-type="kinesthetic" style="flex:3');
    expect(solo).toContain('data-type="interpersonal" style="flex:1');
  });
  it("uses no heavy gradients on page backgrounds (PDF scroll performance)", () => {
    expect(html).not.toMatch(/linear-gradient\(\s*90deg/);
    expect(html).not.toContain("linear-gradient(180deg");
    expect(html).not.toContain(".page::after");
    expect(html).not.toContain("rgba(");
  });
  it("renders four pages", () => {
    expect(html.split('<section class="page').length - 1).toBe(4);
  });
  it("shows the intro letter after the radar chart", () => {
    expect(html).toContain("Шановні батьки");
    expect(html.indexOf("Шановні батьки")).toBeGreaterThan(html.indexOf("<svg>RADAR</svg>"));
  });
  it("substitutes the child name into descriptions", () => {
    expect(html).not.toContain("{name}");
    expect(html).toContain("Артем пізнає світ через рух");
  });
  it("renders the talent bridge on the primary talent page", () => {
    expect(html).toContain("Місток про Артема.");
  });
  it("shows hobbies and professions for both talents", () => {
    expect(html).toContain("Хобі, які розвивають");
    expect(html).toContain("Професії майбутнього");
    expect(html).toContain(byType("kinesthetic").hobbies);
    expect(html).toContain(byType("interpersonal").professions);
  });
  it("does not duplicate parent advice", () => {
    const advice = byType("kinesthetic").parentAdvice;
    expect(html.split(advice).length - 1).toBe(1);
  });
});
