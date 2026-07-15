import { describe, it, expect, vi } from "vitest";
import { buildServer } from "../../src/server.js";
import { insertReport } from "../../src/db/reports.repo.js";

vi.mock("../../src/services/pdf.js", () => ({
  renderPdf: vi.fn(async () => Buffer.from("%PDF-1.4 fake")),
  closeBrowser: vi.fn(async () => {}),
  downscalePhoto: vi.fn(async (s: string) => s),
}));
vi.mock("../../src/services/imageSrc.js", () => ({
  imageFileToDataUri: vi.fn(async () => "data:image/jpeg;base64,ZmFrZQ=="),
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

  it("allows 10 generations, then blocks with an upgrade message", async () => {
    const app = buildServer(cfg);
    for (let i = 0; i < 10; i++) {
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

  it("re-downloads a pdf from the archive route", async () => {
    const app = buildServer(cfg);
    insertReport(app.db, {
      id: "r1", childName: "Артем", shift: "3", primaryType: "musical",
      secondaryType: undefined, example: "x", wovenExample: "y", talentBridge: "b",
      photoPath: "/uploads/a.jpg", createdAt: "2026-06-08T10:00:00Z",
    });
    const res = await app.inject({ method: "GET", url: "/f/S/report/r1.pdf" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    await app.close();
  });

  it("rejects archive pdf download with wrong secret", async () => {
    const app = buildServer(cfg);
    insertReport(app.db, {
      id: "r1", childName: "Артем", shift: "3", primaryType: "musical",
      secondaryType: undefined, example: "x", wovenExample: "y", talentBridge: "b",
      photoPath: "/uploads/a.jpg", createdAt: "2026-06-08T10:00:00Z",
    });
    const res = await app.inject({ method: "GET", url: "/f/wrong/report/r1.pdf" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("404s for unknown report id in archive route", async () => {
    const app = buildServer(cfg);
    const res = await app.inject({ method: "GET", url: "/f/S/report/missing.pdf" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("does not log a downloaded event when re-downloading from the archive", async () => {
    const app = buildServer(cfg);
    insertReport(app.db, {
      id: "r1", childName: "Артем", shift: "3", primaryType: "musical",
      secondaryType: undefined, example: "x", wovenExample: "y", talentBridge: "b",
      photoPath: "/uploads/a.jpg", createdAt: "2026-06-08T10:00:00Z",
    });
    await app.inject({ method: "GET", url: "/f/S/report/r1.pdf" });
    const events = app.db.prepare(`SELECT * FROM report_events WHERE report_id = 'r1'`).all();
    expect(events.length).toBe(0);
    await app.close();
  });

  it("includes reports in the form page props for the archive tab", async () => {
    const app = buildServer(cfg);
    insertReport(app.db, {
      id: "r1", childName: "Артем", shift: "3", primaryType: "musical",
      secondaryType: undefined, example: "x", wovenExample: "y", talentBridge: "b",
      photoPath: "/uploads/a.jpg", createdAt: "2026-06-08T10:00:00Z",
    });
    const res = await app.inject({ method: "GET", url: "/f/S" });
    expect(res.body).toContain('"childName":"Артем"');
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
