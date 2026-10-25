/**
 * 긴 결과지 한 권이 읽는 것을 모은다.
 *
 * 굳은 결과 하나(`v3_snapshots.result_model`) · 그 사람의 경험 기록 · 그 응시의
 * Core 가 가리키는 사전과 팩과 관계표 · 직무 안내. 여기서 새 판단을 하지 않는다.
 * Core 는 응시 줄의 `core_code` 가 정하고, 파일 이름은 등록부가 든다.
 */
import { query, queryOne } from "@/lib/db";
import { core as coreEntry, coreFile, packs } from "../core-registry";
import type { ResultModel } from "../result/model";
import { resultMeta } from "../result/meta";
import { specView } from "../result/spec-view";
import { experiencesOf } from "../platform";
import { experienceFlow } from "../student";
import { loadGuide } from "./guide";
import type { BookLang } from "./lang";
import { hasEdition } from "../i18n";
import { localizeResult } from "../result/localize";
import { majorNameIn } from "../runtime/session";
import type {
  Checklists, DomainDef, IndustryPack, Inputs, RegionKey, Relations, RolePack, Taxonomy,
} from "./types";

/** 학교·기관 코드 → 지역 자료. 공시로 확인한 자료가 있는 곳만 적는다 */
const REGION_BY_ORG: Record<string, RegionKey> = {
  KUS: "sejong", SJEPA: "sejong", JJU: "jeonbuk", WKU: "jeonbuk", PCU: "chungcheong",
};

export class BookInputMissing extends Error {}

export async function loadInputs(attemptId: string, expScope: "snapshot" | "all" = "snapshot"): Promise<Inputs> {
  const row = await queryOne<{
    result_model: ResultModel; tier: string; user_id: string; core_code: string;
    university_code: string | null; display_name: string | null; snap_at: string; snap_on: string;
    locale: string | null;
  }>(
    `SELECT s.result_model, a.tier, a.user_id::text, a.core_code, a.university_code, u.display_name, a.locale,
            s.created_at::text AS snap_at, to_char(s.created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS snap_on
       FROM v3_attempts a
       JOIN v3_snapshots s ON s.attempt_id = a.id
       JOIN users u ON u.id = a.user_id
      WHERE a.id = $1
      ORDER BY s.created_at DESC LIMIT 1`, [attemptId]);
  if (!row) throw new BookInputMissing(`${attemptId}: 굳은 결과가 없습니다`);
  const coreCode = row.core_code;
  const core = coreEntry(coreCode);
  /* 책의 언어는 응시가 정한다. 영어 원고가 다 갖춰진 Core 만 영어 책이 선다 */
  const lang: BookLang = row.locale === "en" && hasEdition(coreCode, "en") ? "en" : "ko";
  const meta = await resultMeta(attemptId, coreCode);

  /* 발행 기관: 학교 진입이면 그 학교, 아니면 소속 기관 이름, 둘 다 없으면 CareerMatri */
  let issuer = meta.school;
  let issuerCode = meta.universityCode ?? row.university_code;
  if (!issuer) {
    const org = await queryOne<{ name: string; code: string }>(
      `SELECT o.name, o.code FROM memberships ms JOIN organizations o ON o.id = ms.org_id
        WHERE ms.user_id = $1 AND coalesce(o.name, '') <> '' AND o.org_type <> 'company' AND NOT o.is_demo
        ORDER BY (o.org_type = 'department'), ms.created_at LIMIT 1`, [row.user_id]);
    if (org) { issuer = org.name; issuerCode = issuerCode ?? org.code; }
  }

  const defs = coreFile<{ domains: DomainDef[] }>(coreCode, "domains", undefined, lang).domains;
  const tax = coreFile<Taxonomy>(coreCode, "taxonomy", undefined, lang);
  const rel = coreFile<Relations>(coreCode, "relations");
  const checklists = coreFile<Checklists>(coreCode, "checklists", undefined, lang);
  const roles = packs<{ packs: RolePack[] }>(coreCode, "role", undefined, lang).packs;
  const inds = packs<{ packs: IndustryPack[] }>(coreCode, "industry", undefined, lang).packs;
  const guide = loadGuide(coreCode, roles.map((r) => r.code), undefined, lang);
  if (guide.status !== "OK") console.warn(`[report-long] ${coreCode} 직무 안내 ${guide.status}: ${guide.note ?? ""}`);

  /**
   * 경험 기록은 저장한 것만 쓴다. 쓰다 만 초안과 한 줄 메모(note_text)는 싣지 않는다.
   * 그리고 결과를 굳힌 때까지 저장된 것만 싣는다. 그 뒤에 더한 기록은 작업공간의 현재
   * 상태가 맡고, 이 책은 언제 뽑아도 같은 글자가 나와야 한다(경험을 더해도 굳은 결과가
   * 그대로라는 약속이 종이에서도 지켜진다). 점검에서만 `experiences: "all"` 로 연다.
   */
  const until = expScope === "all" ? null : row.snap_at;
  const keep = new Set((await query<{ id: string }>(
    `SELECT id::text FROM v3_experiences WHERE user_id = $1 AND core_code = $2
        AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)`,
    [row.user_id, coreCode, until])).map((r) => r.id));
  const exps = (await experiencesOf(row.user_id, coreCode))
    .filter((e) => e.status !== "draft" && keep.has(e.id))
    .map((e) => ({ ...e, note_text: null }));

  /* 지역 자료는 한국 공시와 명단이라 영어 책에는 싣지 않는다 */
  const region = lang === "en" ? null : issuerCode ? REGION_BY_ORG[issuerCode] ?? null : null;
  const today = (await queryOne<{ d: string }>(`SELECT to_char(now(), 'YYYY-MM-DD') AS d`))?.d ?? "";
  return {
    attemptId, tier: row.tier, userId: row.user_id,
    lang,
    person: (row.display_name ?? "").trim() || (lang === "en" ? "Participant" : "응시자"),
    coreCode, core, major: lang === "en" ? majorNameIn(coreCode, "en") : core.name_ko,
    department: meta.department, school: meta.school,
    specialization: meta.specialization,
    spec: specView(coreCode, meta.specializationCode),
    issuer: issuer ?? "CareerMatri", issuerCode: issuerCode ?? null,
    answeredOn: meta.answeredOn ?? today,
    m: localizeResult(row.result_model, coreCode, lang), defs, tax, rel, roles, inds, checklists, guide, exps, region,
    domainWord: lang === "en" ? "area" : experienceFlow(coreCode).domainWord,
    builtOn: row.snap_on || today,
  };
}

/** 점검 스크립트가 쓴다: 굳은 결과가 있는 PRO 응시를 Core 마다 고른다 */
export async function scoredAttempts(): Promise<{ id: string; core_code: string; tier: string; university_code: string | null }[]> {
  return query(
    `SELECT a.id::text, a.core_code, a.tier, a.university_code FROM v3_attempts a
      WHERE a.status = 'scored' AND EXISTS (SELECT 1 FROM v3_snapshots s WHERE s.attempt_id = a.id)
      ORDER BY a.id DESC`);
}
