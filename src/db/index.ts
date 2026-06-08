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
  seedIntelligences(db);
  return db;
}

function seedIntelligences(db: DB) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO intelligences (type, title, tagline, strengths, in_camp, parent_advice)
     VALUES (@type, @title, @tagline, @strengths, @inCamp, @parentAdvice)`
  );
  const tx = db.transaction(() => {
    for (const i of SEED_INTELLIGENCES) insert.run(i);
  });
  tx();
}
