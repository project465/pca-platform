// Verification-harness-only stand-in for bcryptjs (npm unreachable).
// Hashes are only compatible with this shim; used against a throwaway local DB.
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
function hash(plain, _rounds) {
  const salt = randomBytes(16).toString("hex");
  return Promise.resolve(`$shim$${salt}$${scryptSync(String(plain), salt, 32).toString("hex")}`);
}
function compare(plain, h) {
  const m = /^\$shim\$([0-9a-f]+)\$([0-9a-f]+)$/.exec(String(h ?? ""));
  if (!m) return Promise.resolve(false);
  const a = scryptSync(String(plain), m[1], 32);
  return Promise.resolve(timingSafeEqual(a, Buffer.from(m[2], "hex")));
}
export default { hash, compare, hashSync: (p) => { throw new Error("sync unsupported"); } };
export { hash, compare };
