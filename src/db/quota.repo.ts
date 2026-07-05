import type { DB } from "./index.js";

export const DEFAULT_ATTEMPTS = 3;

export interface Quota {
  remaining: number;
  unlimited: boolean;
  accessEnabled: boolean;
}

interface Row {
  remaining: number;
  unlimited: number;
  access_enabled: number;
}

export function getQuota(db: DB): Quota {
  const row = db.prepare(`SELECT remaining, unlimited, access_enabled FROM usage_quota WHERE id = 1`).get() as Row;
  return { remaining: row.remaining, unlimited: row.unlimited === 1, accessEnabled: row.access_enabled === 1 };
}

export function canGenerate(q: Quota): boolean {
  return q.accessEnabled && (q.unlimited || q.remaining > 0);
}

/** Списує одну спробу після успішної генерації (безліміт не витрачається). */
export function consumeAttempt(db: DB): void {
  db.prepare(`UPDATE usage_quota SET remaining = MAX(remaining - 1, 0) WHERE id = 1 AND unlimited = 0`).run();
}

export function setUnlimited(db: DB, on: boolean): void {
  db.prepare(`UPDATE usage_quota SET unlimited = ? WHERE id = 1`).run(on ? 1 : 0);
}

export function addAttempts(db: DB, n: number): void {
  if (!Number.isFinite(n) || n <= 0) return;
  db.prepare(`UPDATE usage_quota SET remaining = remaining + ? WHERE id = 1`).run(Math.floor(n));
}

export function setAccessEnabled(db: DB, on: boolean): void {
  db.prepare(`UPDATE usage_quota SET access_enabled = ? WHERE id = 1`).run(on ? 1 : 0);
}

/** Повне скидання: 3 спроби, безліміт вимкнено, доступ увімкнено. */
export function resetQuota(db: DB): void {
  db.prepare(`UPDATE usage_quota SET remaining = ?, unlimited = 0, access_enabled = 1 WHERE id = 1`).run(DEFAULT_ATTEMPTS);
}
