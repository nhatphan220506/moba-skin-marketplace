import path from "node:path";

import { notFoundError, validationError } from "@/lib/server/api";
import { sha256 } from "@/lib/server/hashing";
import { readCollection, updateCollection } from "@/lib/server/storage";
import { storeObject } from "@/lib/server/objectStorage";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const FILE_TYPES = new Map<string, { canonical: string; accepted: string[] }>([
  [".png", { canonical: "image/png", accepted: ["image/png"] }],
  [".jpg", { canonical: "image/jpeg", accepted: ["image/jpeg", "image/pjpeg"] }],
  [".jpeg", { canonical: "image/jpeg", accepted: ["image/jpeg", "image/pjpeg"] }],
  [".webp", { canonical: "image/webp", accepted: ["image/webp"] }],
  [".pdf", { canonical: "application/pdf", accepted: ["application/pdf"] }],
  [".json", { canonical: "application/json", accepted: ["application/json", "text/json", "text/plain"] }],
  [".glb", { canonical: "model/gltf-binary", accepted: ["model/gltf-binary", "application/octet-stream"] }],
  [".gltf", { canonical: "model/gltf+json", accepted: ["model/gltf+json", "application/json", "text/plain"] }],
  [".fbx", { canonical: "application/octet-stream", accepted: ["application/octet-stream", "model/vnd.autodesk.fbx"] }],
  [".blend", { canonical: "application/x-blender", accepted: ["application/x-blender", "application/octet-stream"] }],
  [".obj", { canonical: "model/obj", accepted: ["model/obj", "text/plain", "application/octet-stream"] }],
]);

export type FileRecord = {
  fileId: string;
  fileName: string;
  category: string;
  designId: number;
  storageURI: string;
  size: number;
  mimeType: string;
  sha256: `0x${string}`;
  uploadedAt: number;
};

function requireDesignId(value: FormDataEntryValue | null): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw validationError("designId must be a positive integer");
  }
  return parsed;
}

function requireCategory(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !/^[a-z][a-z0-9-]{1,39}$/.test(value)) {
    throw validationError(
      "category must contain 2-40 lowercase letters, numbers, or hyphens",
    );
  }
  return value;
}

function validateFile(file: File): { extension: string; mimeType: string } {
  if (!file.name || file.name.includes("..") || /[\\/]/.test(file.name)) {
    throw validationError("file name contains an unsafe path");
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    throw validationError("file size must be between 1 byte and 50 MiB");
  }

  const extension = path.extname(file.name).toLowerCase();
  const definition = FILE_TYPES.get(extension);
  if (!definition || (file.type && !definition.accepted.includes(file.type))) {
    throw validationError("file type is not allowed", {
      allowedExtensions: [...FILE_TYPES.keys()],
    });
  }
  return { extension, mimeType: file.type || definition.canonical };
}

export async function storeFile(form: FormData): Promise<FileRecord> {
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw validationError("file is required");
  }

  const designId = requireDesignId(form.get("designId"));
  const category = requireCategory(form.get("category"));
  const { extension, mimeType } = validateFile(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const digest = sha256(bytes);
  const fileId = `${category}-${designId}-${digest.slice(2, 14)}`;
  const storedName = `${fileId}${extension}`;
  const storedObject = await storeObject(storedName, bytes, mimeType);
  const record: FileRecord = {
    fileId,
    fileName: file.name,
    category,
    designId,
    storageURI: storedObject.uri,
    size: file.size,
    mimeType,
    sha256: digest,
    uploadedAt: Math.floor(Date.now() / 1000),
  };

  await updateCollection<FileRecord[]>("files", [], (records) => [
    ...records.filter((candidate) => candidate.fileId !== fileId),
    record,
  ]);
  return record;
}

export async function getFileRecord(fileId: string): Promise<FileRecord> {
  if (!/^[a-z0-9-]{3,100}$/.test(fileId)) {
    throw validationError("fileId is invalid");
  }
  const records = await readCollection<FileRecord[]>("files", []);
  const record = records.find((candidate) => candidate.fileId === fileId);
  if (!record) {
    throw notFoundError(`File ${fileId} was not found`);
  }
  return record;
}
