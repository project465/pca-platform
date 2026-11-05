import { isProduction } from "@/lib/env";
import type { RawPosting } from "./ingest";
import { JI_BOARDS, parseView, type ListCard } from "./jobindustry-parse";
import { envInt, newImwebState, runImweb, viewUrl, type ImwebConfig, type ImwebResult } from "./imweb";
import { degreeOf, employmentOf, fieldOf, kindOf, periodEnd, regionLabelOf, splitFields } from "./meta";

/**
 * 잡인더스트리 공고를 MAT 공고로 받아 온다(2026-10-31 대표 지시: "공고는 잡인더꺼로").
 *
 * **열쇠가 없다.** 공고가 아임웹 게시판 글이고 RSS 가 없어서, 로그인 없이 열리는
 * 공개 목록과 상세 화면을 읽는다. 우리 회사 사이트다.
 *
 * **그 사이트 주소만 연다.** 바탕 주소는 코드에 고정이고, 시험용 바탕은 운영이
 * 아닌 배포본에서 `JOBINDUSTRY_BASE` 로만 바꾼다(`partner-job.ts` 와 같은 까닭).
 *
 * **모든 게시판 · 모든 쪽을 여러 당번에 나눠 읽는다**(2026-11-03, `imweb.ts`). 첫 쪽은 당번마다,
 * 나머지 쪽은 게시판마다 `JOBINDUSTRY_PAGES_PER_TICK`(기본 3)쪽씩 `JOBINDUSTRY_MAX_PAGES`(기본 40)쪽까지.
 * 상세는 당번 한 번에 `JOBINDUSTRY_MAX_DETAIL`(기본 40)개까지 부르고 나머지는 다음 당번이 이어 부른다.
 * 부를 때마다 `JOBINDUSTRY_DELAY_MS`(기본 800)만큼 쉰다. 한 바퀴가 끝나면 `JOBINDUSTRY_REWALK_HOURS`
 * (기본 24)시간 뒤에 다시 돈다. 전의 `JOBINDUSTRY_BACKFILL_PAGES` 는 이제 읽지 않는다.
 *
 * **저장하는 것**(`ingest`): 원문 링크 · 마감일 · 읽어 낸 요구, 그리고 카드 칸(제목 · 분류 · 분야 ·
 * 학위 표시 · 지역 · 종류 · 고용 형태 · 본문 칸). 본문은 요구를 읽는 데만 쓰고 담지 않는다. 제목을 담는 까닭은 `ingest.ts`
 * 머리말에 있다. 학생은 원문 링크로 그 공고에 직접 지원한다.
 */

export const JI_SOURCE = "jobindustry";
const PROD_BASE = "https://www.jobindustry.co.kr";

export function jiBase(): string {
  const t = (process.env.JOBINDUSTRY_BASE ?? "").trim().replace(/\/+$/, "");
  return t && !isProduction() ? t : PROD_BASE;
}

/** 몇 분마다 받아 오나. 기본 10분(2026-10-31 대표 지시) */
export function jiIntervalMs(): number {
  const n = Number(process.env.JOBINDUSTRY_INTERVAL_MIN ?? 10);
  return (Number.isFinite(n) && n >= 1 ? n : 10) * 60_000;
}

/** 끄려면 `JOBINDUSTRY_SYNC=off` */
export function jiEnabled(): boolean {
  return (process.env.JOBINDUSTRY_SYNC ?? "").trim().toLowerCase() !== "off";
}

export async function get(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    redirect: "error",
    headers: { "user-agent": "CareerMatri-MAT/1.0 (+https://app.careermatri.com)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

type JiBoard = (typeof JI_BOARDS)[number];

/**
 * 상세 한 쪽을 담을 꼴로. 본문은 `모집 분야 · 지원 자격 · 고용 형태 · 근무지 · 접수 기간` 칸으로 나눠 읽는다
 * (`splitFields`, 연구비 · 평가위원 게시판의 `소관 부처` · `모집 인원` 같은 칸도 같이 받는다).
 *
 * - 제목: 상세에서 읽은 것이 먼저, 없으면 목록 카드의 제목. 둘 다 없으면 빈 제목으로 넘기고 `ingest` 가 뺀다
 * - 학위: 지원 자격 칸(없으면 본문 전체). 지역: 근무지 칸. 마감: 접수 기간의 끝 날짜(`상시 모집` 은 비운다)
 * - 분야: 목록 카드 · 상세 머리의 아임웹 분류(`IT/AI/빅데이터/블록체인`)를 그대로. 없으면 낱말 표(`fieldOf`)
 * - 종류: 게시판으로 정하고, 488 공고라도 고용 형태가 정규직 · 계약직이면 채용(`kindOf`)
 */
export function jiRow(b: JiBoard, idx: string, html: string, card?: ListCard): RawPosting {
  const v = parseView(html, card?.tags ?? []);
  /* 제목 · 본문을 다 못 읽어도 줄을 넘긴다. `ingest` 가 제목 없음으로 빼고 번호를 적어 다시 부르지 않는다 */
  const title = v.title || card?.title || "";
  const tags = [...new Set([...(card?.tags ?? []), ...v.tags])];
  const f = splitFields(v.body);
  const deg = degreeOf(f.지원자격 ?? `${title}\n${v.body}`);
  const reg = regionLabelOf(title, v.body, [], f.근무지);
  const employment = employmentOf(f.고용형태);
  /* 접수 기간 칸이 있으면 그 끝 날짜가 마감이다(`상시 모집` 이면 비운다). 칸이 없으면 본문의 `마감` 말에서 */
  const closes = f.접수기간 !== undefined ? periodEnd(f.접수기간) : v.closes;
  return {
    source: JI_SOURCE, sourceRef: idx, url: viewUrl(PROD_BASE, b.path, idx), title, body: v.body,
    address: null, postedOn: null, closesOn: closes || null,
    meta: {
      category: b.label, field: tags[0] ?? fieldOf(title, v.body),
      degreeLabel: deg.label, degreeMin: deg.min, kind: kindOf(b.kind, employment),
      regionLabel: reg.label, abroad: reg.abroad, employmentType: employment,
      fields: Object.keys(f).length ? f : null,
    },
  };
}

/* 이어 읽는 자리. 이 프로세스 안에만 있다(`imweb.ts` 머리말) */
const STATE = newImwebState();

export async function runJobindustry(opts: { get?: (url: string) => Promise<string>; state?: typeof STATE; test?: Pick<ImwebConfig<{ path: string }>, "known" | "save" | "log"> } = {}): Promise<ImwebResult> {
  return runImweb({
    source: JI_SOURCE, operation: "jobs.jobindustry", base: jiBase(), boards: JI_BOARDS,
    ...opts.test, get: opts.get ?? get, toRow: jiRow,
    maxPages: envInt("JOBINDUSTRY_MAX_PAGES", 40, 1, 200),
    pagesPerTick: envInt("JOBINDUSTRY_PAGES_PER_TICK", 3, 0, 40),
    maxDetail: envInt("JOBINDUSTRY_MAX_DETAIL", 40, 1, 400),
    delayMs: envInt("JOBINDUSTRY_DELAY_MS", 800, 0, 10_000),
    rewalkMs: envInt("JOBINDUSTRY_REWALK_HOURS", 24, 1, 24 * 30) * 3600_000,
  }, opts.state ?? STATE);
}
