/**
 * 세종 콘텐츠 읽기. **읽기만 한다.**
 *
 * 공통 콘텐츠 중 읽는 것은 ME_V3 taxonomy 의 축 이름과 단계 문구뿐이다
 * (`sites/pca-platform/content/me-v3-2-taxonomy.json`). 그 파일을 고치지
 * 않는다. 세종 것은 전부 `src/sejong/content/` 에 있다.
 *
 * **디스크에서 읽지 않고 묶어 넣는다.** 운영 이미지(Dockerfile)는 `src/` 를
 * 싣지 않으므로, 실행 중에 `src/sejong/content` 를 열면 배포본에서만 깨진다.
 * JSON 을 import 하면 빌드가 번들에 넣는다.
 */
import type { AxisInfo, Instrument } from "./analysis";
import taxonomyJson from "../../../sites/pca-platform/content/me-v3-2-taxonomy.json";
import instrumentJson from "../content/instrument.sj-jobseeker-demo-0.json";
import orgsJson from "../content/orgs.preview.json";
import linksJson from "../content/org-links.demo.json";
import regionJson from "../content/region.sejong.json";

export type Verify =
  | "OFFICIAL_CROSSCHECKED" | "OFFICIAL_SINGLE" | "SECONDARY_ONLY" | "CONFLICTING" | "UNREACHABLE";

export type OrgSource = {
  id: string; kind: string; title: string; url: string; checked_on: string; confirms: string;
};

export type Org = {
  id: string;
  name: string;
  org_type: "PRIVATE" | "PUBLIC_INSTITUTION" | "RESEARCH_INSTITUTE" | "LOCAL_PUBLIC_CORP";
  region_scope: "SEJONG" | "DAEJEON" | "CHUNGNAM" | "CHUNGBUK";
  location_basis: "HQ_IN_SEJONG" | "SITE_IN_SEJONG_HQ_ELSEWHERE" | "UNCONFIRMED";
  hq: { address: string | null; src: string[] };
  sejong_sites: { label: string; kind: string; address: string; src: string[] }[];
  industry_text: string;
  job_area_hints: string[];
  hiring: { status: "UNVERIFIED" };
  verify: Verify;
  sources: OrgSource[];
  notes?: string;
  location_note?: string;
  access: string;
  display_ready: boolean;
};

export type RegionProfile = {
  core: { code: string; name: string; rule: string };
  aux: { code: string; name: string }[];
  aux_rule: string;
  aux_status: string;
  facts: { text: string; verify: Verify; sources: { kind: string; title: string; url: string; checked_on: string }[] }[];
  notices: { info_only: string; hiring: string; preview: string };
};

export type OrgLinks = {
  note: string;
  links: Record<string, string[]>;
  clusters: { code: string; name: string; where: string; orgs: string[] }[];
};

export type InstrumentFull = Instrument & {
  status_note: string;
  audiences: { note: string; options: { code: string; label: string }[] };
  region_ranges: { note: string; options: { code: string; label: string }[] };
  experience_kinds: { code: string; label: string }[];
};

let cache: {
  instrument: InstrumentFull;
  axisInfo: Record<string, AxisInfo>;
  levels: Record<string, string>;
  orgs: Org[];
  orgsMeta: { status: string; checked_on: string; access_method: string; access_note: string };
  links: OrgLinks;
  region: RegionProfile;
} | null = null;

export function sejongContent() {
  if (cache) return cache;
  const taxonomy = taxonomyJson as unknown as { axes: Record<string, AxisInfo>; levels: Record<string, string> };
  const orgFile = orgsJson as unknown as {
    status: string; checked_on: string; access_method: string; access_note: string; orgs: Org[];
  };
  cache = {
    instrument: instrumentJson as unknown as InstrumentFull,
    axisInfo: taxonomy.axes,
    levels: taxonomy.levels,
    orgs: orgFile.orgs,
    orgsMeta: {
      status: orgFile.status, checked_on: orgFile.checked_on,
      access_method: orgFile.access_method, access_note: orgFile.access_note,
    },
    links: linksJson as unknown as OrgLinks,
    region: regionJson as unknown as RegionProfile,
  };
  return cache;
}

export const VERIFY_LABEL: Record<Verify, string> = {
  OFFICIAL_CROSSCHECKED: "공식 출처 2곳 이상 일치",
  OFFICIAL_SINGLE: "공식 출처 1곳",
  SECONDARY_ONLY: "보도 등 2차 출처만",
  CONFLICTING: "출처 간 불일치",
  UNREACHABLE: "출처 확인 불가",
};

export const LOCATION_LABEL: Record<Org["location_basis"], string> = {
  HQ_IN_SEJONG: "본사 세종",
  SITE_IN_SEJONG_HQ_ELSEWHERE: "사업장 세종 · 본사 다른 지역",
  UNCONFIRMED: "소재 확인 필요",
};

export const ORG_TYPE_LABEL: Record<Org["org_type"], string> = {
  PRIVATE: "민간 기업",
  PUBLIC_INSTITUTION: "공공기관",
  RESEARCH_INSTITUTE: "국책연구기관",
  LOCAL_PUBLIC_CORP: "지방 공기업·출연기관",
};

/**
 * 결과지에 실어도 되는 줄인가.
 *
 * 공식 출처로 확인됐고 소재가 확정된 줄만이다. **원문 재확인(`display_ready`)
 * 전이라도 시연에는 싣되**, 화면과 종이에 그 사실을 적는다.
 */
export function reportable(o: Org): boolean {
  return (o.verify === "OFFICIAL_CROSSCHECKED" || o.verify === "OFFICIAL_SINGLE")
    && o.location_basis !== "UNCONFIRMED"
    && o.sejong_sites.length > 0;
}

/** 고른 직무 영역과 이어지는 기업·기관. 순서는 자료 순서이고 점수로 줄 세우지 않는다 */
export function orgsForAreas(areaCodes: string[], opts: { reportableOnly?: boolean } = {}): Org[] {
  const { orgs, links } = sejongContent();
  return orgs.filter((o) => {
    if (opts.reportableOnly && !reportable(o)) return false;
    const l = links.links[o.id] ?? [];
    return areaCodes.length === 0 || l.some((c) => areaCodes.includes(c));
  });
}

export function areaName(code: string): string {
  return sejongContent().instrument.job_areas.find((j) => j.code === code)?.name ?? code;
}
