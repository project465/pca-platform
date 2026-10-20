/**
 * **PDF GOLD MASTER 3차 · 손으로 쓴 안내 자료를 읽는 자리.** 직무 일반 안내
 * (`data/report-gm/biz-role-guide.json`)와 기업별 탐색 안내
 * (`data/report-gm/biz-company-guide.json`)는 측정·채점에 쓰이지 않는다. 리포트가
 * 직무와 기업을 설명할 때만 읽는다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { VerifyLevel } from "./words";

export type RoleGuide = {
  summary: string; responsibilities: string[];
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
