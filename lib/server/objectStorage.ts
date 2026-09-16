import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredObject = { uri: string; provider: "ipfs" | "supabase" | "local" };

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const token = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "private-design-evidence";
  return url && token ? { url, token, bucket } : null;
}

export async function storeObject(name: string, bytes: Uint8Array, mimeType: string): Promise<StoredObject> {
  const supabase = supabaseConfig();
  if (supabase) {
    const response = await fetch(`${supabase.url}/storage/v1/object/${encodeURIComponent(supabase.bucket)}/${encodeURIComponent(name)}`, {
      method: "POST",
      headers: { apikey: supabase.token, authorization: `Bearer ${supabase.token}`, "content-type": mimeType, "x-upsert": "true" },
      body: Uint8Array.from(bytes),
    });
    if (!response.ok) throw new Error(`Supabase Storage upload failed with HTTP ${response.status}`);
    return { uri: `supabase://${supabase.bucket}/${name}`, provider: "supabase" };
  }
  const pinningUrl = process.env.IPFS_PINNING_URL;
  const token = process.env.IPFS_PINNING_TOKEN;
  if (pinningUrl && token) {
    const body = new FormData();
    body.append("file", new Blob([Uint8Array.from(bytes).buffer], { type: mimeType }), name);
    const response = await fetch(pinningUrl, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
    if (!response.ok) throw new Error(`IPFS upload failed with HTTP ${response.status}`);
    const payload = await response.json() as { IpfsHash?: string; cid?: string; value?: { cid?: string } };
    const cid = payload.IpfsHash || payload.cid || payload.value?.cid;
    if (!cid) throw new Error("IPFS provider response did not include a CID");
    return { uri: `ipfs://${cid}`, provider: "ipfs" };
  }

  const directory = path.resolve(process.cwd(), "uploads");
  const target = path.resolve(directory, name);
  if (path.dirname(target) !== directory) throw new Error("Object path resolved outside upload directory");
  await mkdir(directory, { recursive: true });
  await writeFile(target, bytes);
  return { uri: `/uploads/${name}`, provider: "local" };
}

export async function readSupabaseObject(uri: string): Promise<Response> {
  const supabase = supabaseConfig();
  if (!supabase) throw new Error("Supabase Storage is not configured");
  const match = /^supabase:\/\/([^/]+)\/(.+)$/.exec(uri);
  if (!match) throw new Error("Supabase object URI is invalid");
  const [, bucket, objectName] = match;
  const response = await fetch(`${supabase.url}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${objectName.split("/").map(encodeURIComponent).join("/")}`, {
    headers: { apikey: supabase.token, authorization: `Bearer ${supabase.token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase Storage read failed with HTTP ${response.status}`);
  return response;
}
