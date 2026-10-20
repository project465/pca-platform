// harness-only 로더. **제품에 들어가지 않는다.** npm 패키지가 없는 세션에서 KUS 화면(.tsx)을
// TypeScript 컴파일러로 옮겨 서버에서 글자로 그린다. pg·bcryptjs·next-auth 대역은 전주대 세션의
// scripts/lab/offline/shims 를 그대로 쓰고, 화면 쪽 대역은 이 폴더의 shims 다.
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve as r, dirname } from "node:path";
const require = createRequire(import.meta.url);
const ts = require("/opt/node22/lib/node_modules/typescript");
const SRC = process.env.TS_SRC_ROOT;
const HERE = dirname(fileURLToPath(import.meta.url));
const OFF = r(HERE, "../../lab/offline/shims");
function cand(base) {
  for (const s of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const f = base + s;
    if (existsSync(f) && /\.(ts|tsx|json|mjs|js|css)$/.test(f)) return f;
  }
  return null;
}
const MINE = {
  "react/jsx-runtime": "jsx-runtime.mjs", "react/jsx-dev-runtime": "jsx-runtime.mjs", "kusjsx/jsx-runtime": "jsx-runtime.mjs",
  react: "react.mjs", "react-dom": "react-dom.mjs", "next/link": "next-link.mjs", "next/cache": "next-cache.mjs",
  "next/headers": "next-headers.mjs", "next/navigation": "next-navigation.mjs", "next/script": "next-misc.mjs",
  "next/server": "next-misc.mjs", "server-only": "empty.mjs", "next": "empty.mjs",
};
const OFFS = { pg: "pg.mjs", bcryptjs: "bcryptjs.mjs", nodemailer: "nodemailer.mjs" };
export async function resolve(spec, ctx, next) {
  if (spec === "next-auth" || spec.startsWith("next-auth/")) return next(pathToFileURL(r(HERE, "shims", "next-auth.mjs")).href, ctx);
  if (spec === "playwright") return next(pathToFileURL("/opt/node22/lib/node_modules/playwright/index.mjs").href, ctx);
  if (MINE[spec]) return next(pathToFileURL(r(HERE, "shims", MINE[spec])).href, ctx);
  if (OFFS[spec]) return next(pathToFileURL(r(OFF, OFFS[spec])).href, ctx);
  let base = null;
  if (spec.startsWith("@/")) base = r(SRC, spec.slice(2));
  else if ((spec.startsWith("./") || spec.startsWith("../")) && ctx.parentURL?.startsWith("file:")) base = r(dirname(fileURLToPath(ctx.parentURL)), spec);
  if (base) { const f = cand(base); if (f) return next(pathToFileURL(f).href, ctx); }
  return next(spec, ctx);
}
export async function load(url, ctx, next) {
  if (url.endsWith(".css")) return { format: "module", source: "export default {};", shortCircuit: true };
  if (url.endsWith(".tsx")) {
    const src = readFileSync(fileURLToPath(url), "utf8");
    const out = ts.transpileModule(src, { compilerOptions: {
      module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: "react", verbatimModuleSyntax: false, isolatedModules: true,
    }, fileName: fileURLToPath(url) });
    return { format: "module", source: out.outputText, shortCircuit: true };
  }
  return next(url, ctx);
}
