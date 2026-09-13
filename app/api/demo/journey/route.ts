import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const journeyPath = path.join(process.cwd(), "scripts", "demo", ".state", "journey.json");
let activeRun: Promise<{ stdout: string; stderr: string }> | null = null;

async function loadJourney() {
  try { return JSON.parse(await readFile(journeyPath, "utf8")); }
  catch { return null; }
}

export async function GET() {
  return NextResponse.json({ journey: await loadJourney(), running: activeRun !== null });
}

export async function POST() {
  if (activeRun) return NextResponse.json({ code: "JOURNEY_ALREADY_RUNNING", message: "The deterministic journey is already running.", recoverable: true }, { status: 409 });
  activeRun = execFileAsync(process.execPath, [path.join(process.cwd(), "node_modules", "hardhat", "internal", "cli", "cli.js"), "run", "scripts/demo/runFullJourney.js"],
    { cwd: process.cwd(), timeout: 180_000, env: { ...process.env, KAT_API_BASE_URL: "http://127.0.0.1:3000" }, maxBuffer: 2_000_000 });
  try {
    const output = await activeRun;
    return NextResponse.json({ result: "PASS", journey: await loadJourney(), stdout: output.stdout.trim(), stderr: output.stderr.trim() });
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    return NextResponse.json({ code: "JOURNEY_FAILED", message: failure.message, recoverable: true,
      stdout: failure.stdout, stderr: failure.stderr, journey: await loadJourney() }, { status: 500 });
  } finally { activeRun = null; }
}
