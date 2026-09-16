import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { routeError } from "@/lib/server/api";
import { getFileRecord } from "@/lib/server/fileService";
import { listDesignLifecycles } from "@/lib/server/designService";
import { readSupabaseObject } from "@/lib/server/objectStorage";

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await params; const record = await getFileRecord(fileId);
    const lifecycle = (await listDesignLifecycles()).find(candidate => candidate.fileId === fileId);
    if (!lifecycle?.public) return NextResponse.json({ code: "FORBIDDEN", message: "This source file is private until the design is market ready", recoverable: false }, { status: 403 });
    if (record.storageURI.startsWith("ipfs://")) return NextResponse.redirect(`https://ipfs.io/ipfs/${record.storageURI.slice(7)}`);
    if (record.storageURI.startsWith("supabase://")) {
      const stored = await readSupabaseObject(record.storageURI);
      return new NextResponse(stored.body, { headers: { "content-type": record.mimeType, "cache-control": "private, max-age=300", "x-content-type-options": "nosniff" } });
    }
    const directory = path.resolve(process.cwd(), "uploads");
    const target = path.resolve(process.cwd(), record.storageURI.replace(/^\//, ""));
    if (path.dirname(target) !== directory) throw new Error("Stored file resolved outside upload directory");
    return new NextResponse(await readFile(target), { headers: { "content-type": record.mimeType, "cache-control": "private, max-age=300", "x-content-type-options": "nosniff" } });
  } catch (error) { return routeError(error); }
}
