import { isoDate, type RawPosting } from "./ingest";

/**
 * 잡인더스트리 **자체 API** 로 공고를 받는 자리(2026-11-01 대표 지시: "MAT은 잡인더스트리
 * api 받아다가 진행해", "잡인더스트리 자체 API").
 *
 * **아직 비어 있다.** API 문서가 오기 전이라 주소 · 인증 · 응답 꼴을 모른다. 그래서
 * `JI_API_READY` 가 false 이고, 그동안은 열쇠가 Railway 에 먼저 들어와도 **지금처럼
 * 공개 화면을 읽는다**(`jobindustry.ts` 의 `jiSource`). 문서가 오면 이 파일만 채우고
 * `JI_API_READY` 를 켠다. 켜는 것은 운영 수집 방식을 바꾸는 일이라 대표 승인 뒤다.
 *
 * **열쇠는 Railway 변수 `JOBINDUSTRY_API_KEY` 에만 있다.** 코드 · 기록 · 오류 글에 적지
 * 않는다: API 를 부르는 함수는 오류에 HTTP 상태만 남긴다(채울 때 지킨다).
 *
 * **저장하는 것은 화면을 읽을 때와 같다**(`ingest`): 원문 링크 · 마감일 · 읽어 낸 요구.
 * 같은 공고가 두 번 들어가지 않게 `sourceRef` 는 화면의 `idx` 와 같은 번호를 쓴다
 * (API 의 공고 번호가 `idx` 와 같은지는 잡인더스트리에 묻는다).
 */

/** 문서를 받아 아래를 채운 뒤에만 켠다 */
export const JI_API_READY = false;

export function jiApiKey(): string | null {
  const t = (process.env.JOBINDUSTRY_API_KEY ?? "").trim();
  return t || null;
}

/**
 * API 공고 하나에서 **우리가 쓰는 칸**. 이름은 우리 쪽 이름이고, 문서가 오면
 * `fromApi` 에서 API 의 실제 칸 이름과 잇는다.
 */
export type JiApiPosting = {
  /** 화면의 `idx` 와 같은 번호여야 한다 */
  id: string;
  /** 게시판(출연연 430 · 교원 임용 439 · 공공기관 486 · 기업 R&D 487 · 대학원생 488) */
  board: string;
  title: string;
  /** 본문 글자. 통이미지 공고면 비어 있을 수 있다 */
  bodyText: string;
  /** 본문이 그림일 때 그림 주소(그림 읽기는 대표 결정 뒤) */
  images: string[];
  /** 마감일. `상시` · `채용 시까지` 면 null */
  closesOn: string | null;
  postedOn: string | null;
  /** 근무지 */
  address: string | null;
  /** 원문 화면 주소. 없으면 게시판 · 번호로 만든다 */
  url: string | null;
};

const PROD_SITE = "https://www.jobindustry.co.kr";

/** API 공고 하나를 지금 저장 꼴로. 본문도 제목도 없으면 넣지 않는다 */
export function fromApi(p: JiApiPosting, source: string): RawPosting | null {
  const title = p.title.trim();
  const body = p.bodyText.trim();
  if (!title && !body) return null;
  return {
    source,
    sourceRef: p.id,
    url: p.url || `${PROD_SITE}/${p.board}/?bmode=view&idx=${p.id}`,
    title,
    body,
    address: p.address?.trim() || null,
    postedOn: isoDate(p.postedOn),
    closesOn: isoDate(p.closesOn),
  };
}

/** 문서가 오면 채운다. 그 전에는 부르지 않는다(`JI_API_READY`) */
export async function listApi(_opts: { firstFill: boolean }): Promise<JiApiPosting[]> {
  throw new Error("jobindustry api: 문서를 받기 전이라 비어 있다");
}
