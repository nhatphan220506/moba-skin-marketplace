import path from "node:path";

import { notFoundError, validationError } from "@/lib/server/api";
import { sha256 } from "@/lib/server/hashing";
import { readCollection, updateCollection } from "@/lib/server/storage";
import { storeObject } from "@/lib/server/objectStorage";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const FILE_TYPES = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".pdf", "application/pdf"],
  [".json", "application/json"],
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

function validateFile(file: File): string {
  if (!file.name || file.name.includes("..") || /[\\/]/.test(file.name)) {
    throw validationError("file name contains an unsafe path");
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    throw validationError("file size must be between 1 byte and 10 MiB");
  }

  const extension = path.extname(file.name).toLowerCase();
  const expectedMime = FILE_TYPES.get(extension);
  if (!expectedMime || file.type !== expectedMime) {
    throw validationError("file type is not allowed", {
      allowedExtensions: [...FILE_TYPES.keys()],
    });
  }
  return extension;
}

export async function storeFile(form: FormData): Promise<FileRecord> {
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw validationError("file is required");
  }

  const designId = requireDesignId(form.get("designId"));
  const category = requireCategory(form.get("category"));
  const extension = validateFile(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const digest = sha256(bytes);
  const fileId = `${category}-${designId}-${digest.slice(2, 14)}`;
  const storedName = `${fileId}${extension}`;
  const storedObject = await storeObject(storedName, bytes, file.type);
  const record: FileRecord = {
    fileId,
    fileName: file.name,
    category,
    designId,
    storageURI: storedObject.uri,
    size: file.size,
    mimeType: file.type,
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
