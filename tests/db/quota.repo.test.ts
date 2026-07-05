import { describe, it, expect } from "vitest";
import { openDb } from "../../src/db/index.js";
import {
  getQuota, canGenerate, consumeAttempt, setUnlimited,
  addAttempts, setAccessEnabled, resetQuota,
} from "../../src/db/quota.repo.js";

describe("quota repo", () => {
  it("starts with 3 attempts, no unlimited, access enabled", () => {
    const db = openDb(":memory:");
    expect(getQuota(db)).toEqual({ remaining: 3, unlimited: false, accessEnabled: true });
  });

  it("consumes attempts down to zero and blocks generation", () => {
    const db = openDb(":memory:");
    consumeAttempt(db);
    consumeAttempt(db);
    consumeAttempt(db);
    consumeAttempt(db);
    const q = getQuota(db);
    expect(q.remaining).toBe(0);
    expect(canGenerate(q)).toBe(false);
  });

  it("unlimited mode does not consume attempts", () => {
    const db = openDb(":memory:");
    setUnlimited(db, true);
    consumeAttempt(db);
    const q = getQuota(db);
    expect(q.remaining).toBe(3);
    expect(canGenerate({ ...q, remaining: 0 })).toBe(true);
  });

  it("adds attempts and ignores invalid amounts", () => {
    const db = openDb(":memory:");
    addAttempts(db, 5);
    expect(getQuota(db).remaining).toBe(8);
    addAttempts(db, -2);
    addAttempts(db, NaN);
    expect(getQuota(db).remaining).toBe(8);
  });

  it("disabled access blocks generation even with attempts left", () => {
    const db = openDb(":memory:");
    setAccessEnabled(db, false);
    expect(canGenerate(getQuota(db))).toBe(false);
    setAccessEnabled(db, true);
    expect(canGenerate(getQuota(db))).toBe(true);
  });

  it("reset restores 3 attempts, disables unlimited, enables access", () => {
    const db = openDb(":memory:");
    setUnlimited(db, true);
    setAccessEnabled(db, false);
    addAttempts(db, 10);
    resetQuota(db);
    expect(getQuota(db)).toEqual({ remaining: 3, unlimited: false, accessEnabled: true });
  });
});
