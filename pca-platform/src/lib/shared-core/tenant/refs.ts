/**
 * 프로필이 가리켜도 되는 값의 목록. **세 파일을 읽기만 한다**:
 * `major-cores.json`(전공 Core) · `markets.json`(시장) · `region-layer.json`(권역).
 *
 * 등록부를 거치는 함수(`core-registry.ts` 의 `registry()`)를 들여오지 않는다.
 * 그쪽은 환경(`appEnv`)과 미리보기 열림을 함께 보고, 프로필은 **어느 Core 가
 * 지금 학생에게 열려 있는가**를 묻지 않는다: 참조가 등록부에 있는가만 본다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TenantProfileError } from "./errors";

export type TenantRefs = {
  cores: ReadonlySet<string>;
  markets: ReadonlySet<string>;
  regions: ReadonlySet<string>;
};

function readJson(file: string): unknown {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (e) {
    throw new TenantProfileError("SOURCE_UNREADABLE",
      `참조 목록을 읽지 못했습니다: ${file}`, { file, value: String(e).slice(0, 120) });
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new TenantProfileError("INVALID_JSON", `참조 목록이 JSON 이 아닙니다: ${file}`, { file });
  }
}

function codes(raw: unknown, key: string, file: string): Set<string> {
  const list = (raw as Record<string, unknown> | null)?.[key];
  if (!Array.isArray(list)) {
    throw new TenantProfileError("INVALID_SCHEMA", `${file} 에 ${key} 목록이 없습니다`, { file, field: key });
  }
  return new Set(list
    .map((x) => (x as { code?: unknown } | null)?.code)
    .filter((c): c is string => typeof c === "string" && c.length > 0));
}

export function loadRefs(contentDir: string): TenantRefs {
  const coresFile = join(contentDir, "major-cores.json");
  const marketsFile = join(contentDir, "markets.json");
  const regionsFile = join(contentDir, "region-layer.json");
  return {
    cores: codes(readJson(coresFile), "cores", coresFile),
    markets: codes(readJson(marketsFile), "markets", marketsFile),
    regions: codes(readJson(regionsFile), "regions", regionsFile),
  };
}
