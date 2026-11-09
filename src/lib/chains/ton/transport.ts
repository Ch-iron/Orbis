// Anonymous TonAPI access allows one request per four seconds.
let nextSlot = 0;
const pending = new Map<string, Promise<Response>>();
export function fetchTonApi(path: string): Promise<Response> {
  const existing = pending.get(path);
  if (existing) return existing.then((response) => response.clone());
  const now = Date.now();
  const slot = Math.max(now, nextSlot);
  nextSlot = slot + 4200;
  const request = (async () => {
    if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now));
    return fetch(`https://tonapi.io/v2${path}`);
  })();
  pending.set(path, request);
  void request.finally(() => pending.delete(path)).catch(() => undefined);
  return request.then((response) => response.clone());
}
