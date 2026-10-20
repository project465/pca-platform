// harness-only: 요청의 쿠키를 ALS 에서 읽는다
const cur = () => globalThis.__kusAls?.getStore() ?? { cookies: new Map(), headers: new Map(), set: [] };
export async function cookies() {
  const s = cur();
  return {
    get: (n) => (s.cookies.has(n) ? { name: n, value: s.cookies.get(n) } : undefined),
    set: (n, v) => { s.cookies.set(n, typeof v === "object" ? v.value : v); s.set.push([n, typeof v === "object" ? v.value : v]); },
    delete: (n) => { s.cookies.delete(n); s.set.push([n, ""]); },
    getAll: () => [...s.cookies].map(([name, value]) => ({ name, value })),
  };
}
export async function headers() { return cur().headers; }
