import { describe, it, expect, vi } from "vitest";
import { openDb } from "../../src/db/index.js";
import { getReport, insertReport } from "../../src/db/reports.repo.js";
import { buildReport, renderReportPdf } from "../../src/services/reportBuilder.js";
import type { ReportInputParsed } from "../../src/domain/validation.js";
import type { Report } from "../../src/domain/types.js";

const input: ReportInputParsed = {
  childName: "Артем", shift: "3", primaryType: "kinesthetic",
  secondaryType: "interpersonal", example: "Капітанство у квесті.",
  photoPath: "/uploads/a.jpg",
};

describe("buildReport", () => {
  it("weaves, persists, and renders a pdf", async () => {
    const db = openDb(":memory:");
    const weave = vi.fn(async () => ({
      coverQuote: "Оживлений текст про Артема.",
      talentBridge: "Місток про Артема.",
    }));
    const render = vi.fn(async () => Buffer.from("%PDF-fake"));
    const result = await buildReport(input, {
      db, deepseekApiKey: "key", weave, render,
      idGen: () => "id123", now: () => new Date("2026-06-08T10:00:00Z"),
      photoToSrc: (p) => `file://${p}`,
    });

    expect(result.report.id).toBe("id123");
    expect(result.report.wovenExample).toBe("Оживлений текст про Артема.");
    expect(result.report.talentBridge).toBe("Місток про Артема.");
    expect(getReport(db, "id123")?.talentBridge).toBe("Місток про Артема.");
    expect(result.pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(getReport(db, "id123")?.childName).toBe("Артем");

    expect(weave).toHaveBeenCalledWith(expect.objectContaining({
      childName: "Артем", primaryTitle: expect.stringContaining("кінестетичний"),
    }));
    expect(render).toHaveBeenCalledWith(expect.stringContaining("Оживлений текст про Артема."));
  });
});

describe("renderReportPdf", () => {
  it("renders a pdf buffer for an existing report", async () => {
    const db = openDb(":memory:");
    const report: Report = {
      id: "r1", childName: "Артем", shift: "3", primaryType: "musical",
      secondaryType: undefined, example: "x", wovenExample: "y", talentBridge: "b",
      photoPath: "/uploads/a.jpg", createdAt: "2026-06-08T10:00:00Z",
    };
    insertReport(db, report);
    const render = vi.fn(async () => Buffer.from("%PDF-1.4 fake"));
    const pdf = await renderReportPdf(db, report, { render, photoToSrc: (p) => `file://${p}` });
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(render).toHaveBeenCalled();
  });
});
