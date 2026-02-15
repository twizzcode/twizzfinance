import type { ParsedTransaction } from "../../types/index.js";

export type ReceiptStage = "awaiting_confirmation" | "awaiting_correction";

export interface PendingReceipt {
  userId: string;
  parsed: ParsedTransaction;
  stage: ReceiptStage;
  createdAt: number;
  sourceMessageId?: number;
}

const receiptState = new Map<string, PendingReceipt>();

function getKey(telegramId: bigint) {
  return telegramId.toString();
}

export function getPendingReceipt(telegramId: bigint) {
  return receiptState.get(getKey(telegramId));
}

export function setPendingReceipt(telegramId: bigint, receipt: PendingReceipt) {
  receiptState.set(getKey(telegramId), receipt);
}

export function clearPendingReceipt(telegramId: bigint) {
  receiptState.delete(getKey(telegramId));
}
