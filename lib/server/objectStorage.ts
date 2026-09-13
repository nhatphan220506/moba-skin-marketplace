import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredObject = { uri: string; provider: "ipfs" | "local" };

export async function storeObject(name: string, bytes: Uint8Array, mimeType: string): Promise<StoredObject> {
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
