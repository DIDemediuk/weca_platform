import { describe, it, expect } from "vitest";
import { renderPdf, downscalePhoto } from "../../src/services/pdf.js";

describe("renderPdf", () => {
  it("produces a non-empty PDF buffer", async () => {
    const buf = await renderPdf("<html><body><h1>Тест</h1></body></html>");
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  }, 60_000);
});

describe("downscalePhoto", () => {
  it("re-encodes an oversized image into jpeg", async () => {
    const bigSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="4000"><rect width="3000" height="4000" fill="#e8f1ed"/></svg>`;
    const uri = `data:image/svg+xml;base64,${Buffer.from(bigSvg).toString("base64")}`;
    const out = await downscalePhoto(uri);
    expect(out.startsWith("data:image/jpeg;base64,")).toBe(true);
  }, 60_000);

  it("passes through non-image sources untouched", async () => {
    const out = await downscalePhoto("file:///uploads/a.jpg");
    expect(out).toBe("file:///uploads/a.jpg");
  });
});
