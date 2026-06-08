import Fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { healthRoutes } from "./routes/health.js";
import { formRoutes } from "./routes/form.routes.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { loadConfig, type Config } from "./config.js";
import { openDb, type DB } from "./db/index.js";

declare module "fastify" {
  interface FastifyInstance {
    appConfig: Config;
    db: DB;
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export function buildServer(config: Config = loadConfig()): FastifyInstance {
  const app = Fastify({ logger: false });
  app.decorate("appConfig", config);
  app.decorate("db", openDb(config.dbPath));
  app.register(multipart, { limits: { fileSize: 12 * 1024 * 1024 } });
  app.register(fastifyStatic, { root: join(__dirname, "public"), prefix: "/static/" });
  app.register(healthRoutes);
  app.register(formRoutes);
  app.register(adminRoutes);
  return app;
}

if (process.argv[1]?.endsWith("server.js") || process.argv[1]?.endsWith("server.ts")) {
  const cfg = loadConfig();
  const app = buildServer(cfg);
  app.listen({ port: cfg.port, host: "0.0.0.0" }).then(() =>
    console.log(`listening on ${cfg.port}`)
  );
}
