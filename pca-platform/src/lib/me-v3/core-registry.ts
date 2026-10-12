/**
 * Major Core 등록부를 읽는 **유일한 자리.**
 *
 * 엔진은 core 이름을 모른다. 파일 이름도 모른다. 등록부가 가리키는 것만
 * 읽는다. 그래서 전기전자나 경영학 core 를 더하는 일이 **파일을 더하는
 * 일**이 된다(장기 확장 원칙).
 *
 * 처음에 1~4단계 검사를 `me-v3-*.json` 으로 못 박아 두었는데, 그러면 두
 * 번째 core 를 올리는 날 검사를 베껴 쓰게 된다. 베낀 검사 가운데 하나는
 * 반드시 뒤처진다.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * 내용 파일이 있는 자리.
 *
 * `CONTENT_DIR` 로 바꿀 수 있게 둔 것은 **확장성 검사가 가짜 core 를 만든
 * 임시 자리에서 같은 코드를 돌려 보기 위해서**다. 운영에서는 비어 있다.
 */
export const CONTENT_DIR = process.env.CONTENT_DIR ?? "sites/pca-platform/content";

export type CoreFile =
  | "taxonomy" | "domains" | "checklists" | "items_blueprint"
  | "checklist_additions" | "common_additions" | "evidence_remap"
  | "legacy_evidence_map" | "items" | "relations" | "migration"
  /** 문항마다 무엇을 재는가. **추론하지 않고 적어 둔다** */
  | "constructs";

export type PackKind = "industry" | "role";

export type CoreEntry = {
  code: string;
  family: string;
  major: string;
  name_ko: string;
  name_en: string;
  assessment_version: string | null;
  /**
   * **이 시장에서 지금 고를 수 있는가.** 판매와 노출의 문제다.
   *
   * `maturity` 와 **절대 합치지 않는다.** 둘을 한 칸에 담으면
   * `전문가 검토 전이지만 켜 두고 싶다` 와 `검토는 끝났지만 아직 안
   * 켠다` 를 적을 수 없고, 그 둘은 실제로 자주 생기는 상태다.
   */
  status: "building" | "planned" | "live" | "archived";
  /**
   * **콘텐츠가 얼마나 검토됐는가.** 안쪽 QA 값이고 **손님 화면에 이
   * 글자가 그대로 나가지 않는다.**
   *
   * `VALIDATED`          파일럿이나 전문가 검토가 끝났다
   * `READY_FOR_REVIEW`   구조와 내용은 섰고 검토 전이다
   * `FOUNDATION`         Major Core 의 뼈대만 있다
   *
   * 지금 `VALIDATED` 인 core 는 **하나도 없다.** 규준도 인지 면접도 없어
   * 어느 전공도 `검증된 검사` 로 팔지 않는다.
   */
  maturity: "VALIDATED" | "READY_FOR_REVIEW" | "FOUNDATION";
  /**
   * 같은 Core 로 가는 학과 이름들.
   *
   * 기계공학과 · 기계시스템공학과 · 기계설계공학과가 **서로 다른 엔진이
   * 되면 안 된다.** 국내 대학 학과명은 같은 전공을 여러 이름으로 부르고,
   * 그 이름마다 core 를 만들면 서른다섯이 수백으로 불어난다.
   */
  aliases: string[];
  /**
   * 한 Core 안에서 갈리는 갈래.
   *
   * 소프트웨어와 인공지능은 컴퓨터 Core 의 갈래이고 별도 Core 가 아니다.
   * **다만 전공지식 구조가 실제로 다르면 무리하게 합치지 않는다**: 갈래로
   * 묶는 기준은 이름이 비슷한가가 아니라 **같은 영역 사전을 읽는가**다.
   */
  specializations?: { code: string; name_ko: string; note?: string }[];
  markets: string[];
  files: Partial<Record<CoreFile, string>>;
  packs?: Partial<Record<PackKind, string>>;
  domain_count: number | null;
  axis_count: number;
  /** 지난 판본의 파일. 새 응시는 쓰지 않고 되만들기에만 쓴다 */
  frozen?: { assessment_version: string; item_bank_version: string;
             note: string; files: Record<string, string> }[];
};

export type Registry = {
  contract: {
    required_files: CoreFile[];
    optional_files?: CoreFile[];
    required_keys: Record<string, string[]>;
  };
  cores: CoreEntry[];
};

export type MarketEntry = {
  code: string;
  name: string;
  locale_default: string;
  allowed_core_families: string[];
  region_layer: boolean;
};

function readJson<T>(dir: string, name: string): T {
  return JSON.parse(readFileSync(join(dir, name), "utf8")) as T;
}

export function registry(dir = CONTENT_DIR): Registry {
  return readJson<Registry>(dir, "major-cores.json");
}

export function markets(dir = CONTENT_DIR): { markets: MarketEntry[] } {
  return readJson<{ markets: MarketEntry[] }>(dir, "markets.json");
}

/** 등록부에서 core 하나를 집는다. 없으면 던진다 */
export function core(code: string, dir = CONTENT_DIR): CoreEntry {
  const found = registry(dir).cores.find((c) => c.code === code);
  if (!found) throw new Error(`등록되지 않은 core: ${code}`);
  return found;
}

/** core 의 파일 하나를 읽는다. **파일 이름을 코드에 적지 않는다** */
export function coreFile<T>(code: string, kind: CoreFile, dir = CONTENT_DIR): T {
  const c = core(code, dir);
  const name = c.files[kind];
  if (!name) throw new Error(`${code} 에 ${kind} 파일이 등록되지 않았습니다`);
  const at = join(dir, name);
  if (!existsSync(at)) throw new Error(`${code} 의 ${kind} 파일이 없습니다: ${at}`);
  return JSON.parse(readFileSync(at, "utf8")) as T;
}

/**
 * 그 core 의 산업팩이나 역할팩 파일.
 *
 * **파일 이름을 코드에 적지 않는다.** 처음에는 `industry-packs.json` 을 엔진과
 * 검사와 화면에 각각 적어 두었는데, 판본을 올리는 날 그 세 자리를 따로 고쳐야
 * 했고 한 자리를 놓치면 옛 팩과 새 팩이 한 응시에 섞인다.
 */
export function packFile(code: string, kind: PackKind, dir = CONTENT_DIR): string {
  const name = core(code, dir).packs?.[kind];
  if (!name) throw new Error(`${code} 에 ${kind} 팩이 등록되지 않았습니다`);
  return join(dir, name);
}

/** 팩 파일을 읽는다 */
export function packs<T>(code: string, kind: PackKind, dir = CONTENT_DIR): T {
  return JSON.parse(readFileSync(packFile(code, kind, dir), "utf8")) as T;
}

/**
 * 그 시장에서 내놓을 수 있는 core 목록.
 *
 * **모르면 내놓지 않는다.** 시장이 없거나 core 의 계열이 허용 목록에 없으면
 * 빈 배열이다. 주소로 core 를 넘겨도 이 함수가 거절한다.
 */
export function coresForMarket(market: string, dir = CONTENT_DIR): CoreEntry[] {
  const m = markets(dir).markets.find((x) => x.code === market);
  if (!m) return [];
  return registry(dir).cores.filter(
    (c) => c.markets.includes(market) && m.allowed_core_families.includes(c.family),
  );
}

/** 지금 응시할 수 있는 core (등록만 된 것은 뺀다) */
export function sellableCores(market: string, dir = CONTENT_DIR): CoreEntry[] {
  return coresForMarket(market, dir).filter(
    (c) => c.status === "building" || c.status === "live",
  );
}

/** core 의 파일이 등록돼 있고 실제로 있는가 */
export function hasCoreFile(code: string, kind: CoreFile, dir = CONTENT_DIR): boolean {
  const name = core(code, dir).files[kind];
  return Boolean(name) && existsSync(join(dir, name as string));
}

/** 이 core 가 계약을 지키는가. 지키지 않는 자리를 글로 돌려준다 */
export function contractGaps(code: string, dir = CONTENT_DIR): string[] {
  const reg = registry(dir);
  const c = reg.cores.find((x) => x.code === code);
  if (!c) return [`등록되지 않은 core: ${code}`];
  if (c.status === "planned") return [];
  const gaps: string[] = [];
  for (const kind of reg.contract.required_files) {
    const name = c.files[kind];
    if (!name) { gaps.push(`${kind} 파일이 등록되지 않았다`); continue; }
    if (!existsSync(join(dir, name))) { gaps.push(`${kind} 파일이 없다: ${name}`); continue; }
    const body = JSON.parse(readFileSync(join(dir, name), "utf8")) as Record<string, unknown>;
    for (const key of reg.contract.required_keys[kind] ?? []) {
      if (!(key in body)) gaps.push(`${kind} 에 열쇠가 없다: ${key}`);
    }
  }
  return gaps;
}
