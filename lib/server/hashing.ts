import { createHash } from "node:crypto";

export type HashableContent = string | ArrayBuffer | Uint8Array;

function toBytes(content: HashableContent): Uint8Array {
  if (typeof content === "string") {
    return new TextEncoder().encode(content);
  }

  if (content instanceof ArrayBuffer) {
    return new Uint8Array(content);
  }

  return content;
}

export function sha256(content: HashableContent): `0x${string}` {
  return `0x${createHash("sha256").update(toBytes(content)).digest("hex")}`;
}

function sortForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForHash);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortForHash(entry)]),
    );
  }

  return value;
}

export function hashJson(value: unknown): `0x${string}` {
  return sha256(JSON.stringify(sortForHash(value)));
}
