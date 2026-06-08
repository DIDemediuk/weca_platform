import { describe, it, expect } from "vitest";
import { openDb } from "../../src/db/index.js";
import { insertReport, getReport, listReports } from "../../src/db/reports.repo.js";
import type { Report } from "../../src/domain/types.js";

const sample: Report = {
  id: "abc123", childName: "Артем", shift: "3",
  primaryType: "kinesthetic", secondaryType: "interpersonal",
  example: "Капітанство у квесті.", wovenExample: "Оживлений текст.",
  photoPath: "/uploads/a.jpg", createdAt: new Date().toISOString(),
};

describe("reports repo", () => {
  it("inserts and reads back", () => {
    const db = openDb(":memory:");
    insertReport(db, sample);
    expect(getReport(db, "abc123")?.childName).toBe("Артем");
    expect(listReports(db)).toHaveLength(1);
  });
  it("handles missing secondaryType", () => {
    const db = openDb(":memory:");
    insertReport(db, { ...sample, id: "x", secondaryType: undefined });
    expect(getReport(db, "x")?.secondaryType).toBeUndefined();
  });
});
