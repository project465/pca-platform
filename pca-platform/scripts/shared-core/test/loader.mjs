/**
 * shared-core 검사용 Node 로더. **제품 코드가 아니다.**
 *
 * 이 저장소의 검사는 원래 `tsx` 로 도는데, 의존성을 설치할 수 없는 자리
 * (npm registry 가 막힌 세션)에서도 DB 없는 검사와 shared-core 검사를
 * 돌리려고 둔다. Node 22 의 type-stripping 이 TypeScript 를 읽고, 이
 * 로더는 둘만 한다.
 *
 *   1. 확장자 없는 상대 경로와 `@/` 별칭을 `.ts` 파일로 푼다
 *      (tsconfig 의 `paths: { "@/*": ["./src/*"] }` 와 같은 규칙)
 *   2. `SC_SHIMS=1` 일 때만 `pg` · `bcryptjs` · `next/navigation` 을
 *      `shims/` 의 대체 모듈로 돌린다. **검사용 일회 DB 에서만** 쓴다
 *
 * package.json 과 lockfile 을 고치지 않는다.
 */
import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolvePath(HERE, "../../..");
const SRC = join(ROOT, "src");
const SHIMS = process.env.SC_SHIMS === "1"
  ? {
    pg: join(HERE, "shims/pg.mjs"),
    bcryptjs: join(HERE, "shims/bcryptjs.mjs"),
    "next/navigation": join(HERE, "shims/next-navigation.mjs"),
  }
  : {};

function asFile(base) {
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}.js`,
    join(base, "index.ts")]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

export async function resolve(spec, ctx, next) {
  if (Object.prototype.hasOwnProperty.call(SHIMS, spec)) {
    return { url: pathToFileURL(SHIMS[spec]).href, shortCircuit: true };
  }
  let base = null;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if ((spec.startsWith("./") || spec.startsWith("../"))
    && ctx.parentURL?.startsWith("file:")) {
    base = resolvePath(dirname(fileURLToPath(ctx.parentURL)), spec);
  }
  if (base) {
    const f = asFile(base);
    if (f) return next(pathToFileURL(f).href, ctx);
  }
  return next(spec, ctx);
}
