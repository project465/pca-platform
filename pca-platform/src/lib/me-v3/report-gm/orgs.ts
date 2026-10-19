/**
 * **지역·기관 후보를 고르는 자리. 기관 이름을 만들지 않는다.**
 *
 * 읽는 것은 `data/region/*.json` 한 벌이고 그 파일의 줄은 전부 출처와
 * 확인 수준을 들고 있다. 여기서 하는 일은 그 줄 가운데 **이 학생의 응답과
 * 이어지는 줄**을 고르고, 왜 이어지는지를 코드로 돌려주는 것뿐이다.
 *
 * - **점수를 만들지 않는다.** 이어지는 까닭의 수로 차례를 세우지만 그 수를
 *   종이에 적지 않는다(적합도 숫자가 되면 근거처럼 읽힌다).
 * - **추천이 아니다.** 직업정보제공사업 신고로 할 수 있는 것은 정보 제공
 *   까지라 `검토할 직무·기업 후보` 로만 부른다(CLAUDE.md 법적 범위).
 * - **채용 여부를 적지 않는다.** 확인한 줄이 없으므로 늘 `미확인` 이다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export type Verification =
  | "OFFICIAL" | "SECONDARY_DIRECTORY" | "SECONDARY_NEWS" | "SECONDARY_COMMUNITY"
  | "CONFLICTING" | "UNVERIFIED";

export type OrgRow = {
  id: string; name: string; region: string;
  scope: "LOCAL" | "ADJACENT" | "NATIONAL";
  org_type: "PUBLIC_CORP" | "LOCAL_PUBLIC" | "LARGE" | "MID" | "SME";
  location: { text: string; kind: "HQ" | "SITE" | "BASE"; status: Verification };
  workplace: { text: string | null; status: Verification; note?: string };
  business: { text: string; status: Verification };
  industries: string[]; roles: string[]; domains: string[];
  sources: { url: string; kind: Verification; what: string }[];
  hiring: { status: "UNVERIFIED"; note?: string };
};

export type RegionFact = {
  region: string; fact: string;
  source: { url: string; kind: Verification; title: string };
};

export type OrgSet = {
  checked_on: string; status: string; note: string;
  region_facts: RegionFact[]; orgs: OrgRow[];
};

const FILE = path.join(process.cwd(), "data/region/kr-chungcheong-orgs.v1.json");

export function orgSet(file = FILE): OrgSet {
  return JSON.parse(readFileSync(file, "utf8")) as OrgSet;
}

export type Why =
  | { kind: "GOAL_INDUSTRY"; code: string }
  | { kind: "INTEREST_INDUSTRY"; code: string }
  | { kind: "ROLE"; code: string }
  | { kind: "DOMAIN"; codes: string[] }
  | { kind: "ORG_TYPE"; code: string };

export type Candidate = { org: OrgRow; why: Why[] };

/** 조직환경(OC*)과 기관 유형이 같은 자리를 가리키는가. **짐작으로 넓히지 않는다** */
const OC_TO_TYPE: Record<string, OrgRow["org_type"][]> = {
  OC4: ["PUBLIC_CORP", "LOCAL_PUBLIC"],
  OC7: ["SME"],
};

export type Picks = {
  goalIndustry: string | null; industries: string[];
  goalRole: string | null; roles: string[];
  goalOrg: string | null;
  /** 근거가 섰거나 해 본 것이 확인된 영역 */
  domains: string[];
};

export function whyOf(o: OrgRow, p: Picks): Why[] {
  const out: Why[] = [];
  if (p.goalIndustry && o.industries.includes(p.goalIndustry)) out.push({ kind: "GOAL_INDUSTRY", code: p.goalIndustry });
  for (const c of p.industries) {
    if (c !== p.goalIndustry && o.industries.includes(c)) out.push({ kind: "INTEREST_INDUSTRY", code: c });
  }
  for (const c of [p.goalRole, ...p.roles].filter((x): x is string => !!x)) {
    if (o.roles.includes(c) && !out.some((w) => w.kind === "ROLE" && w.code === c)) out.push({ kind: "ROLE", code: c });
  }
  const ds = o.domains.filter((d) => p.domains.includes(d));
  if (ds.length) out.push({ kind: "DOMAIN", codes: ds });
  if (p.goalOrg && (OC_TO_TYPE[p.goalOrg] ?? []).includes(o.org_type)) out.push({ kind: "ORG_TYPE", code: p.goalOrg });
  return out;
}

/**
 * 고른다. 지역(캠퍼스 권역 + 인접)에서 최대 `local` 곳, 전국에서 `national` 곳.
 *
 * **이어지는 까닭이 없는 줄은 세우지 않는다.** 모자라면 모자란 대로 돌려주고,
 * 그 수를 채우려고 아무 기관이나 넣지 않는다.
 */
export function candidates(set: OrgSet, p: Picks, local = 8, national = 3): {
  local: Candidate[]; national: Candidate[];
} {
  const rank = (c: Candidate) =>
    (c.why.some((w) => w.kind === "GOAL_INDUSTRY") ? 4 : 0)
    + c.why.filter((w) => w.kind === "ROLE").length * 2
    + c.why.filter((w) => w.kind === "INTEREST_INDUSTRY").length
    + ((c.why.find((w) => w.kind === "DOMAIN") as { codes: string[] } | undefined)?.codes.length ?? 0)
    + (c.why.some((w) => w.kind === "ORG_TYPE") ? 1 : 0)
    /* 위치가 출처끼리 다르거나 확인되지 않은 줄은 한 칸 뒤로 둔다(빼지는 않는다) */
    - (c.org.location.status === "CONFLICTING" || c.org.location.status === "UNVERIFIED" ? 2 : 0);
  const all = set.orgs.map((org) => ({ org, why: whyOf(org, p) })).filter((c) => c.why.length);
  const by = (xs: Candidate[]) => [...xs].sort((a, b) => rank(b) - rank(a) || a.org.name.localeCompare(b.org.name, "ko"));
  return {
    local: by(all.filter((c) => c.org.scope !== "NATIONAL")).slice(0, local),
    national: by(all.filter((c) => c.org.scope === "NATIONAL")).slice(0, national),
  };
}
