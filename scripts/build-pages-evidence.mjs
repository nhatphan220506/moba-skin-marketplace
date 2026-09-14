import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourcePath = path.join(process.cwd(), "data", "indexed-events.json");
const outputDirectory = path.join(process.cwd(), "public");
const outputPath = path.join(outputDirectory, "evidence.json");
const indexed = JSON.parse(await readFile(sourcePath, "utf8"));

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, JSON.stringify({
  source: "sepolia-indexer",
  chainId: indexed.chainId ?? 11155111,
  cursor: indexed.cursor ?? null,
  evidence: indexed.events ?? [],
}, null, 2));

console.log(`Prepared ${indexed.events?.length ?? 0} indexed events for GitHub Pages.`);
