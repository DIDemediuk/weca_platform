import { describe, expect, it } from "vitest";
import { INTELLIGENCE_KNOWLEDGE, knowledgeSummary } from "../../src/domain/intelligenceKnowledge.js";
import { INTELLIGENCE_TYPES } from "../../src/domain/types.js";

describe("intelligence knowledge", () => {
  it("covers all types with useful context", () => {
    for (const type of INTELLIGENCE_TYPES) {
      const item = INTELLIGENCE_KNOWLEDGE[type];
      expect(item, `missing ${type}`).toBeDefined();
      expect(item.essence.length).toBeGreaterThan(60);
      expect(item.campSignals.length).toBeGreaterThanOrEqual(3);
      expect(item.homeIdeas.length).toBeGreaterThanOrEqual(3);
      expect(item.hobbies.length).toBeGreaterThanOrEqual(5);
      expect(item.futureRoles.length).toBeGreaterThanOrEqual(5);
      expect(knowledgeSummary(type)).toContain("Теплий кут подачі");
    }
  });
});
