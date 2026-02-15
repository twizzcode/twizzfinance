const transactionByMessage = new Map<string, string>();
const messageByTransaction = new Map<string, string>();

function makeKey(telegramId: bigint, messageId: number) {
  return `${telegramId.toString()}:${messageId}`;
}

export function registerTransactionMessage(
  telegramId: bigint,
  messageId: number,
  transactionId: string
) {
  const key = makeKey(telegramId, messageId);
  transactionByMessage.set(key, transactionId);
  messageByTransaction.set(transactionId, key);
}

export function consumeTransactionByMessage(telegramId: bigint, messageId: number) {
  const key = makeKey(telegramId, messageId);
  const transactionId = transactionByMessage.get(key);
  if (!transactionId) {
    return null;
  }

  transactionByMessage.delete(key);
  messageByTransaction.delete(transactionId);
  return transactionId;
}

export function clearTransactionById(transactionId: string) {
  const key = messageByTransaction.get(transactionId);
  if (!key) {
    return;
  }

  messageByTransaction.delete(transactionId);
  transactionByMessage.delete(key);
}
