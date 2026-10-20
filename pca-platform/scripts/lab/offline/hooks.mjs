import { existsSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve as r, dirname } from "node:path";
const SRC = process.env.TS_SRC_ROOT;
function cand(base) {
  for (const s of ["", ".ts", ".tsx", "/index.ts"]) if (existsSync(base + s) && !base.endsWith("/") ) { if (s || /\.(ts|tsx|json|mjs|js)$/.test(base)) return base + s; }
  return null;
}
const SHIM = { pg: "pg.mjs", bcryptjs: "bcryptjs.mjs", "next/navigation": "next-navigation.mjs", "next/headers": "next-headers.mjs", nodemailer: "nodemailer.mjs" };
const ABS = { playwright: "/opt/node22/lib/node_modules/playwright/index.mjs" };
const HERE = dirname(fileURLToPath(import.meta.url));
export async function resolve(spec, ctx, next) {
  if (spec === "next-auth" || spec.startsWith("next-auth/")) return next(pathToFileURL(r(HERE, "shims", "next-auth.mjs")).href, ctx);
  if (ABS[spec]) return next(pathToFileURL(ABS[spec]).href, ctx);
  if (SHIM[spec]) return next(pathToFileURL(r(HERE, "shims", SHIM[spec])).href, ctx);
  let base = null;
  if (spec.startsWith("@/")) base = r(SRC, spec.slice(2));
  else if ((spec.startsWith("./") || spec.startsWith("../")) && ctx.parentURL?.startsWith("file:")) base = r(dirname(fileURLToPath(ctx.parentURL)), spec);
  if (base) { const f = cand(base); if (f) return next(pathToFileURL(f).href, ctx); }
  return next(spec, ctx);
}
