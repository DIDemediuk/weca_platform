import { describe, it, expect } from "vitest";
import { INTELLIGENCE_TYPES } from "../../src/domain/types.js";
import { SEED_INTELLIGENCES } from "../../src/domain/intelligences.seed.js";

describe("intelligence seed", () => {
  it("covers all 8 types with non-empty fields", () => {
    expect(SEED_INTELLIGENCES).toHaveLength(8);
    for (const type of INTELLIGENCE_TYPES) {
      const item = SEED_INTELLIGENCES.find((i) => i.type === type);
      expect(item, `missing ${type}`).toBeDefined();
      expect(item!.title.length).toBeGreaterThan(0);
      expect(item!.strengths.length).toBeGreaterThan(20);
      expect(item!.inCamp.length).toBeGreaterThan(20);
      expect(item!.parentAdvice.length).toBeGreaterThan(20);
    }
  });
  it("every strengths text is personalized with {name} and stays gender-neutral", () => {
    for (const c of SEED_INTELLIGENCES) {
      expect(c.strengths, c.type).toContain("{name}");
      expect(c.strengths, c.type).not.toMatch(/вдумлива|зібрав |проявив |обрала |обрав /);
    }
  });
  it("avoids heavy scientific jargon", () => {
    for (const c of SEED_INTELLIGENCES) {
      expect(c.strengths, c.type).not.toMatch(/Брока|Верніке|кортизол|Default Mode|нейробіолог/i);
    }
  });
});
