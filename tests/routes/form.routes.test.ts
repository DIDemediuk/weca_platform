import { describe, it, expect, vi } from "vitest";
import { buildServer } from "../../src/server.js";

vi.mock("../../src/services/pdf.js", () => ({
  renderPdf: vi.fn(async () => Buffer.from("%PDF-1.4 fake")),
  closeBrowser: vi.fn(async () => {}),
  downscalePhoto: vi.fn(async (s: string) => s),
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
    const res = await submitReport(app);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.rawPayload.subarray(0, 4).toString("latin1")).toBe("%PDF");
    await app.close();
  });

  it("allows 3 generations, then blocks with an upgrade message", async () => {
    const app = buildServer(cfg);
    for (let i = 0; i < 3; i++) {
      expect((await submitReport(app)).statusCode).toBe(200);
    }
    const res = await submitReport(app);
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain("оновіть свій тарифний план");

    const page = await app.inject({ method: "GET", url: "/f/S" });
    expect(page.body).toContain("оновіть свій тарифний план");
    await app.close();
  });

  it("shows a disabled-access message when access is off", async () => {
    const app = buildServer(cfg);
    app.db.prepare(`UPDATE usage_quota SET access_enabled = 0 WHERE id = 1`).run();
    const res = await submitReport(app);
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain("Доступ до сервісу відключено");
    await app.close();
  });

  it("does not consume attempts in unlimited mode", async () => {
    const app = buildServer(cfg);
    app.db.prepare(`UPDATE usage_quota SET unlimited = 1 WHERE id = 1`).run();
    for (let i = 0; i < 4; i++) {
      expect((await submitReport(app)).statusCode).toBe(200);
    }
    await app.close();
  });
});

async function submitReport(app: ReturnType<typeof buildServer>) {
  const form = new FormData();
  form.set("childName", "Артем");
  form.set("shift", "3");
  form.set("primaryType", "kinesthetic");
  form.set("secondaryType", "");
  form.set("example", "Капітанство у квесті та перемога команди.");
  form.set("photo", new Blob([Buffer.from([0xff, 0xd8, 0xff])], { type: "image/jpeg" }), "a.jpg");
  return app.inject({ method: "POST", url: "/f/S", payload: form as unknown as undefined });
}
