// harness-only: request-bound helpers are not reachable from DB-level checks
export function redirect(to) { const e = new Error("NEXT_REDIRECT " + to); e.digest = "NEXT_REDIRECT;" + to; throw e; }
export function notFound() { const e = new Error("NEXT_NOT_FOUND"); throw e; }
