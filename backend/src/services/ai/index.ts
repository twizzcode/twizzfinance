import type { ParsedTransaction } from "../../types/index.js";
import { parseTransaction as parseWithGemini, parseReceiptTransaction, reviseReceiptTransaction, generateResponse } from "./parser.js";

/**
 * Parse transaction using Gemini
 */
export async function parseTransaction(input: string): Promise<ParsedTransaction | null> {
  return parseWithGemini(input);
}

export { parseReceiptTransaction };
export { reviseReceiptTransaction };

// Re-export generateResponse
export { generateResponse };
