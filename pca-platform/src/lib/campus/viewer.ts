/**
 * 담당자가 **자기 학교만** 본다.
 *
 * 집계 쪽과 내려받는 쪽과 운영 요약 쪽이 범위를 각자 정하면, 어느 날 한
 * 자리가 기관을 빠뜨리고 **A 대학 담당자가 B 대학 학생의 줄을 받는다.**
 * 그래서 묻는 자리를 하나로 둔다(설계 원칙 10 · `students/actions.ts` 의
 * `scope()` 와 같은 규칙이다).
 *
 * **여기는 읽는 쪽이다.** 고치는 쪽은 `org_admin` 만 쓰는 저쪽 문을 지난다.
 */
import { requireRole } from "@/lib/session";
import { orgsOf } from "@/lib/org";
import { university } from "@/lib/campus/registry";

type SessionUser = Awaited<ReturnType<typeof requireRole>>;

export type CampusViewer = {
  /** 로그인한 사람. **역할을 글자로 넓히지 않는다**: 넓히면 역할 이름표를
      읽는 자리가 그 값을 색인하지 못한다 */
  user: SessionUser;
  orgs: { id: string; code: string; name: string }[];
  orgIds: number[];
  /** 이 기관이 학교 등록부의 어느 학교인가. 아니면 `null` */
  uni: string | null;
  org: { id: string; code: string; name: string } | null;
};

export async function campusViewer(): Promise<CampusViewer> {
  const user = await requireRole(["org_admin", "instructor"]);
  const orgs = await orgsOf(user.id);
  return {
    user,
    orgs,
    orgIds: orgs.map((o) => Number(o.id)),
    uni: orgs.map((o) => o.code).find((c) => Boolean(university(c))) ?? null,
    org: orgs[0] ?? null,
  };
}

/**
 * 주소에 적힌 좁히는 값을 읽는다.
 *
 * **빈 글자를 값으로 넘기지 않는다.** select 를 비워 보내면 `""` 가 오고,
 * 그대로 질의에 넣으면 **아무 학과도 없는 조건**이 되어 담당자가 빈 표를
 * 받는다. 날짜 꼴이 아닌 값도 버린다: `from=abc` 를 그대로 넘기면
 * PostgreSQL 이 그 자리에서 거절하고 화면이 통째로 멈춘다.
 */
export type CampusQuery = {
  from: string | null; to: string | null;
  college: string | null; department: string | null;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function campusQuery(sp: Record<string, string | undefined>): CampusQuery {
  const one = (v: string | undefined) => {
    const s = (v ?? "").trim();
    return s ? s : null;
  };
  const day = (v: string | undefined) => {
    const s = one(v);
    return s && DAY.test(s) ? s : null;
  };
  return {
    from: day(sp.from), to: day(sp.to),
    college: one(sp.college), department: one(sp.department),
  };
}

/** 좁혀 본 조건을 다시 주소로. 내려받기 링크와 쪽 이동이 같은 값을 든다 */
export function campusQueryString(
  q: CampusQuery, extra: Record<string, string> = {},
): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...q, ...extra })) {
    if (v) p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** 좁혀 본 조건을 사람이 읽는 한 줄로. 내려받은 자료의 머리에도 적는다 */
export function campusQueryKo(
  q: CampusQuery,
  name: { college: (k: string) => string; dept: (k: string) => string },
): string {
  const bits: string[] = [];
  if (q.from || q.to) bits.push(`${q.from ?? "처음"} ~ ${q.to ?? "오늘"}`);
  if (q.college) bits.push(name.college(q.college));
  if (q.department) bits.push(name.dept(q.department));
  return bits.length ? bits.join(" · ") : "전체 기간 · 전체 학과";
}
