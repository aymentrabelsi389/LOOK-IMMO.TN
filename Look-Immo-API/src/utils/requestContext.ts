import { AsyncLocalStorage } from 'async_hooks';

// ─── Request Context Store ────────────────────────────────────────────────────
// Uses Node's built-in AsyncLocalStorage so that requestId and userId
// automatically propagate through the entire async call chain of a request
// (middleware → controllers → services → DB queries) without manual threading.

export interface RequestContext {
    requestId: string;
    userId?: string;
}

export const requestContextStore = new AsyncLocalStorage<RequestContext>();

/**
 * Returns the current request's context, or an empty object if called outside
 * of a request (e.g., from cron jobs or startup code).
 */
export function getRequestContext(): Partial<RequestContext> {
    return requestContextStore.getStore() ?? {};
}
