import net from "net";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import dotenv from "dotenv";

dotenv.config();

function isPortListening(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function main() {
  const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:password@127.0.0.1:5432/app_db";
  let pgInstance = null;

  const isLocal = dbUrl.includes("127.0.0.1") || dbUrl.includes("localhost");
  const parsedUrl = new URL(dbUrl);
  const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 5432;
  const dbName = parsedUrl.pathname.replace(/^\//, "") || "app_db";

  if (isLocal) {
    const portActive = await isPortListening(port);
    if (portActive) {
      console.log(`[WorkPulse] Database port ${port} is active. Connecting to existing database server...`);
    } else {
      console.log(`[WorkPulse] Starting local embedded PostgreSQL on port ${port}...`);
      const { default: EmbeddedPostgres } = await import("embedded-postgres");
      const dbDir = path.resolve(process.cwd(), ".db-data");

      const pg = new EmbeddedPostgres({
        databaseDir: dbDir,
        user: "postgres",
        password: "password",
        port,
        persistent: true,
      });

      if (!fs.existsSync(dbDir) || fs.readdirSync(dbDir).length === 0) {
        console.log("[WorkPulse] Initializing new database cluster...");
        await pg.initialise();
      }

      await pg.start();
      pgInstance = pg;

      try {
        await pg.createDatabase(dbName);
      } catch {
        // Database may already exist
      }
      console.log(`[WorkPulse] Embedded PostgreSQL ready on port ${port} (database: ${dbName}).`);
    }
  }

  const isWindows = process.platform === "win32";
  const nextCmd = isWindows ? "npx.cmd" : "npx";
  console.log("[WorkPulse] Starting Next.js development server...");

  const nextProcess = spawn(nextCmd, ["next", "dev"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env },
  });

  const cleanup = async () => {
    if (nextProcess && !nextProcess.killed) {
      nextProcess.kill();
    }
    if (pgInstance) {
      console.log("\n[WorkPulse] Shutting down embedded PostgreSQL...");
      try {
        await pgInstance.stop();
      } catch (err) {
        // Ignore shutdown errors on exit
      }
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  nextProcess.on("exit", (code) => {
    if (pgInstance) {
      pgInstance.stop().finally(() => process.exit(code ?? 0));
    } else {
      process.exit(code ?? 0);
    }
  });
}

main().catch((err) => {
  console.error("[WorkPulse] Fatal error:", err);
  process.exit(1);
});
