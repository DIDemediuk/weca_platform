import { z } from "zod";
import { INTELLIGENCE_TYPES } from "./types.js";

const typeEnum = z.enum(INTELLIGENCE_TYPES);

export const reportInputSchema = z
  .object({
    childName: z.string().trim().min(1).max(80),
    shift: z.string().trim().min(1).max(40),
    primaryType: typeEnum,
    secondaryType: typeEnum.optional(),
    example: z.string().trim().min(5).max(3500),
    photoPath: z.string().trim().min(1),
  })
  .refine((d) => d.secondaryType !== d.primaryType, {
    message: "secondaryType must differ from primaryType",
    path: ["secondaryType"],
  });

export type ReportInputParsed = z.infer<typeof reportInputSchema>;
