/**
 * 명단 읽기 — 붙여넣기든 엑셀이든 같은 모양으로 만든다.
 *
 * 학과 담당자가 주는 파일은 매번 다르다. 열 이름도 "이름/성명/Name" 이고
 * 식별자도 "학번/아이디/이메일" 이다. 열 순서를 지키라고 요구하면 그 요구가
 * 곧 도입 장벽이 되므로, 머리글을 읽어서 맞춘다.
 *
 * 머리글이 아예 없으면 첫 두 칸을 이름·식별자로 본다 — 붙여넣기 습관이다.
 */
import { readTable } from "./sheet-read";

export type RosterLine = { name: string; ident: string };
export type RosterParse = {
  lines: RosterLine[];
  /** 읽어내지 못한 줄. 화면에 그대로 보여 준다 */
  skipped: { line: string; why: string }[];
  /** 어느 열을 무엇으로 봤는지. 담당자가 확인할 수 있게 돌려준다 */
  columns: { name: string; ident: string } | null;
};

export const MAX_LINES = 2000;

const NAME_KEYS = ["이름", "성명", "학생명", "name", "student name", "ad", "adı", "ад", "аты"];
const IDENT_KEYS = [
  "학번", "아이디", "id", "student id", "이메일", "메일", "email", "e-mail",
  "no", "numara", "öğrenci no", "email adresi", "почта", "email address",
];

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function findColumn(head: string[], keys: string[]): number {
  // 정확히 같은 것을 먼저 찾고, 없으면 포함하는 것을 찾는다.
  for (const exact of [true, false]) {
    for (let i = 0; i < head.length; i++) {
      const h = norm(head[i]);
      if (!h) continue;
      for (const k of keys) {
        if (exact ? h === k : h.includes(k)) return i;
      }
    }
  }
  return -1;
}

function looksLikeIdent(v: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v) || /^[A-Za-z0-9_.-]{3,40}$/.test(v);
}

function collect(rows: string[][], nameCol: number, identCol: number, from: number): RosterParse {
  const lines: RosterLine[] = [];
  const skipped: RosterParse["skipped"] = [];
  const seen = new Set<string>();

  for (let i = from; i < rows.length && lines.length < MAX_LINES; i++) {
    const r = rows[i];
    if (!r || !r.some((c) => c)) continue; // 빈 줄은 조용히 넘긴다
    const shown = r.filter(Boolean).join(", ").slice(0, 80);

    const name = (r[nameCol] ?? "").trim();
    const ident = (r[identCol] ?? "").trim();

    if (!name || !ident) {
      skipped.push({ line: shown, why: "이름 또는 학번 칸이 비어 있습니다." });
      continue;
    }
    if (name.length > 60) {
      skipped.push({ line: shown, why: "이름이 너무 깁니다." });
      continue;
    }
    if (!looksLikeIdent(ident)) {
      skipped.push({
        line: shown,
        why: "학번·아이디는 영문·숫자 3자 이상이거나 이메일이어야 합니다.",
      });
      continue;
    }
    const key = ident.toLowerCase();
    if (seen.has(key)) {
      skipped.push({ line: shown, why: "같은 학번이 앞줄에 이미 있습니다." });
      continue;
    }
    seen.add(key);
    lines.push({ name, ident });
  }

  return { lines, skipped, columns: null };
}

/** 문자열 격자 → 명단. 머리글을 찾아 열을 맞춘다. */
export function parseRows(rows: string[][]): RosterParse {
  const nonEmpty = rows.filter((r) => r.some((c) => c));
  if (!nonEmpty.length) return { lines: [], skipped: [], columns: null };

  const head = nonEmpty[0];
  const nameCol = findColumn(head, NAME_KEYS);
  const identCol = findColumn(head, IDENT_KEYS);

  if (nameCol >= 0 && identCol >= 0 && nameCol !== identCol) {
    const out = collect(nonEmpty, nameCol, identCol, 1);
    out.columns = { name: head[nameCol], ident: head[identCol] };
    return out;
  }

  // 머리글을 못 찾았다. 첫 두 칸으로 보되, 첫 줄이 머리글처럼 생겼으면 건너뛴다.
  const firstLooksLikeHeader = !looksLikeIdent((head[1] ?? "").trim());
  return collect(nonEmpty, 0, 1, firstLooksLikeHeader ? 1 : 0);
}

export function parseText(text: string): RosterParse {
  const rows = text
    .split("\n")
    .map((l) => l.split(/[,\t;]/).map((x) => x.trim()))
    .filter((r) => r.some((c) => c));
  return parseRows(rows);
}

export function parseFile(filename: string, buf: Buffer): RosterParse {
  return parseRows(readTable(filename, buf));
}
