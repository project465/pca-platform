// harness-only: there is no HTTP request in DB-level checks
export async function cookies() { return { get: () => undefined, set() {}, delete() {} }; }
export async function headers() { return new Map(); }
