import { describe, it, expect } from "vitest";
import { renderPdf } from "../../src/services/pdf.js";

describe("renderPdf", () => {
  it("produces a non-empty PDF buffer", async () => {
    const buf = await renderPdf("<html><body><h1>Тест</h1></body></html>");
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  }, 60_000);
});
