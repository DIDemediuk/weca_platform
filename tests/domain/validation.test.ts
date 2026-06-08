import { describe, it, expect } from "vitest";
import { reportInputSchema } from "../../src/domain/validation.js";

const base = {
  childName: "Артем",
  shift: "3",
  primaryType: "kinesthetic",
  example: "Взяв капітанство у квесті та привів команду до перемоги.",
  photoPath: "/uploads/a.jpg",
};

describe("reportInputSchema", () => {
  it("accepts valid input", () => {
    expect(reportInputSchema.parse(base).primaryType).toBe("kinesthetic");
  });
  it("accepts optional secondaryType", () => {
    const r = reportInputSchema.parse({ ...base, secondaryType: "interpersonal" });
    expect(r.secondaryType).toBe("interpersonal");
  });
  it("rejects empty childName", () => {
    expect(() => reportInputSchema.parse({ ...base, childName: "" })).toThrow();
  });
  it("rejects unknown intelligence type", () => {
    expect(() => reportInputSchema.parse({ ...base, primaryType: "telepathy" })).toThrow();
  });
  it("rejects secondary equal to primary", () => {
    expect(() =>
      reportInputSchema.parse({ ...base, secondaryType: "kinesthetic" })
    ).toThrow();
  });
});
