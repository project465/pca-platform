import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * 첫 화면의 그림 자리와 아이콘.
 *
 * **그림은 장식이 아니라 hero 의 한 축이다.** 왼쪽에 큰 글이 서고
 * 오른쪽에 그림이 서서, 결과지의 첫 화면이 판정을 발표하는 자리가 아니라
 * 학생이 쓰는 화면으로 읽히게 한다.
 *
 * **그 그림을 여기서 그리지 않는다.** 이 파일이 드는 것은 밖에서 받은
 * 공식 그림을 세우는 자리 하나와 선 아이콘뿐이고, 자리를 메우려고 임시로
 * 그린 그림을 두지 않는다: 한 번 두면 그것이 상용 화면으로 읽힌다.
 *
 * **`HeroVisual` 은 갈아 끼우는 자리다.** 밖에서 받은 공식 Hero 그림을
 * `public/brand/hero/` 에 넣으면 그 파일이 선다. **여기서 그림을 그리지
 * 않는다**: 받기 전까지는 아무것도 서지 않고, 그 자리를 메우려고 임시로
 * 그린 그림을 두면 그것이 상용 화면으로 읽힌다.
 */
/**
 * 공식 그림이 들어오면 **이 자리가 그것을 세운다.**
 *
 * `public/brand/hero/` 에 `student-desk.png`(또는 `.webp` · `.jpg`)를 두면
 * 그 파일이 선다. **코드를 고치지 않는다**: 파일을 넣는 것이 곧 교체다.
 * 파일이 없으면 그림 자리를 아예 세우지 않는다(`hasHeroAsset()` 이
 * `false` 면 `page.tsx` 가 그 칸을 그리지 않고 글이 폭을 다 쓴다).
 *
 * - 비율을 찌그러뜨리지 않는다(`object-fit: contain`).
 * - 캐릭터와 소품이 잘리지 않게 폭을 다 쓰고 높이는 그림이 정한다.
 * - 보조기기에는 읽히지 않는다(`alt=""`): 그림이 말하는 것이 바로 옆 글과
 *   같아서, 읽어 주면 같은 말을 두 번 듣는다.
 */
const HERO_FILES = ["student-desk.png", "student-desk.webp", "student-desk.jpg"];
/* **그릴 때마다 본다.** 모듈이 올라올 때 한 번만 보면, 파일을 넣고 서버만
   다시 띄운 자리에서 옛 답이 그대로 남는다. `existsSync` 한 번이라 값이
   싸고, 이 쪽은 응시 하나를 그릴 때 한 번 그린다 */
function heroAssetFile(): string | undefined {
  return HERO_FILES.find(
    (n) => existsSync(join(process.cwd(), "public", "brand", "hero", n)));
}

/** 공식 그림이 들어와 있는가. 쓰는 쪽은 이 값으로 그림 칸을 세운다 */
export function hasHeroAsset(): boolean {
  return heroAssetFile() !== undefined;
}

export function HeroVisual() {
  const heroAsset = heroAssetFile();
  if (!heroAsset) return null;
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img className="rs-hero-img" src={`/brand/hero/${heroAsset}`} alt="" />;
}


/* ══════════════════════════════════════════════════════════════════
   선 아이콘.

   **같은 네모 안에 같은 도형을 넣지 않는다.** 칸마다 그 칸이 무엇을
   말하는지 한눈에 읽히는 모양이고, 굵기(1.8)와 둥근 끝은 전부 같아서
   한 벌로 읽힌다. 색은 쓰는 자리에서 `currentColor` 로 받는다.
   ══════════════════════════════════════════════════════════════════ */
export type IcName =
  | "note" | "spark" | "check" | "list" | "pen" | "plan"
  | "brief" | "chart" | "talk" | "hands" | "compass" | "file" | "plus";

const PATHS: Record<IcName, React.ReactNode> = {
  /* 노트 — 내가 해본 경험 */
  note: (<>
    <path d="M5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H5z" />
    <path d="M5 3.5a1.5 1.5 0 0 0 0 3M8.5 8.5h6M8.5 12h4" />
  </>),
  /* 반짝임 — 쓸 수 있는 것 */
  spark: (<>
    <path d="M12 3.5l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
    <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </>),
  /* 체크 */
  check: (<>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.5 12.2l2.4 2.4 4.6-5" />
  </>),
  /* 할 일 목록 */
  list: (<>
    <path d="M4 6.5l1.8 1.8L9 5M4 13l1.8 1.8L9 11.5M4 19.5l1.8 1.8L9 18" />
    <path d="M12 7h8M12 13.5h8M12 20h6" />
  </>),
  /* 펜 */
  pen: (<>
    <path d="M4 20l1-4 11-11 3 3-11 11z" />
    <path d="M14.5 6.5l3 3" />
  </>),
  /* 계획선 */
  plan: (<>
    <path d="M4 17.5c3-6 6-2 8-6s5-5 8-3" />
    <circle cx="4" cy="17.5" r="1.6" /><circle cx="20" cy="8.5" r="1.6" />
  </>),
  /* 서류가방 — 직무 */
  brief: (<>
    <rect x="3.5" y="7.5" width="17" height="12" rx="2.5" />
    <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 12.5h17" />
  </>),
  /* 그래프 — 시장 */
  chart: (<>
    <path d="M4 20V4M4 20h16" />
    <path d="M8 16.5v-4M12.5 16.5V8M17 16.5v-6" />
  </>),
  /* 말풍선 — 영업 */
  talk: (<>
    <path d="M4.5 6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-4 4v-4H6.5a2 2 0 0 1-2-2z" />
    <path d="M9 9.5h6" />
  </>),
  /* 악수 — 사업개발 */
  hands: (<>
    <path d="M3 13.5l3.5-3.5 4 2 3-3 4 4" />
    <path d="M3 13.5l4 4 3.5-3M17.5 13l3.5 3.5" />
  </>),
  /* 나침반 — 둘러보기 */
  compass: (<>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M15 9l-1.8 4.2L9 15l1.8-4.2z" />
  </>),
  /* 문서 저장 */
  file: (<>
    <path d="M6 3.5h7l5 5v12a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 20.5v-16A1.5 1.5 0 0 1 6.5 3.5z" />
    <path d="M13 3.5v5h5M12 11.5v6M9.5 15l2.5 2.5 2.5-2.5" />
  </>),
  /* 더 적기 */
  plus: (<>
    <path d="M5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H5z" />
    <path d="M5 3.5a1.5 1.5 0 0 0 0 3M11 9v6M8 12h6" />
  </>),
};

export function Ic({ name }: { name: IcName }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}


/* ══════════════════════════════════════════════════════════════════
   채운 표시 (SCENE 1).

   **선 아이콘과 같은 벌이 아니다.** 레퍼런스의 표시는 전부 면으로
   서 있고(기어 · 정육면체 · 막대), 선으로 그린 것도 굵기가 칸의
   17% 다. 위의 `Ic` 는 굵기 1.8 / 24 = 7.5% 라, 같은 자리에 같은
   크기로 놓아도 **존재감이 한 단 아래**로 읽힌다. 자로 재면 크기가
   맞는데 사람이 보면 다른 제품인 자리가 여기다(규격 §7).

   측정값(레퍼런스 px → 24 칸):
   - 막대 셋 폭 6.2 · 사이 2.75 · 키 9.6 · 16.3 · 23.3 · 끝은 둥글다
   - 가운데 막대만 색이 다르다. **값을 그리지 않는다**: 셋이 한 덩이로
     읽히지 않게 색조만 가른다(배지 셋이 색조를 가르는 것과 같다)
   - 축선이 없다. 선을 그으면 그 순간 그래프가 되고, 이 자리가 재는
     것은 수가 아니다
   ══════════════════════════════════════════════════════════════════ */
/**
 * 면으로 선 글리프 열둘. **표시 갈래 하나에 글리프 하나다**(§5).
 *
 * 전에는 넷뿐이었고 결과지가 그 가운데 셋을 `i % 3` 으로 돌려 썼다.
 * 그래서 여섯 Core 전부 첫 칸이 막대이고 셋째가 문서였다. 갈래와
 * 글리프를 잇는 표는 `src/lib/me-v3/student/icon.ts` 한 자리에 있다.
 */
export type IcFName =
  | "bars" | "cube" | "note" | "goal" | "table" | "person"
  | "flask" | "chip" | "bubble" | "coins" | "pin" | "verdict";

const FILLS: Record<IcFName, React.ReactNode> = {
  /* 막대 셋 — 절 머리. 가운데만 다른 색이다 */
  bars: (<>
    <rect x="0" y="14.4" width="6.2" height="9.6" rx="3.1" />
    <rect x="8.9" y="7.7" width="6.2" height="16.3" rx="3.1"
      fill="var(--r-mark-2)" />
    <rect x="17.8" y="0.7" width="6.2" height="23.3" rx="3.1" />
  </>),
  /* 정육면체 — 면 하나에 흰 모서리 */
  cube: (<>
    <path d="M12 1.8 21.2 7v10L12 22.2 2.8 17V7z" />
    <path d="M2.8 7 12 12.2 21.2 7M12 12.2v10"
      fill="none" stroke="#ffffff" strokeWidth="1.9" strokeLinejoin="round" />
  </>),
  /* 문서 — 면 하나에 흰 줄 */
  note: (<>
    <path d="M6.2 1.8h7.4L19.8 8v14.4a1.8 1.8 0 0 1-1.8 1.8H6.2a1.8 1.8 0 0 1-1.8-1.8V3.6a1.8 1.8 0 0 1 1.8-1.8z" />
    <path d="M13.4 2.4v5.3h5.3M8.4 13.4h7.4M8.4 17.6h4.8"
      fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" />
  </>),
  /* 과녁 — 계획·우선순위. 가운데가 그 영역이 먼저 정하는 자리다 */
  goal: (<>
    <path d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21zm0 4.3a6.2 6.2 0 1 1 0 12.4 6.2 6.2 0 0 1 0-12.4z" />
    <circle cx="12" cy="12" r="3" />
  </>),
  /* 표 — 데이터·기록. 면 하나에 흰 금 둘 */
  table: (<>
    <path d="M3.4 3.6h17.2a1.9 1.9 0 0 1 1.9 1.9v13a1.9 1.9 0 0 1-1.9 1.9H3.4a1.9 1.9 0 0 1-1.9-1.9v-13a1.9 1.9 0 0 1 1.9-1.9z" />
    <path d="M1.5 9.5h21M9.3 9.5v10.9"
      fill="none" stroke="#ffffff" strokeWidth="1.9" />
  </>),
  /* 사람 — 사람·사용자 */
  person: (<>
    <circle cx="12" cy="7.1" r="4.5" />
    <path d="M12 13.3c-4.7 0-8.4 3-8.4 6.6 0 1.3 1 2.3 2.3 2.3h12.2c1.3 0 2.3-1 2.3-2.3 0-3.6-3.7-6.6-8.4-6.6z" />
  </>),
  /* 플라스크 — 실험·검증. 안쪽에 흰 금 하나 */
  flask: (<>
    <path d="M9.4 2.2h5.2v6.1l5.1 9.6c1 1.8-.3 4-2.4 4H6.7c-2.1 0-3.4-2.2-2.4-4l5.1-9.6z" />
    <path d="M8 1.9h8" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" />
    <path d="M6.9 16.3h10.2" fill="none" stroke="#ffffff" strokeWidth="1.8"
      strokeLinecap="round" />
  </>),
  /* 칩 — 시스템·구현. 가운데를 흰 면으로 판다 */
  chip: (<>
    <path d="M6 5.6h12a2.6 2.6 0 0 1 2.6 2.6v7.6A2.6 2.6 0 0 1 18 18.4H6a2.6 2.6 0 0 1-2.6-2.6V8.2A2.6 2.6 0 0 1 6 5.6z" />
    <rect x="9.4" y="9.4" width="5.2" height="5.2" rx="1.2" fill="#ffffff" />
    <path d="M9 2v3.6M15 2v3.6M9 18.4V22M15 18.4V22M2 9h1.4M2 15h1.4M20.6 9H22M20.6 15H22"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </>),
  /* 말풍선 — 커뮤니케이션 */
  bubble: (<>
    <path d="M4.3 3.2h15.4a2.7 2.7 0 0 1 2.7 2.7v8.6a2.7 2.7 0 0 1-2.7 2.7h-7.4l-5.1 4.1v-4.1H4.3a2.7 2.7 0 0 1-2.7-2.7V5.9a2.7 2.7 0 0 1 2.7-2.7z" />
    <path d="M6.4 8.1h11.2M6.4 12.1h7.1"
      fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
  </>),
  /* 동전 — 자원·비용 */
  coins: (<>
    <ellipse cx="12" cy="5.8" rx="8.4" ry="3.6" />
    <path d="M3.6 9.4v3.1c0 2 3.8 3.6 8.4 3.6s8.4-1.6 8.4-3.6V9.4c0 2-3.8 3.6-8.4 3.6S3.6 11.4 3.6 9.4z" />
    <path d="M3.6 14.9v3.1c0 2 3.8 3.6 8.4 3.6s8.4-1.6 8.4-3.6v-3.1c0 2-3.8 3.6-8.4 3.6s-8.4-1.6-8.4-3.6z" />
  </>),
  /* 자리 표시 — 현장·운영 */
  pin: (<>
    <path d="M12 1.6c-4.5 0-8.1 3.5-8.1 7.9 0 5.7 7.2 12.4 7.5 12.7.3.3.9.3 1.2 0 .3-.3 7.5-7 7.5-12.7 0-4.4-3.6-7.9-8.1-7.9z" />
    <circle cx="12" cy="9.3" r="3.1" fill="#ffffff" />
  </>),
  /* 확정 — 의사결정. 면 하나에 흰 표 */
  verdict: (<>
    <path d="M6.8 2.4h10.4a4.4 4.4 0 0 1 4.4 4.4v10.4a4.4 4.4 0 0 1-4.4 4.4H6.8a4.4 4.4 0 0 1-4.4-4.4V6.8a4.4 4.4 0 0 1 4.4-4.4z" />
    <path d="M7.5 12.3l3.1 3.1 5.9-6.5"
      fill="none" stroke="#ffffff" strokeWidth="2.6"
      strokeLinecap="round" strokeLinejoin="round" />
  </>),
};

export function IcF({ name }: { name: IcFName }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="currentColor"
    >
      {FILLS[name]}
    </svg>
  );
}
