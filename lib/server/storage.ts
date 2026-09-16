import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { ensureCollectionTable, postgresEnabled, postgresPool } from "@/lib/server/postgres";

export const DATA_FILES = {
  creators: "creators.json",
  designs: "designs.json",
  verificationReports: "verification-reports.json",
  productionRecords: "production-records.json",
  accountLinks: "account-links.json",
  activations: "activations.json",
  files: "files.json",
  productDesigns: "product-designs.json",
  authChallenges: "auth-challenges.json",
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
  if (postgresEnabled()) {
    await ensureCollectionTable();
    const result = await postgresPool().query<{ payload: T }>(
      "SELECT payload FROM collection_store WHERE collection = $1",
      [collection],
    );
    return result.rows[0]?.payload ?? fallback;
  }
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
  if (postgresEnabled()) {
    await ensureCollectionTable();
    await postgresPool().query(
      `INSERT INTO collection_store (collection, payload, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (collection) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
      [collection, JSON.stringify(value)],
    );
    return;
  }
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
  if (postgresEnabled()) {
    await ensureCollectionTable();
    const client = await postgresPool().connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [collection]);
      const result = await client.query<{ payload: T }>("SELECT payload FROM collection_store WHERE collection = $1", [collection]);
      const next = await update(result.rows[0]?.payload ?? fallback);
      await client.query(
        `INSERT INTO collection_store (collection, payload, updated_at)
         VALUES ($1, $2::jsonb, now())
         ON CONFLICT (collection) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
        [collection, JSON.stringify(next)],
      );
      await client.query("COMMIT");
      return next;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
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
