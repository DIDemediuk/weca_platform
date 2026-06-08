export interface Config {
  port: number;
  formSecret: string;
  adminSecret: string;
  deepseekApiKey: string;
  dbPath: string;
  uploadDir: string;
}

export function loadConfig(env = process.env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    formSecret: env.FORM_SECRET ?? "changeme-form",
    adminSecret: env.ADMIN_SECRET ?? "changeme-admin",
    deepseekApiKey: env.DEEPSEEK_API_KEY ?? "",
    dbPath: env.DB_PATH ?? "./data/app.sqlite",
    uploadDir: env.UPLOAD_DIR ?? "./uploads",
  };
}
