/**
 * 결과지를 만든 코드의 판본.
 *
 * **이름을 손으로 적어 두지 않는다.** `value-engine.js` 안에 `VERSION = '1.2'`
 * 를 두면 고치면서 올리는 것을 잊고, 잊으면 스냅샷이 거짓을 적는다. 여기서는
 * 실제로 돌아간 파일의 내용으로 지문을 뽑는다: 코드가 한 글자라도 다르면
 * 판본이 다르다.
 *
 * 지문이 짧은 것은 사람이 두 줄을 눈으로 견주기 때문이다. 충돌을 막는
 * 해시가 아니라 **같은지 다른지를 가리는 표시**다.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "sites", "pca-platform");

function fp(...rel: string[]): string {
  const h = createHash("sha256");
  for (const r of rel) {
    try { h.update(readFileSync(path.join(ROOT, r))); } catch { h.update(`missing:${r}`); }
  }
  return h.digest("hex").slice(0, 12);
}

export type EngineVersions = {
  assessment_version: string;
  scoring_engine_version: string;
  evidence_engine_version: string;
  value_engine_version: string;
  coverage_engine_version: string;
  renderer_version: string;
};

/** 한 번 읽고 들고 있는다. 배포 중에 파일이 바뀌지 않는다 */
let cached: EngineVersions | null = null;

export function engineVersions(): EngineVersions {
  if (cached) return cached;
  cached = {
    assessment_version: "ME_V2_DECISION_2026",
    scoring_engine_version: `v2-scoring:${fp("assets/v2-scoring.js", "data/me-v2.js")}`,
    evidence_engine_version:
      `evidence:${fp("assets/evidence.js", "assets/readiness.js", "data/evidence-rules.js")}`,
    value_engine_version: `value:${fp("assets/value-engine.js", "data/value-data.js")}`,
    coverage_engine_version: `coverage:${fp("assets/coverage-engine.js")}`,
    renderer_version:
      `report:${fp("assets/v2-report.js", "assets/v2-value-report.js",
        "assets/v2-coverage-report.js", "assets/v2-result-json.js",
        "assets/report-print.css")}`,
  };
  return cached;
}
