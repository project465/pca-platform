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
