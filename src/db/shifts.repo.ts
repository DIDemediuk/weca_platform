import type { DB } from "./index.js";

export function listShifts(db: DB): string[] {
  return (db.prepare(`SELECT name FROM shifts ORDER BY name`).all() as { name: string }[])
    .map((r) => r.name);
}
export function addShift(db: DB, name: string): void {
  db.prepare(`INSERT OR IGNORE INTO shifts (name) VALUES (?)`).run(name.trim());
}
