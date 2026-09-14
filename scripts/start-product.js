require("dotenv/config");

const { spawn } = require("node:child_process");
const path = require("node:path");

const nextBin = require.resolve("next/dist/bin/next");
const watcher = path.join(__dirname, "indexer", "watch-sepolia.js");
const children = [
  spawn(process.execPath, [nextBin, "start", ...process.argv.slice(2)], { cwd: process.cwd(), env: process.env, stdio: "inherit" }),
  spawn(process.execPath, [watcher], { cwd: process.cwd(), env: process.env, stdio: "inherit" }),
];

let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));
for (const child of children) {
  child.once("exit", (code) => {
    if (!stopping && code) process.exitCode = code;
    stop();
  });
}
