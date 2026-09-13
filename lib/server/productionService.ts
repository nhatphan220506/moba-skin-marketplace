import { notFoundError, validationError } from "@/lib/server/api";
import { hashJson } from "@/lib/server/hashing";
import { readCollection, updateCollection } from "@/lib/server/storage";

const BASE_TIMESTAMP = 1788948200;

export type ProductionQaStatus =
  | "PENDING"
  | "APPROVED"
  | "REWORK_REQUIRED"
  | "REJECTED";

export type ProductionRecord = {
  designId: number;
  productionStudio: string;
  modelFileURI: string;
  productionHash: `0x${string}`;
  compatibilityHash: `0x${string}`;
  version: string;
  qaStatus: ProductionQaStatus;
  approvedGame: string;
  createdAt: number;
  reviewedAt?: number;
  reviewerAddress?: `0x${string}`;
  reviewNotes?: string;
};

export type CreateProductionInput = Pick<
  ProductionRecord,
  "designId" | "productionStudio" | "modelFileURI" | "approvedGame"
>;

export type ReviewProductionInput = {
  designId: number;
  version: string;
  qaStatus: Exclude<ProductionQaStatus, "PENDING">;
  reviewerAddress: `0x${string}`;
  notes?: string;
};

function validateDesignId(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw validationError("designId must be a positive integer");
  }
}

function validateText(name: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim().length < 2 || value.length > 200) {
    throw validationError(`${name} must contain 2-200 characters`);
  }
}

function validateAddress(value: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw validationError("reviewerAddress must be a 20-byte hexadecimal address");
  }
}

export async function createProductionRecord(
  input: CreateProductionInput,
): Promise<ProductionRecord> {
  validateDesignId(input.designId);
  validateText("productionStudio", input.productionStudio);
  validateText("modelFileURI", input.modelFileURI);
  validateText("approvedGame", input.approvedGame);

  const records = await readCollection<ProductionRecord[]>("productionRecords", []);
  const versionNumber = records.filter((record) => record.designId === input.designId).length + 1;
  const version = `v${versionNumber}`;
  const hashInput = {
    designId: input.designId,
    productionStudio: input.productionStudio,
    modelFileURI: input.modelFileURI,
    approvedGame: input.approvedGame,
    version,
  };
  const record: ProductionRecord = {
    ...input,
    version,
    productionHash: hashJson({ kind: "production", ...hashInput }),
    compatibilityHash: hashJson({ kind: "compatibility", ...hashInput }),
    qaStatus: "PENDING",
    createdAt: BASE_TIMESTAMP + versionNumber,
  };

  await updateCollection<ProductionRecord[]>("productionRecords", [], (current) => [
    ...current,
    record,
  ]);
  return record;
}

export async function reviewProductionRecord(
  input: ReviewProductionInput,
): Promise<ProductionRecord> {
  validateDesignId(input.designId);
  validateAddress(input.reviewerAddress);
  if (!["APPROVED", "REWORK_REQUIRED", "REJECTED"].includes(input.qaStatus)) {
    throw validationError("qaStatus is invalid");
  }
  if (!/^v[1-9][0-9]*$/.test(input.version)) {
    throw validationError("version must use the v1, v2 format");
  }

  let reviewed: ProductionRecord | undefined;
  await updateCollection<ProductionRecord[]>("productionRecords", [], (records) =>
    records.map((record) => {
      if (record.designId !== input.designId || record.version !== input.version) {
        return record;
      }
      reviewed = {
        ...record,
        qaStatus: input.qaStatus,
        reviewerAddress: input.reviewerAddress,
        reviewedAt: BASE_TIMESTAMP + Number(input.version.slice(1)) + 100,
        ...(input.notes ? { reviewNotes: input.notes } : {}),
      };
      return reviewed;
    }),
  );
  if (!reviewed) {
    throw notFoundError(`Production ${input.version} for design ${input.designId} was not found`);
  }
  return reviewed;
}

export async function getProductionRecords(designId: number): Promise<{
  current: ProductionRecord;
  history: ProductionRecord[];
}> {
  validateDesignId(designId);
  const records = (await readCollection<ProductionRecord[]>("productionRecords", [])).filter(
    (record) => record.designId === designId,
  );
  const current = records.at(-1);
  if (!current) {
    throw notFoundError(`Production records for design ${designId} were not found`);
  }
  return { current, history: records };
}
