export function assertMultiversxSimulation(result: unknown) {
  if (!isRecord(result) || !isRecord(result.senderShard) || !isRecord(result.receiverShard) || result.senderShard.status !== 'success' || result.receiverShard.status !== 'success') {
    throw new Error('MultiversX 거래 시뮬레이션에 실패했습니다. 최소 예치액·잔액·풀 상태를 확인하세요.');
  }
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
