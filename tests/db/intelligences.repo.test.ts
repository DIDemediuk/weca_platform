import { describe, it, expect } from "vitest";
import { openDb } from "../../src/db/index.js";
import { getIntelligence, listIntelligences, updateIntelligence } from "../../src/db/intelligences.repo.js";

describe("intelligences repo", () => {
  it("seeds all 8 and reads one", () => {
    const db = openDb(":memory:");
    expect(listIntelligences(db)).toHaveLength(8);
    expect(getIntelligence(db, "musical").title).toContain("Музичний");
  });
  it("updates a description", () => {
    const db = openDb(":memory:");
    const c = getIntelligence(db, "linguistic");
    updateIntelligence(db, { ...c, tagline: "Новий підпис" });
    expect(getIntelligence(db, "linguistic").tagline).toBe("Новий підпис");
  });
});
