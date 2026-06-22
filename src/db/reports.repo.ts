import type { DB } from "./index.js";
import type { Report } from "../domain/types.js";

export type ReportEventType = "created" | "downloaded";

export interface ReportEvent {
  id: number;
  reportId: string;
  childName: string;
  shift: string;
  primaryType: string;
  secondaryType: string | null;
  eventType: ReportEventType;
  occurredAt: string;
}

interface Row {
  id: string; child_name: string; shift: string; primary_type: string;
  secondary_type: string | null; example: string; woven_example: string;
  talent_bridge: string; photo_path: string; created_at: string;
}
const toReport = (r: Row): Report => ({
  id: r.id, childName: r.child_name, shift: r.shift,
  primaryType: r.primary_type as Report["primaryType"],
  secondaryType: (r.secondary_type ?? undefined) as Report["secondaryType"],
  example: r.example, wovenExample: r.woven_example,
  talentBridge: r.talent_bridge,
  photoPath: r.photo_path, createdAt: r.created_at,
});

export function insertReport(db: DB, r: Report): void {
  db.prepare(
    `INSERT INTO reports (id, child_name, shift, primary_type, secondary_type,
      example, woven_example, talent_bridge, photo_path, created_at)
     VALUES (@id, @childName, @shift, @primaryType, @secondaryType,
      @example, @wovenExample, @talentBridge, @photoPath, @createdAt)`
  ).run({ ...r, secondaryType: r.secondaryType ?? null });
}

export function getReport(db: DB, id: string): Report | undefined {
  const row = db.prepare(`SELECT * FROM reports WHERE id = ?`).get(id) as Row | undefined;
  return row ? toReport(row) : undefined;
}

export function listReports(db: DB): Report[] {
  return (db.prepare(`SELECT * FROM reports ORDER BY created_at DESC`).all() as Row[]).map(toReport);
}

export function logReportEvent(db: DB, reportId: string, eventType: ReportEventType): void {
  db.prepare(
    `INSERT INTO report_events (report_id, event_type, occurred_at) VALUES (?, ?, ?)`
  ).run(reportId, eventType, new Date().toISOString());
}

export function listReportEvents(db: DB): ReportEvent[] {
  return (db.prepare(`
    SELECT e.id, e.report_id, r.child_name, r.shift, r.primary_type, r.secondary_type,
           e.event_type, e.occurred_at
    FROM report_events e
    JOIN reports r ON r.id = e.report_id
    ORDER BY e.occurred_at DESC
    LIMIT 200
  `).all() as Array<{
    id: number; report_id: string; child_name: string; shift: string;
    primary_type: string; secondary_type: string | null;
    event_type: string; occurred_at: string;
  }>).map(row => ({
    id: row.id,
    reportId: row.report_id,
    childName: row.child_name,
    shift: row.shift,
    primaryType: row.primary_type,
    secondaryType: row.secondary_type,
    eventType: row.event_type as ReportEventType,
    occurredAt: row.occurred_at,
  }));
}
