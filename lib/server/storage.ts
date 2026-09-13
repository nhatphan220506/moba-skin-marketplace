import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const DATA_FILES = {
  creators: "creators.json",
  designs: "designs.json",
  verificationReports: "verification-reports.json",
  productionRecords: "production-records.json",
  accountLinks: "account-links.json",
  activations: "activations.json",
  files: "files.json",
} as const;

export type DataCollection = keyof typeof DATA_FILES;

function dataDirectory(): string {
  return path.resolve(process.cwd(), "data");
}

function collectionPath(collection: DataCollection): string {
  const directory = dataDirectory();
  const target = path.resolve(directory, DATA_FILES[collection]);

  if (path.dirname(target) !== directory) {
    throw new Error("Data collection resolved outside the data directory");
  }

  return target;
}

function seedPath(collection: DataCollection): string {
  const directory = path.resolve(dataDirectory(), "seeds");
  const target = path.resolve(directory, DATA_FILES[collection]);

  if (path.dirname(target) !== directory) {
    throw new Error("Seed collection resolved outside the seed directory");
  }

  return target;
}

export async function readCollection<T>(
  collection: DataCollection,
  fallback: T,
): Promise<T> {
  try {
    const contents = await readFile(collectionPath(collection), "utf8");
    return JSON.parse(contents) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export async function writeCollection<T>(
  collection: DataCollection,
  value: T,
): Promise<void> {
  const directory = dataDirectory();
  const target = collectionPath(collection);
  const temporary = `${target}.${process.pid}.tmp`;

  await mkdir(directory, { recursive: true });
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}

export async function updateCollection<T>(
  collection: DataCollection,
  fallback: T,
  update: (current: T) => T | Promise<T>,
): Promise<T> {
  const current = await readCollection(collection, fallback);
  const next = await update(current);
  await writeCollection(collection, next);
  return next;
}

export async function resetCollection<T>(
  collection: DataCollection,
  seed?: T,
): Promise<T> {
  const value =
    seed ??
    (JSON.parse(await readFile(seedPath(collection), "utf8")) as T);
  await writeCollection(collection, value);
  return value;
}

export async function resetAllCollections(): Promise<void> {
  for (const collection of Object.keys(DATA_FILES) as DataCollection[]) {
    await resetCollection(collection);
  }
}
