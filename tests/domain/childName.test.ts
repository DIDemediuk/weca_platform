import { describe, expect, it } from "vitest";
import { childMentionName } from "../../src/domain/childName.js";

describe("childMentionName", () => {
  it("uses the second word for formal full names", () => {
    expect(childMentionName("Коваль Артем Олегович")).toBe("Артем");
  });

  it("keeps the first word for short name-surname input", () => {
    expect(childMentionName("Артем Коваль")).toBe("Артем");
  });

  it("normalizes extra spaces", () => {
    expect(childMentionName("  Коваль   Артем   Олегович  ")).toBe("Артем");
  });
});
