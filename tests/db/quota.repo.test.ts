import { describe, it, expect } from "vitest";
import { openDb, bumpLegacyQuotaDefault } from "../../src/db/index.js";
import {
  getQuota, canGenerate, consumeAttempt, setUnlimited,
  addAttempts, setAccessEnabled, resetQuota,
} from "../../src/db/quota.repo.js";

describe("quota repo", () => {
  it("starts with 10 attempts, no unlimited, access enabled", () => {
    const db = openDb(":memory:");
    expect(getQuota(db)).toEqual({ remaining: 10, unlimited: false, accessEnabled: true });
  });

  it("consumes attempts down to zero and blocks generation", () => {
    const db = openDb(":memory:");
    for (let i = 0; i < 11; i++) consumeAttempt(db);
    const q = getQuota(db);
    expect(q.remaining).toBe(0);
    expect(canGenerate(q)).toBe(false);
  });

  it("unlimited mode does not consume attempts", () => {
    const db = openDb(":memory:");
    setUnlimited(db, true);
    consumeAttempt(db);
    const q = getQuota(db);
    expect(q.remaining).toBe(10);
    expect(canGenerate({ ...q, remaining: 0 })).toBe(true);
  });

  it("adds attempts and ignores invalid amounts", () => {
    const db = openDb(":memory:");
    addAttempts(db, 5);
    expect(getQuota(db).remaining).toBe(15);
    addAttempts(db, -2);
    addAttempts(db, NaN);
    expect(getQuota(db).remaining).toBe(15);
  });

  it("disabled access blocks generation even with attempts left", () => {
    const db = openDb(":memory:");
    setAccessEnabled(db, false);
    expect(canGenerate(getQuota(db))).toBe(false);
    setAccessEnabled(db, true);
    expect(canGenerate(getQuota(db))).toBe(true);
  });

  it("reset restores 10 attempts, disables unlimited, enables access", () => {
    const db = openDb(":memory:");
    setUnlimited(db, true);
    setAccessEnabled(db, false);
    addAttempts(db, 10);
    resetQuota(db);
    expect(getQuota(db)).toEqual({ remaining: 10, unlimited: false, accessEnabled: true });
  });

  it("bumps a legacy default of 3 (from before the limit was raised) up to 10, once", () => {
    const db = openDb(":memory:");
    db.pragma("user_version = 0"); // simulate a DB created before the bump migration existed
    db.prepare(`UPDATE usage_quota SET remaining = 3 WHERE id = 1`).run();
    bumpLegacyQuotaDefault(db);
    expect(getQuota(db).remaining).toBe(10);
  });

  it("does not re-bump remaining back to 10 once the migration already ran", () => {
    const db = openDb(":memory:");
    for (let i = 0; i < 7; i++) consumeAttempt(db); // 10 - 7 = 3, via real usage after the app restarted
    bumpLegacyQuotaDefault(db); // simulates the check that runs on every server start
    expect(getQuota(db).remaining).toBe(3);
  });
});
