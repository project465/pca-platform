/**
 * 원어민 검토 묶음. 한국어 원고(kr)와 영어·일본어·중국어 원고를 같은 자리끼리
 * 한 줄에 놓아 CSV 로 낸다. 검토하는 분은 자기 언어 칸만 읽고 `판정` 과
 * `고친 문장` 칸을 채운다.
 *
 *   ../node_modules/.bin/tsx scripts/translation-pack.ts <나갈 폴더>
 *
 * 원고를 손으로 옮겨 적지 않는다. 원고를 고친 날 이 표가 옛 문장을 들고
 * 있으면 검토가 이미 지운 문장을 고치게 된다. 다시 돌리면 새 표가 나온다.
 *
 * 싣는 것은 한국어 칸에 한글이 있는 자리뿐이다(주소 · 나라 코드 · 숫자는
 * 번역할 글이 아니다). 대상 언어 칸에 한글이 남아 있으면 `한글 남음` 으로
 * 적는다. 사업자 표시처럼 일부러 한국어로 둔 자리도 거기 걸리므로 검토하는
 * 분이 지나치면 된다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { kr } from "../src/content/kr";
import { en } from "../src/content/en";
import { ja } from "../src/content/ja";
import { zh } from "../src/content/zh";

type Flat = Map<string, string>;
const HANGUL = /[가-힣]/;

function flatten(v: unknown, path: string, out: Flat): void {
  if (typeof v === "string") { out.set(path, v); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => flatten(x, `${path}[${i}]`, out)); return; }
  if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) flatten(x, path ? `${path}.${k}` : k, out);
  }
}

const flat = (o: unknown): Flat => { const m: Flat = new Map(); flatten(o, "", m); return m; };
const KO = flat(kr);
const LANGS = { en: flat(en), ja: flat(ja), zh: flat(zh) } as const;

const csv = (s: string) => `"${s.replace(/"/g, '""')}"`;
const outDir = process.argv[2] ?? "translation-review";
mkdirSync(outDir, { recursive: true });

const summary: string[] = [];
for (const [lang, m] of Object.entries(LANGS)) {
  const rows = [["자리", "한국어 원문", `${lang} 번역`, "점검", "판정(유지/수정)", "고친 문장", "메모"]];
  let n = 0, missing = 0, leak = 0;
  for (const [path, ko] of KO) {
    if (!HANGUL.test(ko)) continue;
    const t = m.get(path);
    const flags: string[] = [];
    if (t === undefined) { flags.push("번역 없음"); missing++; }
    else if (HANGUL.test(t)) { flags.push("한글 남음"); leak++; }
    rows.push([path, ko, t ?? "", flags.join(" · "), "", "", ""]);
    n++;
  }
  /* 한국어에 없는 자리가 번역에만 있으면 원고 구조가 갈린 것이다 */
  const extra = [...m.keys()].filter((p) => !KO.has(p) && HANGUL.test(m.get(p) ?? "") === false
    && /[A-Za-z぀-ヿ一-鿿]/.test(m.get(p) ?? ""));
  for (const p of extra) rows.push([p, "", m.get(p) ?? "", "한국어 원고에 없는 자리", "", "", ""]);
  writeFileSync(`${outDir}/review-${lang}.csv`, "﻿" + rows.map((r) => r.map(csv).join(",")).join("\r\n"));
  summary.push(`${lang}: ${n}줄 · 번역 없음 ${missing} · 한글 남음 ${leak} · 한국어에 없는 자리 ${extra.length}`);
}
console.log(summary.join("\n"));
