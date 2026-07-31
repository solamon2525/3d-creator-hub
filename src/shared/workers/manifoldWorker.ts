/** Thin worker entry — manifold runs via shared module; reserved for heavy jobs. */
/// <reference lib="webworker" />

export type WorkerRequest =
  | { type: 'ping' }
  | { type: 'echo'; payload: unknown };

export type WorkerResponse = { type: 'pong' } | { type: 'echo'; payload: unknown } | { type: 'error'; message: string };

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  try {
    if (msg.type === 'ping') {
      (self as DedicatedWorkerGlobalScope).postMessage({ type: 'pong' } satisfies WorkerResponse);
      return;
    }
    if (msg.type === 'echo') {
      (self as DedicatedWorkerGlobalScope).postMessage({
        type: 'echo',
        payload: msg.payload,
      } satisfies WorkerResponse);
    }
  } catch (e) {
    (self as DedicatedWorkerGlobalScope).postMessage({
      type: 'error',
      message: e instanceof Error ? e.message : String(e),
    } satisfies WorkerResponse);
  }
};
