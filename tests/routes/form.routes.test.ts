import { describe, it, expect, vi } from "vitest";
import { buildServer } from "../../src/server.js";

vi.mock("../../src/services/pdf.js", () => ({
  renderPdf: vi.fn(async () => Buffer.from("%PDF-1.4 fake")),
  closeBrowser: vi.fn(async () => {}),
}));
vi.mock("../../src/services/ai.js", () => ({
  weaveReport: vi.fn(async () => ({
    coverQuote: "Оживлений текст про дитину.",
    talentBridge: "Місток про дитину.",
  })),
}));

const cfg = {
  port: 0, formSecret: "S", adminSecret: "A", deepseekApiKey: "",
  dbPath: ":memory:", uploadDir: "./uploads-test",
};

describe("form routes", () => {
  it("serves the form on correct secret", async () => {
    const app = buildServer(cfg);
    const res = await app.inject({ method: "GET", url: "/f/S" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("Новий звіт");
    await app.close();
  });

  it("rejects wrong secret", async () => {
    const app = buildServer(cfg);
    const res = await app.inject({ method: "GET", url: "/f/wrong" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("generates a pdf on valid submit", async () => {
    const app = buildServer(cfg);
    const form = new FormData();
    form.set("childName", "Артем");
    form.set("shift", "3");
    form.set("primaryType", "kinesthetic");
    form.set("secondaryType", "");
    form.set("example", "Капітанство у квесті та перемога команди.");
    form.set("photo", new Blob([Buffer.from([0xff, 0xd8, 0xff])], { type: "image/jpeg" }), "a.jpg");
    const res = await app.inject({
      method: "POST", url: "/f/S",
      payload: form as unknown as undefined,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.rawPayload.subarray(0, 4).toString("latin1")).toBe("%PDF");
    await app.close();
  });
});
