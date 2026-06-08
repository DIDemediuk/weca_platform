import type { DB } from "./index.js";
import type { IntelligenceContent, IntelligenceType } from "../domain/types.js";

interface Row {
  type: string; title: string; tagline: string;
  strengths: string; in_camp: string; parent_advice: string;
}
const toContent = (r: Row): IntelligenceContent => ({
  type: r.type as IntelligenceType,
  title: r.title, tagline: r.tagline, strengths: r.strengths,
  inCamp: r.in_camp, parentAdvice: r.parent_advice,
});

export function getIntelligence(db: DB, type: IntelligenceType): IntelligenceContent {
  const row = db.prepare(`SELECT * FROM intelligences WHERE type = ?`).get(type) as Row | undefined;
  if (!row) throw new Error(`unknown intelligence ${type}`);
  return toContent(row);
}

export function listIntelligences(db: DB): IntelligenceContent[] {
  return (db.prepare(`SELECT * FROM intelligences`).all() as Row[]).map(toContent);
}

export function updateIntelligence(db: DB, c: IntelligenceContent): void {
  db.prepare(
    `UPDATE intelligences SET title=@title, tagline=@tagline, strengths=@strengths,
     in_camp=@inCamp, parent_advice=@parentAdvice WHERE type=@type`
  ).run(c);
}
