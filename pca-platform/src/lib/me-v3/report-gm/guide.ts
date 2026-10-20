/**
 * **PDF GOLD MASTER 3차 · 손으로 쓴 안내 자료를 읽는 자리.** 직무 일반 안내
 * (`data/report-gm/biz-role-guide.json`)와 기업별 탐색 안내
 * (`data/report-gm/biz-company-guide.json`)는 측정·채점에 쓰이지 않는다. 리포트가
 * 직무와 기업을 설명할 때만 읽는다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { VerifyLevel } from "./words";

/** 목표 직무 기준으로 쓴 실행 과제. 다른 직무의 영역 문장을 끌어오지 않으려고 직무마다 따로 적는다 */
export type Practice = { task: string; output: string; check: string };
/** 그 직무에게 이 영역이 무엇인지(연결 이유) · 과제 문장을 영역 말로 쓸지 직무 말로 쓸지 · 과제 앞머리 */
export type Lens = { why: string; mode: "domain" | "role"; ctx: string };
export type RoleGuide = {
  summary: string; practiceWhere: string; practice: Record<string, Practice>; lens: Record<string, Lens>;
  responsibilities: string[];
  process: { step: string; what: string }[];
  knowledge: string[]; tools: string[]; experiences: string[]; entry: string[];
  learnOrder: { step: string; why: string }[];
  firstProject: { title: string; goal: string; steps: string[]; output: string; check: string };
  portfolio: string[]; interview: { q: string; why: string }[]; postingCheck: string[]; watch: string;
};
export type GuideSource = { kind: string; title: string; url?: string | null; checked_on: string };
export type CompanyFact = { text: string; kind: VerifyLevel; src?: GuideSource };
export type CompanyJobGuide = {
  flow: string[]; learn: string[];
  project: { title: string; steps: string[]; output: string };
  portfolio: string; interview: string[]; posting: string[];
};
export type CompanyGuide = {
  headline: string; facts: CompanyFact[]; market: string; products: string[];
  interpret: string[]; why: string; jobs: Record<string, CompanyJobGuide>;
};

let R: Record<string, RoleGuide> | null = null;
let C: Record<string, CompanyGuide> | null = null;
const read = <T>(f: string): T => JSON.parse(readFileSync(path.join(process.cwd(), f), "utf8")) as T;

export function roleGuide(code: string): RoleGuide | null {
  R ??= read<{ roles: Record<string, RoleGuide> }>("data/report-gm/biz-role-guide.json").roles;
  return R[code] ?? null;
}
export function companyGuide(id: string): CompanyGuide | null {
  C ??= read<{ companies: Record<string, CompanyGuide> }>("data/report-gm/biz-company-guide.json").companies;
  return C[id] ?? null;
}
