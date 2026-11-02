/**
 * **학과 → 검사 연결표**(2026-11-02 대표 지시: 새 기관을 열 때 모든 학과의 연결을 뽑아 확인한다).
 *
 * 등록부의 기관마다 학과 하나에 한 줄: 학과 · 붙은 검사(Core) · 갈래 · 학생 화면 상태(검사 가능 / 준비 중) · 준비 중인 까닭.
 * 새 기관을 등록부에 넣은 뒤 이 표를 뽑아 사람이 한 번 읽는다.
 *
 *   npm run campus:mapping                 기관 전부를 표로(화면)
 *   UNI=KUS npm run campus:mapping         한 기관만
 *   OUT=var/mapping.csv npm run campus:mapping   CSV 로
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { allLeaves, mappingStatusOf, statusOf, universities, HELD_SPECIALIZATIONS, leafOpen } from "../src/lib/campus/registry";
import { registry } from "../src/lib/me-v3/core-registry";

const coreName = new Map(registry().cores.map((c) => [c.code, c.name_ko]));
const want = (process.env.UNI ?? "").toUpperCase();
const rows: string[][] = [["기관", "학년도", "단과대학", "학과", "학과 코드", "검사(Core)", "갈래", "상태", "까닭"]];
const tally = new Map<string, { ready: number; held: number }>();
for (const u of universities()) {
  if (want && u.university_code !== want) continue;
  const seen = new Set<string>();
  for (const r of allLeaves(u)) {
    if (seen.has(r.leaf.code)) continue;
    seen.add(r.leaf.code);
    const st = statusOf(u, r);
    const ms = mappingStatusOf(r.leaf);
    const why = st === "READY" ? ""
      : r.leaf.specialization && HELD_SPECIALIZATIONS.has(r.leaf.specialization) ? "전용 기준 준비 중(외국어문·지역학 등)"
      : ms === "CORE_REQUIRED" ? "붙일 검사가 정해지지 않음"
      : ms === "SPECIALIZATION_REQUIRED" ? "갈래 원고가 아직 없음"
      : r.leaf.student_visible === false ? "학생에게 보이지 않게 둔 자리"
      : !leafOpen(u, r.leaf) ? "이 기관에서 아직 열지 않은 학과"
      : "그 검사가 이 시장에서 아직 열리지 않음";
    const t = tally.get(u.university_code) ?? { ready: 0, held: 0 };
    if (st === "READY") t.ready += 1; else t.held += 1;
    tally.set(u.university_code, t);
    rows.push([u.university_code, String(r.catalog.catalog_year), r.college.name, r.leaf.name, r.leaf.code,
      r.leaf.core_code ? `${coreName.get(r.leaf.core_code) ?? r.leaf.core_code}` : "—", r.leaf.specialization ?? "",
      st === "READY" ? "검사 가능" : "준비 중", why]);
  }
}
if (process.env.OUT) {
  const out = path.resolve(process.env.OUT);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `﻿${rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n")}\r\n`);
  console.log(`표 → ${out}`);
} else {
  for (const r of rows.slice(1)) if (r[7] !== "검사 가능") console.log(`  준비 중  ${r[0]} ${r[3]} (${r[4]}) · ${r[5]} · ${r[8]}`);
}
for (const [k, v] of tally) console.log(`${k}: 검사 가능 ${v.ready} · 준비 중 ${v.held}`);
