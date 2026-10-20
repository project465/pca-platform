/**
 * KUS 기업탐방 기록.
 *
 * **방문 사실을 역량으로 세지 않는다.** 이 기록은 결과 모델에도 지금
 * 상태에도 들어가지 않는다. 판정에 들어가는 길은 하나다: 학생이 그
 * 자리에서 **직접 해 본 활동**(`DO` 보기)을 공통 경험 입력으로 옮기면
 * 그쪽에서 고른 결정·결과물·검증 항목으로 공통 엔진이 판정한다. 그래서
 * 이 파일에는 점수도 축도 없다.
 *
 * **기업을 지어 넣지 않는다.** 탐방 기업은 담당자가 등록한 줄
 * (`kus_visit_programs`)에서 고르고, 학생이 적은 이름은 `확인 전` 으로
 * 선다. 기업을 추천하지 않는다(직업정보제공사업 범위).
 *
 * **초안은 학생의 말로만 짓는다.** 자기소개서·면접·포트폴리오 초안은
 * 학생이 적은 칸과 그 Core 사전의 이름(영역 · 역할)을 차례로 놓을 뿐이고,
 * 적지 않은 칸은 `(적을 칸)` 으로 남긴다. 관찰만 한 학생의 초안은
 * `할 수 있다` 대신 `보았다 · 이해했다` 로 쓴다.
 */
import { query, queryOne } from "@/lib/db";
import { domainName, roleName } from "@/lib/me-v3/runtime/session";

/** 탐방에서 한 일. `OBSERVE` 는 보고 들은 것, `DO` 는 직접 해 본 것 */
export const ACTIVITIES = [
  { code: "BRIEFING", label: "회사·사업 설명을 들었다", level: "OBSERVE" },
  { code: "SITE_TOUR", label: "현장·설비·사무 공간을 둘러봤다", level: "OBSERVE" },
  { code: "QNA", label: "직무자에게 질문하고 답을 들었다", level: "OBSERVE" },
  { code: "MENTOR", label: "직무자와 따로 대화(멘토링)했다", level: "OBSERVE" },
  { code: "HANDS_ON", label: "실습·체험을 직접 해 봤다", level: "DO" },
  { code: "TASK", label: "주어진 과제·문제를 직접 풀어 봤다", level: "DO" },
  { code: "PRESENT", label: "결과물을 만들어 발표·제출했다", level: "DO" },
] as const;
export type ActivityCode = typeof ACTIVITIES[number]["code"];
const ACT = new Map<string, typeof ACTIVITIES[number]>(ACTIVITIES.map((a) => [a.code, a]));

export type VisitProgram = {
  id: string; company_name: string; business_note: string | null;
  visit_date: string | null; status: "PLANNED" | "CONFIRMED" | "DONE" | "CANCELLED";
  source_note: string | null; is_test: boolean;
};

export type Visit = {
  id: string; program_id: string | null; company_name: string; visited_on: string | null;
  core_code: string | null; role_codes: string[]; role_text: string | null;
  understood: string | null; activities: string[]; activity_text: string | null;
  learned: string | null; td_codes: string[]; experience_id: string | null;
  /** 등록된 탐방에서 온 기록인가. 아니면 기업 이름이 `확인 전` 이다 */
  confirmed: boolean; is_test: boolean; created_at: string;
};

export type VisitInput = {
  program_id: string | null; company_name: string; visited_on: string | null;
  role_codes: string[]; role_text: string | null; understood: string | null;
  activities: string[]; activity_text: string | null; learned: string | null;
  td_codes: string[];
};

const trim = (s: unknown, n: number): string | null => {
  const v = String(s ?? "").trim().replace(/\s+/g, " ");
  return v ? v.slice(0, n) : null;
};

/**
 * 폼에서 온 값을 고른다. **거절하는 까닭을 글로 돌려준다.**
 *
 * 보기 열쇠는 그 학생의 Core 사전과 고정 보기에 있는 것만 남긴다: 주소나
 * 폼을 손으로 고쳐 남의 사전 코드를 넣어도 기록에 서지 않는다.
 */
export function checkVisit(raw: Record<string, unknown> & {
  role_codes?: unknown; activities?: unknown; td_codes?: unknown;
}, allowed: { roles: string[]; tds: string[]; programs: VisitProgram[] }):
  { ok: true; value: VisitInput } | { ok: false; why: string } {
  const list = (v: unknown) => (Array.isArray(v) ? v : v == null ? [] : [v]).map(String);
  const pid = trim(raw.program_id, 20);
  const program = pid ? allowed.programs.find((p) => p.id === pid) ?? null : null;
  if (pid && !program) return { ok: false, why: "등록되지 않은 탐방입니다" };
  const company = program?.company_name ?? trim(raw.company_name, 80);
  if (!company) return { ok: false, why: "방문한 기업을 고르거나 적어 주세요" };
  const on = trim(raw.visited_on, 10);
  if (on && !/^\d{4}-\d{2}-\d{2}$/.test(on)) return { ok: false, why: "탐방 날짜를 다시 골라 주세요" };
  const value: VisitInput = {
    program_id: program?.id ?? null,
    company_name: company,
    visited_on: on ?? program?.visit_date ?? null,
    role_codes: [...new Set(list(raw.role_codes))].filter((c) => allowed.roles.includes(c)).slice(0, 5),
    role_text: trim(raw.role_text, 120),
    understood: trim(raw.understood, 600),
    activities: [...new Set(list(raw.activities))].filter((c) => ACT.has(c)),
    activity_text: trim(raw.activity_text, 300),
    learned: trim(raw.learned, 600),
    td_codes: [...new Set(list(raw.td_codes))].filter((c) => allowed.tds.includes(c)).slice(0, 4),
  };
  if (!value.role_codes.length && !value.role_text) {
    return { ok: false, why: "관찰한 직무를 하나 이상 고르거나 적어 주세요" };
  }
  if (!value.activities.length) return { ok: false, why: "탐방에서 한 활동을 하나 이상 골라 주세요" };
  return { ok: true, value };
}

/** 직접 해 본 활동이 있는가. 있으면 공통 경험 입력으로 옮길 수 있다 */
export function didSomething(v: Pick<Visit, "activities">): boolean {
  return v.activities.some((a) => ACT.get(a)?.level === "DO");
}

export function activityLabel(code: string): string {
  return ACT.get(code)?.label ?? code;
}

/* ── 저장 ─────────────────────────────────────────────────────────── */

export async function visitPrograms(opts: { includeCancelled?: boolean } = {}): Promise<VisitProgram[]> {
  return query<VisitProgram>(
    `SELECT id::text, company_name, business_note, visit_date::text, status,
            source_note, is_test
       FROM kus_visit_programs
      WHERE university_code = 'KUS' ${opts.includeCancelled ? "" : "AND status <> 'CANCELLED'"}
      ORDER BY visit_date NULLS LAST, id`);
}

const VISIT_COLS = `v.id::text, v.program_id::text, v.company_name, v.visited_on::text,
  v.core_code, v.role_codes, v.role_text, v.understood, v.activities, v.activity_text,
  v.learned, v.td_codes, v.experience_id::text,
  (v.program_id IS NOT NULL) AS confirmed, coalesce(p.is_test, false) AS is_test,
  to_char(v.created_at, 'YYYY-MM-DD') AS created_at`;

/** 그 사람의 기록. **`user_id` 로 거른다**: 번호를 넣어도 남의 기록이 오지 않는다 */
export async function visitsOf(userId: string): Promise<Visit[]> {
  return query<Visit>(
    `SELECT ${VISIT_COLS}
       FROM kus_company_visits v LEFT JOIN kus_visit_programs p ON p.id = v.program_id
      WHERE v.user_id = $1::bigint AND v.university_code = 'KUS'
      ORDER BY v.visited_on DESC NULLS LAST, v.id DESC`, [userId]);
}

export async function visitOf(userId: string, id: string): Promise<Visit | null> {
  if (!/^\d+$/.test(id)) return null;
  return queryOne<Visit>(
    `SELECT ${VISIT_COLS}
       FROM kus_company_visits v LEFT JOIN kus_visit_programs p ON p.id = v.program_id
      WHERE v.id = $1::bigint AND v.user_id = $2::bigint AND v.university_code = 'KUS'`,
    [id, userId]);
}

/**
 * `core` 는 그 학생의 학교 맥락이 든 Core 다(`campus_students` → 등록부).
 * 응시에서 끌어오지 않는다: 검사 전에 탐방을 다녀온 학생에게는 응시가 없다.
 */
export async function addVisit(userId: string, core: string, v: VisitInput): Promise<string> {
  const free = [v.role_text, v.understood, v.activity_text, v.learned].some(Boolean);
  const r = await queryOne<{ id: string }>(
    `INSERT INTO kus_company_visits
       (user_id, program_id, company_name, visited_on, core_code, role_codes, role_text,
        understood, activities, activity_text, learned, td_codes, purge_after)
     VALUES ($1::bigint, $2::bigint, $3, $4::date, $5, $6, $7, $8, $9, $10, $11, $12,
             CASE WHEN $13::boolean THEN current_date + 365 ELSE NULL END)
     RETURNING id::text`,
    [userId, v.program_id, v.company_name, v.visited_on, core, v.role_codes, v.role_text,
      v.understood, v.activities, v.activity_text, v.learned, v.td_codes, free]);
  return r?.id ?? "";
}

export async function updateVisit(userId: string, id: string, v: VisitInput): Promise<boolean> {
  const r = await queryOne<{ id: string }>(
    `UPDATE kus_company_visits
        SET program_id = $3::bigint, company_name = $4, visited_on = $5::date,
            role_codes = $6, role_text = $7, understood = $8, activities = $9,
            activity_text = $10, learned = $11, td_codes = $12, updated_at = now()
      WHERE id = $1::bigint AND user_id = $2::bigint AND university_code = 'KUS'
      RETURNING id::text`,
    [id, userId, v.program_id, v.company_name, v.visited_on, v.role_codes, v.role_text,
      v.understood, v.activities, v.activity_text, v.learned, v.td_codes]);
  return Boolean(r);
}

export async function removeVisit(userId: string, id: string): Promise<boolean> {
  const r = await queryOne<{ id: string }>(
    `DELETE FROM kus_company_visits
      WHERE id = $1::bigint AND user_id = $2::bigint AND university_code = 'KUS'
      RETURNING id::text`, [id, userId]);
  return Boolean(r);
}

/** 공통 경험으로 옮긴 뒤 그 줄을 잇는다. 남의 경험 번호는 잇지 않는다 */
export async function linkExperience(userId: string, id: string, experienceId: string): Promise<boolean> {
  const r = await queryOne<{ id: string }>(
    `UPDATE kus_company_visits v SET experience_id = e.id, updated_at = now()
       FROM v3_experiences e
      WHERE v.id = $1::bigint AND v.user_id = $2::bigint AND e.id = $3::bigint
        AND e.user_id = v.user_id
      RETURNING v.id::text`, [id, userId, experienceId]);
  return Boolean(r);
}

export async function addProgram(by: string, p: {
  company_name: string; business_note: string | null; visit_date: string | null;
  status: VisitProgram["status"]; source_note: string | null; is_test: boolean;
}): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `INSERT INTO kus_visit_programs (company_name, business_note, visit_date, status,
                                     source_note, is_test, created_by)
     VALUES ($1, $2, $3::date, $4, $5, $6, $7::bigint) RETURNING id::text`,
    [p.company_name, p.business_note, p.visit_date, p.status, p.source_note, p.is_test, by]);
  return r?.id ?? "";
}

/** 담당자 표. **사람 수만** 센다: 누가 무엇을 적었는지는 나가지 않는다 */
export async function visitCounts(): Promise<{ programs: number; students: number; visits: number; did: number }> {
  const r = await queryOne<{ programs: string; students: string; visits: string; did: string }>(
    `SELECT (SELECT count(*) FROM kus_visit_programs WHERE status <> 'CANCELLED')::text AS programs,
            count(DISTINCT v.user_id)::text AS students, count(v.id)::text AS visits,
            count(v.id) FILTER (WHERE v.activities && ARRAY['HANDS_ON','TASK','PRESENT'])::text AS did
       FROM kus_company_visits v JOIN campus_students s ON s.user_id = v.user_id
      WHERE v.university_code = 'KUS' AND s.university_code = 'KUS'`);
  return {
    programs: Number(r?.programs ?? 0), students: Number(r?.students ?? 0),
    visits: Number(r?.visits ?? 0), did: Number(r?.did ?? 0),
  };
}

/* ── 초안 ─────────────────────────────────────────────────────────── */

export type VisitDraft = {
  /** 직무 연결: 관찰한 일 → 내가 잇는 전공 영역 */
  links: { role: string; domains: string[] }[];
  letter: string;
  interview: { q: string; frame: string }[];
  portfolio: string[];
  /** 관찰만 한 기록인가. 그러면 초안의 동사가 `보았다·이해했다` 다 */
  observeOnly: boolean;
  cautions: string[];
};

const BLANK = "(적을 칸)";

/**
 * 탐방 한 건의 활용 초안. **값을 지어내지 않는다.**
 *
 * 문장 틀은 고정이고 칸은 학생이 적은 것과 그 Core 사전의 이름뿐이다.
 * 학생이 적지 않은 칸은 `(적을 칸)` 으로 남긴다.
 */
export function visitDraft(core: string, v: Visit): VisitDraft {
  const roles = [
    ...v.role_codes.map((c) => roleName(core, c)),
    ...(v.role_text ? [v.role_text] : []),
  ];
  const doms = v.td_codes.map((td) => domainName(core, td));
  const observeOnly = !didSomething(v);
  const did = v.activities.filter((a) => ACT.get(a)?.level === "DO").map(activityLabel);
  const seen = v.activities.filter((a) => ACT.get(a)?.level === "OBSERVE").map(activityLabel);
  const role0 = roles[0] ?? BLANK;
  const dom = doms.length ? doms.join("·") : BLANK;
  const verb = observeOnly ? "현장에서 직접 보며" : "현장에서 직접 해 보며";
  const letter = [
    `${v.company_name} 기업탐방에서 ${role0} 직무의 일을 ${verb} ${v.understood ?? BLANK}을(를) 이해했습니다.`,
    did.length ? `그 자리에서 ${did.join(", ").replace(/다$/, "")}고, ${v.activity_text ?? BLANK}.` : "",
    `특히 ${v.learned ?? BLANK}을(를) 새로 알게 되었고, 전공에서 배운 ${dom}이(가) 이 일에서 어떻게 쓰이는지 확인했습니다.`,
    `앞으로 ${dom} 쪽에서 제가 직접 정하고 남긴 경험을 하나 더 쌓아, 이 직무에 필요한 판단을 설명할 수 있게 준비하겠습니다.`,
  ].filter(Boolean).join(" ");
  const interview = [
    { q: `${v.company_name} 탐방에서 본 ${role0} 직무는 어떤 일을 했나요?`,
      frame: `본 장면 하나(${seen[0] ?? BLANK}) → 그 직무가 정하던 것 → 내가 이해한 이유(${v.understood ?? BLANK})` },
    { q: "탐방 전과 후에 직무에 대한 생각이 어떻게 달라졌나요?",
      frame: `전에 알던 것 → 새로 알게 된 것(${v.learned ?? BLANK}) → 그래서 지금 준비하는 것` },
    ...(doms.length ? [{ q: `전공에서 배운 ${doms[0]}이(가) 그 일과 어떻게 이어지나요?`,
      frame: `수업·과제에서 내가 정한 것 → 현장에서 본 같은 판단 → 아직 비어 있는 것과 채울 계획` }] : []),
  ];
  const portfolio = [
    `탐방 개요: ${v.company_name}${v.visited_on ? ` · ${v.visited_on}` : ""}${v.confirmed ? "" : " (기업 확인 전)"}`,
    `관찰한 직무: ${roles.join(", ") || BLANK}`,
    `이해한 기술·제품·사업: ${v.understood ?? BLANK}`,
    `직접 한 활동: ${did.join(" / ") || "없음(관찰만)"}${v.activity_text ? ` — ${v.activity_text}` : ""}`,
    `내가 이은 전공 영역: ${doms.join(", ") || BLANK}`,
    "이후 행동: 탐방에서 본 판단 하나를 수업·프로젝트에서 직접 해 보고 경험으로 기록",
  ];
  const cautions = [
    observeOnly
      ? "관찰만 한 기록입니다. 자기소개서·면접에서 `할 수 있다` 가 아니라 `보았다·이해했다` 로 씁니다."
      : "직접 해 본 활동은 `경험으로 옮기기` 로 공통 경험 입력에 넣어야 판정에 들어갑니다. 이 기록만으로는 역량이 확인되지 않습니다.",
    ...(v.confirmed ? [] : ["등록된 탐방이 아니라 기업 이름이 확인 전입니다. 지원서에 쓰기 전에 공식 이름을 확인합니다."]),
    "수치·기간·성과는 직접 적습니다. 이 초안은 문장을 대신 써 주지 않습니다.",
  ];
  return { links: roles.map((r) => ({ role: r, domains: doms })), letter, interview, portfolio, observeOnly, cautions };
}
