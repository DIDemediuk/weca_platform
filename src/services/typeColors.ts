import type { IntelligenceType } from "../domain/types.js";

/** Фірмовий колір кожного типу — однаковий у смужці-«олівцях» хедера та на радар-діаграмі. */
export const TYPE_COLORS: Record<IntelligenceType, string> = {
  linguistic: "#13294B",
  logical: "#FF7A1A",
  spatial: "#FFD166",
  kinesthetic: "#2F8A57",
  musical: "#5BC0EB",
  interpersonal: "#FF7A1A",
  intrapersonal: "#13294B",
  naturalistic: "#2F8A57",
};
