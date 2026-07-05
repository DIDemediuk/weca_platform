import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { MIGRATIONS } from "./migrations.js";
import { SEED_INTELLIGENCES } from "../domain/intelligences.seed.js";

export type DB = Database.Database;

export function openDb(path: string): DB {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(MIGRATIONS);
  ensureColumn(db, "intelligences", "hobbies", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "intelligences", "professions", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "reports", "talent_bridge", "TEXT NOT NULL DEFAULT ''");
  seedIntelligences(db);
  reapplySeedDefaults(db);
  bumpLegacyQuotaDefault(db);
  return db;
}

const QUOTA_DEFAULT_BUMP_VERSION = 1;

/**
 * Старі БД отримали ліміт 3 до підняття дефолту до 10.
 * Застосовується рівно один раз на файл БД (через PRAGMA user_version),
 * інакше природне зменшення remaining до 3 через реальне використання
 * знову й знову підкидало б лічильник при кожному рестарті сервера.
 */
export function bumpLegacyQuotaDefault(db: DB): void {
  const version = db.pragma("user_version", { simple: true }) as number;
  if (version >= QUOTA_DEFAULT_BUMP_VERSION) return;
  db.prepare(`UPDATE usage_quota SET remaining = 10 WHERE id = 1 AND remaining = 3`).run();
  db.pragma(`user_version = ${QUOTA_DEFAULT_BUMP_VERSION}`);
}

function ensureColumn(db: DB, table: string, column: string, ddl: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}

function seedIntelligences(db: DB) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO intelligences (type, title, tagline, strengths, in_camp, parent_advice, hobbies, professions)
     VALUES (@type, @title, @tagline, @strengths, @inCamp, @parentAdvice, @hobbies, @professions)`
  );
  const tx = db.transaction(() => {
    for (const i of SEED_INTELLIGENCES) insert.run(i);
  });
  tx();
}

/** Існуючі БД отримали нові колонки порожніми — заповнюємо їх із seed, не чіпаючи відредаговані тексти. */
export function reapplySeedDefaults(db: DB): void {
  const update = db.prepare(
    `UPDATE intelligences SET hobbies = @hobbies, professions = @professions
     WHERE type = @type AND hobbies = ''`
  );
  const tx = db.transaction(() => {
    for (const i of SEED_INTELLIGENCES) {
      update.run({ type: i.type, hobbies: i.hobbies, professions: i.professions });
    }
  });
  tx();
}
