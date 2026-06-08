import Fastify, { type FastifyInstance } from "fastify";
import { healthRoutes } from "./routes/health.js";
import { loadConfig } from "./config.js";

export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(healthRoutes);
  return app;
}

if (process.argv[1]?.endsWith("server.js") || process.argv[1]?.endsWith("server.ts")) {
  const cfg = loadConfig();
  const app = buildServer();
  app.listen({ port: cfg.port, host: "0.0.0.0" }).then(() => {
    console.log(`listening on ${cfg.port}`);
  });
}
