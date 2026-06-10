export const INTELLIGENCE_TYPES = [
  "linguistic",
  "logical",
  "spatial",
  "kinesthetic",
  "musical",
  "interpersonal",
  "intrapersonal",
  "naturalistic",
] as const;

export type IntelligenceType = (typeof INTELLIGENCE_TYPES)[number];

export interface IntelligenceContent {
  type: IntelligenceType;
  title: string;        // Ukrainian display name
  tagline: string;      // one warm line
  strengths: string;    // paragraph; may contain {name} placeholder
  inCamp: string;       // how it shows in camp
  parentAdvice: string; // how to support at home
  hobbies: string;      // hobbies that grow this intelligence
  professions: string;  // future professions that fit
}

export interface ReportInput {
  childName: string;
  shift: string;
  primaryType: IntelligenceType;
  secondaryType?: IntelligenceType;
  example: string;       // leader's live example
  photoPath: string;     // stored photo path
}

export interface Report extends ReportInput {
  id: string;
  wovenExample: string;  // AI (or fallback) prose
  createdAt: string;     // ISO
}
