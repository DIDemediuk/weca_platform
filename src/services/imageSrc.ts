import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function imageFileToDataUri(path: string): Promise<string> {
  const data = await readFile(path);
  const mime = MIME_BY_EXT[extname(path).toLowerCase()] ?? "image/jpeg";
  return `data:${mime};base64,${data.toString("base64")}`;
}
