import { describe, it, expect, vi, afterEach } from "vitest";
import { weaveExample } from "../../src/services/ai.js";

const args = {
  childName: "Артем",
  example: "Взяв капітанство у квесті та привів команду до перемоги.",
  primaryTitle: "Тілесно-кінестетичний інтелект",
  secondaryTitle: "Міжособистісний інтелект",
};

afterEach(() => vi.restoreAllMocks());

describe("weaveExample", () => {
  it("falls back when no api key", async () => {
    const out = await weaveExample({ ...args, apiKey: "" });
    expect(out).toContain("Артем");
    expect(out).toContain("капітанство");
  });

  it("returns AI content when api responds", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "Оживлений абзац про Артема." } }] }),
        { status: 200 })
    ));
    const out = await weaveExample({ ...args, apiKey: "key" });
    expect(out).toBe("Оживлений абзац про Артема.");
  });

  it("falls back on http error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("err", { status: 500 })));
    const out = await weaveExample({ ...args, apiKey: "key" });
    expect(out).toContain("капітанство");
  });

  it("falls back on network throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const out = await weaveExample({ ...args, apiKey: "key" });
    expect(out).toContain("Артем");
  });
});
