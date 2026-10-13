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

/**
 * 한 Core 안의 갈래.
 *
 * **채점을 복제하지 않는다.** 갈래가 조정하는 것은 다섯 층뿐이고(영역
 * 무게 · 산업 · 역할 · 보기 · 근거와 할 일) 축 수준과 묶음 규칙과 문항
 * 은행과 결과 모델은 Core 하나가 들고 있다. 갈래마다 엔진을 베끼면 같은
 * 전공 학생 둘이 서로 다른 자로 재어지고, 그 둘의 결과를 견줄 수 없다.
 *
 * `authored` 는 **이름만 적어 둔 갈래와 실제로 쓸 수 있는 갈래**를 가른다.
 * 학교 등록부가 아직 적지 않은 갈래를 가리키면 그 학과는 `갈래 작성 필요`
 * 로 선다.
 */
export type Specialization = {
  code: string; name_ko: string; note?: string;
  /** 다섯 층 가운데 하나라도 채워졌는가 */
  authored?: boolean;
  domain_emphasis?: unknown; industry_mapping?: unknown;
  role_mapping?: unknown; examples?: unknown; evidence_action?: unknown;
};

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
   * **학생에게 열어도 되는가.** `status` 와 따로 둔다.
   *
   * 짓고 있는 Core 는 `status: "building"` 인데, 그 값 하나로 판매와 노출을
   * 정하면 **문항을 쓰는 동안 그 학과 학생이 빈 검사를 만난다.** 전에는
   * 문항이 다 써지기 전에 상태를 올리지 않는 것으로 막았지만, 그러면
   * 짓는 쪽이 `v3:*` 검사를 돌릴 수 없다(그 검사들이 `building` 인 Core 를
   * 집는다). 그래서 **짓는 것과 여는 것을 두 칸으로 가른다.**
   *
   * 적지 않으면 열려 있다: 지금 팔고 있는 Core 의 동작을 바꾸지 않는다.
   */
  open_to_students?: boolean;
  /**
   * **콘텐츠가 얼마나 검토됐는가.** 안쪽 QA 값이고 **손님 화면에 이
   * 글자가 그대로 나가지 않는다.**
   *
   * `VALIDATED`                 파일럿이나 전문가 검토가 끝났다
   * `READY_FOR_REVIEW`          구조와 내용은 섰고 검토 전이다
   * `READY_FOR_DOMAIN_REVIEW`   자료가 다 서고 자동 검사가 통과했다.
   *                             남은 것은 **그 전공 전문가가 읽는 일**이다
   * `FOUNDATION`                Major Core 의 뼈대만 있다
   *
   * `READY_FOR_REVIEW` 와 따로 둔 까닭. 앞엣것은 `누군가 봐야 한다` 까지고
   * 뒤엣것은 **누가 무엇을 봐야 하는지가 정해져 있다**: 그 전공 전문가와
   * 현직자가 읽을 묶음이 만들어져 있고 판정 칸이 비어 있는 상태다. 한
   * 칸으로 묶으면 `검토를 부탁할 자료가 아직 없다` 와 `자료는 있고 답을
   * 기다린다` 가 구별되지 않고, 그러면 아무도 검토를 시작하지 않는다.
   *
   * 지금 `VALIDATED` 인 core 는 **하나도 없다.** 규준도 인지 면접도 없어
   * 어느 전공도 `검증된 검사` 로 팔지 않는다.
   */
  maturity: "VALIDATED" | "READY_FOR_REVIEW" | "READY_FOR_DOMAIN_REVIEW"
    | "FOUNDATION";
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
  specializations?: Specialization[];
  markets: string[];
  files: Partial<Record<CoreFile, string>>;
  packs?: Partial<Record<PackKind, string>>;
  domain_count: number | null;
  axis_count: number;
  /**
   * 그 Core 의 검사 고정자료. **경로를 검사 스크립트에 적지 않는다.**
   *
   * `v3:scoring` 이 사람 열두 벌과 은행 지문을 여기서 찾는다. 적어 두지
   * 않으면 그 명령이 **다른 Core 의 자료로 이 Core 를 채점한다**: 처음에
   * 전기전자 Core 를 기계공학 fixture 로 돌려 없는 산업팩을 찾다 멈췄다.
   */
  fixtures?: {
    personas?: string; bank_lock?: string;
    /**
     * 생성물 문서의 자리. **검사 스크립트에 적지 않는다.**
     *
     * 처음에는 `docs/metri/84_measurement_map.md` 를 스크립트가 글자로 들고
     * 있었고, 그래서 `CORE=` 를 넘겨 돌린 날 **그 문서가 다른 Core 의 표로
     * 덮였다.** 생성물은 Core 마다 따로 선다.
     */
    measurement_map?: string; gaming_doc?: string;
  };
  /** 지난 판본의 파일. 새 응시는 쓰지 않고 되만들기에만 쓴다 */
  frozen?: { assessment_version: string; item_bank_version: string;
             note: string; files: Record<string, string> }[];
};

export type Registry = {
  /** 갈래가 무엇을 조정하고 무엇을 건드리지 않는가 */
  specialization_contract?: {
    note: string; adjusts: string[]; never: string[];
    authored: string; how: string;
  };
  contract: {
    required_files: CoreFile[];
    optional_files?: CoreFile[];
    required_keys: Record<string, string[]>;
    /**
     * `CORE` 를 적지 않았을 때 검사가 보는 Core.
     *
     * 전에는 `status === "building"` 인 Core 가 하나라는 것에 기대어 골랐고,
     * 그래서 **둘째 Core 를 짓기 시작하는 날 `v3:*` 전부가 던졌다.** 어느
     * Core 를 기본으로 볼지는 사람이 정할 일이므로 등록부에 적는다.
     */
    default_core?: string;
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

/**
 * `CORE` 를 적지 않았을 때 검사가 집는 Core.
 *
 * 등록부의 `contract.default_core` 가 정본이고, 적혀 있지 않으면 짓고 있는
 * Core 가 하나일 때만 그것을 쓴다. **둘이면 던진다**: 어느 Core 를 재는지
 * 모르는 채로 돌아가는 검사는 녹색이어도 아무것도 말하지 않는다.
 */
export function defaultCore(dir = CONTENT_DIR): string {
  const reg = registry(dir);
  const want = reg.contract.default_core;
  if (want) {
    if (!reg.cores.some((c) => c.code === want)) {
      throw new Error(`등록부의 default_core 가 없는 core 를 가리킵니다: ${want}`);
    }
    return want;
  }
  const building = reg.cores.filter((c) => c.status === "building");
  if (building.length !== 1) {
    throw new Error(
      `CORE 를 적어 주십시오. 짓고 있는 core 가 ${building.length}개입니다`);
  }
  return building[0].code;
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

/**
 * 지금 응시할 수 있는 core (등록만 된 것과 **아직 열지 않은 것**은 뺀다).
 *
 * `open_to_students: false` 를 함께 보는 까닭은, 짓고 있는 Core 가
 * `building` 인 동안에도 학생 화면에는 서지 않아야 하기 때문이다. 이 함수를
 * 지나지 않는 길로 응시가 열리지 않는다: 가격표와 `/cores` 와 학교 진입과
 * `openAttempt` 가 전부 여기를 읽는다.
 */
export function sellableCores(market: string, dir = CONTENT_DIR): CoreEntry[] {
  return coresForMarket(market, dir).filter(
    (c) => (c.status === "building" || c.status === "live") &&
      c.open_to_students !== false,
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

/** 그 Core 의 갈래 하나. 없으면 `null` */
export function specializationOf(
  coreCode: string, spec: string, dir = CONTENT_DIR,
): Specialization | null {
  const c = registry(dir).cores.find((x) => x.code === coreCode);
  return c?.specializations?.find((s) => s.code === spec) ?? null;
}

/**
 * 그 갈래가 **실제로 쓸 수 있는가.**
 *
 * 이름만 적어 둔 갈래는 아직 아무것도 조정하지 않는다. 그것을 `쓸 수 있다`
 * 로 세면 학교 화면이 **작성되지 않은 갈래를 가리키며 검사를 연다.**
 */
export function specializationAuthored(
  coreCode: string, spec: string, dir = CONTENT_DIR,
): boolean {
  const s = specializationOf(coreCode, spec, dir);
  if (!s) return false;
  if (s.authored === true) return true;
  return [s.domain_emphasis, s.industry_mapping, s.role_mapping,
    s.examples, s.evidence_action].some((v) => v != null);
}
