require("dotenv/config");

const { spawn } = require("node:child_process");
const path = require("node:path");

const interval = Math.max(8_000, Number(process.env.INDEXER_POLL_INTERVAL_MS || 12_000));
const syncScript = path.join(__dirname, "sync-sepolia.js");
let stopped = false;

function schedule() {
  if (stopped) return;
  const child = spawn(process.execPath, [syncScript], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  child.once("exit", (code) => {
    if (code && !stopped) console.error(`Indexer sync exited with code ${code}; retrying.`);
    if (!stopped) setTimeout(schedule, interval);
  });
}

function stop() {
  stopped = true;
  process.exitCode = 0;
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
console.log(`Sepolia indexer watch active (polling every ${interval / 1_000}s).`);
schedule();
