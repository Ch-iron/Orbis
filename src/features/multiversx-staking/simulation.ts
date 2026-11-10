export function assertMultiversxSimulation(result: unknown) {
  if (!isRecord(result) || !isRecord(result.senderShard) || !isRecord(result.receiverShard) || result.senderShard.status !== 'success' || result.receiverShard.status !== 'success') {
    throw new Error('MultiversX transaction simulation failed. Check the minimum stake, balance, and pool status.');
  }
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
