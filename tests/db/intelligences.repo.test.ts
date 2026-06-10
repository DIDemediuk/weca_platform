import { describe, it, expect } from "vitest";
import { openDb, reapplySeedDefaults } from "../../src/db/index.js";
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
  it("seeds hobbies and professions for every type", () => {
    const db = openDb(":memory:");
    for (const c of listIntelligences(db)) {
      expect(c.hobbies.length).toBeGreaterThan(10);
      expect(c.professions.length).toBeGreaterThan(10);
    }
  });
  it("updates hobbies and professions", () => {
    const db = openDb(":memory:");
    const c = getIntelligence(db, "musical");
    updateIntelligence(db, { ...c, hobbies: "Нове хобі", professions: "Нова професія" });
    expect(getIntelligence(db, "musical").hobbies).toBe("Нове хобі");
    expect(getIntelligence(db, "musical").professions).toBe("Нова професія");
  });
  it("backfills hobbies into an existing db created before the migration", () => {
    const db = openDb(":memory:");
    db.prepare(`UPDATE intelligences SET hobbies = '', professions = '' WHERE type = 'musical'`).run();
    reapplySeedDefaults(db);
    expect(getIntelligence(db, "musical").hobbies.length).toBeGreaterThan(10);
  });
});
