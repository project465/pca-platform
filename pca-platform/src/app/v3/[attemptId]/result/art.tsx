import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * 첫 화면의 그림과 아이콘.
 *
 * **그림은 장식이 아니라 hero 의 한 축이다.** 왼쪽에 큰 글이 서고
 * 오른쪽에 이 그림이 서서, 결과지의 첫 화면이 판정을 발표하는 자리가
 * 아니라 학생이 쓰는 화면으로 읽히게 한다.
 *
 * 세 가지를 지킨다.
 *
 * - **값을 그리지 않는다.** 눈금도 수치도 축도 없고 응답에 따라 모양이
 *   바뀌지도 않는다. 결과를 말하는 것은 글과 아래 그래프이고, 여기서
 *   무언가를 가리키면 읽는 사람이 그림에서 자기 점수를 읽으려 한다
 *   (종이 표지에서 레이더를 걷은 것과 같은 까닭이다).
 * - **내려받지 않는다.** 바깥 그림 파일도 글꼴도 쓰지 않는 inline SVG 라
 *   종이를 그리는 머리 없는 브라우저에서도 그대로 선다.
 * - **색은 여기서 못 박는다.** 이 그림의 파랑과 mint 와 lilac 은 면의
 *   색이지 상태의 색이 아니다. `--r-*` 를 쓰면 강조색을 바꾸는 날 사람
 *   옷 색이 같이 바뀐다.
 *
 * **`HeroVisual` 은 갈아 끼우는 자리다.** 전문 일러스트레이터가 그린
 * 그림(또는 3D 렌더)을 받으면 이 함수 **하나만** 그 그림을 세우도록
 * 바꾼다: 쓰는 쪽(`page.tsx`)은 `<HeroVisual />` 하나만 알고 있고 크기와
 * 자리는 `.rs-hero-art` 가 든다. 아래 `StudentArt` 는 그 자리가 비어
 * 보이지 않게 두는 지금의 그림이다.
 */
/**
 * 공식 그림이 들어오면 **이 자리가 그것을 세운다.**
 *
 * `public/brand/hero/` 에 `student-desk.png`(또는 `.webp` · `.jpg`)를 두면
 * 그 파일이 서고, 없으면 아래 `StudentArt` 가 선다. **코드를 고치지
 * 않는다**: 파일을 넣는 것이 곧 교체다.
 *
 * - 비율을 찌그러뜨리지 않는다(`object-fit: contain`).
 * - 캐릭터와 소품이 잘리지 않게 폭을 다 쓰고 높이는 그림이 정한다.
 * - 보조기기에는 읽히지 않는다(`alt=""`): 그림이 말하는 것이 바로 옆 글과
 *   같아서, 읽어 주면 같은 말을 두 번 듣는다.
 */
const HERO_FILES = ["student-desk.png", "student-desk.webp", "student-desk.jpg"];
const heroAsset = HERO_FILES.find(
  (n) => existsSync(join(process.cwd(), "public", "brand", "hero", n)));

export function HeroVisual() {
  if (heroAsset) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img className="rs-hero-img" src={`/brand/hero/${heroAsset}`} alt="" />;
  }
  return <StudentArt />;
}

/* ──────────────────────────────────────────────────────────────────
   책상에 앉아 정리하는 학생.

   얼굴 없는 도형이 아니라 **눈과 입과 자세가 있는 사람**이고, 손에
   든 것과 책상 위의 것이 그 사람이 지금 무엇을 하는지 말한다(노트와
   펜과 노트북과 책). 둘레의 작은 손그림 셋은 그 일의 차례다 —
   계획하기 · 비교하기 · 실행하기.
   ────────────────────────────────────────────────────────────── */

function StudentArt() {
  return (
    <svg viewBox="0 0 400 352" role="presentation" focusable="false">
      <defs>
        {/* **평평한 색 한 겹은 무료 벡터로 읽힌다.** 면마다 빛이 드는
            쪽과 지는 쪽을 두어 반3D 로 세운다 */}
        <radialGradient id="rsBg" cx="38%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#f2f7ff" />
          <stop offset="100%" stopColor="#e3eefc" />
        </radialGradient>
        <linearGradient id="rsSkin" x1="22%" y1="8%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#fbdfc4" />
          <stop offset="58%" stopColor="#f3cda8" />
          <stop offset="100%" stopColor="#e7b78e" />
        </linearGradient>
        <linearGradient id="rsHairG" x1="25%" y1="0%" x2="85%" y2="95%">
          <stop offset="0%" stopColor="#3a4557" />
          <stop offset="55%" stopColor="#242e3d" />
          <stop offset="100%" stopColor="#161d28" />
        </linearGradient>
        <linearGradient id="rsTop" x1="18%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%" stopColor="#5e9bf5" />
          <stop offset="52%" stopColor="#3576da" />
          <stop offset="100%" stopColor="#2457b0" />
        </linearGradient>
        <linearGradient id="rsDesk" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#eef3fa" />
          <stop offset="100%" stopColor="#d2dcec" />
        </linearGradient>
        <linearGradient id="rsScreen" x1="12%" y1="0%" x2="92%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8eff9" />
        </linearGradient>
        <filter id="rsBlur" x="-40%" y="-60%" width="180%" height="240%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <clipPath id="rsHead">
          <ellipse cx="200" cy="124" rx="41" ry="45" />
        </clipPath>
      </defs>

      {/* 뒤에 깔리는 면 둘 */}
      <circle cx="212" cy="156" r="124" fill="url(#rsBg)" />
      <path
        d="M34 290c-8-46 28-84 76-84 44 0 69 23 80 53 7 19-8 36-37 36H62c-18 0-26-1-28-5z"
        fill="#e7f6f1"
      />

      {/* ── 손그림 셋 ── 그 일의 차례다. 같은 붓으로 그린다 ── */}
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* 계획하기 — 전구 */}
        <g>
          <path
            d="M44 72c0-14 11-25 25-25s25 11 25 25c0 9-5 14-8 19-2 3-3 6-3 9H55c0-3-1-6-3-9-3-5-8-10-8-19z"
            fill="#fdf1d6" stroke="#d99f32" strokeWidth="2.6"
          />
          <path d="M57 106h24M61 113h16" stroke="#d99f32" strokeWidth="2.6" />
          <path d="M69 34v-9M41 50l-7-6M97 50l7-6" stroke="#eec077" strokeWidth="2.6" />
          <path d="M62 82c0-7 3-11 7-13" stroke="#e8bb6c" strokeWidth="2.2" />
        </g>
        {/* 비교하기 — 막대 셋과 견주는 선 */}
        <g>
          <rect x="300" y="46" width="60" height="48" rx="15" fill="#ddf1ea" stroke="none" />
          <path d="M311 80v-9M325 80V61M339 80v-14" stroke="#0f7f6c" strokeWidth="5.4" />
          <path d="M306 86h48" stroke="#8ccabb" strokeWidth="2.4" />
        </g>
        {/* 실행하기 — 체크와 작은 획 */}
        <g>
          <circle cx="352" cy="166" r="21" fill="#10866f" stroke="none" />
          <path d="M343 166l6.5 6.5L362 159" stroke="#fff" strokeWidth="3.4" />
          <path d="M330 148c-4 2-6 6-6 10" stroke="#8ccabb" strokeWidth="2.4" />
        </g>
        {/* 메모 — 세 자리를 잇는 점선 */}
        <path d="M100 100c30 12 40 28 42 46" stroke="#c7d6ea" strokeWidth="2.3" strokeDasharray="1.5 8" />
        <path d="M300 94c-16 10-25 20-28 32" stroke="#c7d6ea" strokeWidth="2.3" strokeDasharray="1.5 8" />
      </g>
      <g fontSize="12.5" fontWeight="600" textAnchor="middle">
        <text x="69" y="134" fill="#8a6410">계획하기</text>
        <text x="330" y="116" fill="#0f7f6c">비교하기</text>
        <text x="352" y="206" fill="#0f7f6c">실행하기</text>
      </g>

      {/* 책상 아래 그림자 */}
      <ellipse cx="200" cy="300" rx="128" ry="13" fill="#9fb2cc" opacity=".3" filter="url(#rsBlur)" />

      {/* ── 사람 ── */}
      <g>
        {/* 목 — 짧고 어깨에 바로 앉는다 */}
        <path d="M184 150h32v26a16 13 0 0 1-32 0z" fill="#e8bb92" />
        {/* 몸 */}
        <path
          d="M124 292c0-44 16-74 40-85 10-5 22-7 36-7s26 2 36 7c24 11 40 41 40 85z"
          fill="url(#rsTop)"
        />
        {/* 턱 아래 그늘. 머리와 몸이 한 덩이로 읽히지 않게 한다 */}
        <path d="M166 196c14 10 54 10 68 0-4-9-18-14-34-14s-30 5-34 14z" fill="#2457b0" opacity=".22" />
        {/* 셔츠 깃 */}
        <path d="M184 192c5 10 27 10 32 0-4-4-10-6-16-6s-12 2-16 6z" fill="#f7faff" />
        {/* 몸통 오른쪽에 지는 면. 한 색으로 민 옷은 종이 인형처럼 보인다 */}
        <path d="M236 200c20 12 34 42 34 92h-34z" fill="#2457b0" opacity=".35" />
        {/* 왼팔 — 노트 위에서 펜을 든다 */}
        <path
          d="M140 212c-14 14-21 38-20 56 1 9 7 13 16 13h28l7-40z"
          fill="#2a63c4"
        />
        {/* 오른팔 — 자판에 손을 얹는다 */}
        <path
          d="M260 212c14 14 21 38 20 56-1 9-7 13-16 13h-28l-7-40z"
          fill="#2a63c4"
        />
        {/* 얼굴 */}
        <ellipse cx="200" cy="124" rx="41" ry="45" fill="url(#rsSkin)" />
        {/* 귀 */}
        <ellipse cx="160" cy="130" rx="6.5" ry="9.5" fill="#efc3a0" />
        <ellipse cx="240" cy="130" rx="6.5" ry="9.5" fill="#efc3a0" />
        {/* 머리카락 — 앞머리와 옆선, 그리고 윤기 한 줄 */}
        <path
          d="M157 122c-4-32 16-52 43-52s47 19 43 52c-2-16-8-25-16-29-7 12-24 18-38 15-9-2-16-6-20-12-6 6-10 15-12 26z"
          fill="url(#rsHairG)"
        />
        <g clipPath="url(#rsHead)">
          <path d="M160 108c6-16 20-26 40-26s34 10 40 26c-10-10-24-15-40-15s-30 5-40 15z" fill="#44506a" opacity=".55" />
        </g>
        <path d="M176 84c8-6 19-9 30-8" stroke="#55627c" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".6" />
        <path d="M160 116c2-18 10-29 22-34-6 10-7 22-4 32z" fill="#1b2431" />
        <path d="M240 118c-2-14-7-24-16-30 10 4 17 14 20 28z" fill="#1b2431" />
        {/* 눈썹 */}
        <g stroke="#2a3447" strokeWidth="3.4" strokeLinecap="round" fill="none">
          <path d="M174 110c4-4 12-5 17-2" />
          <path d="M226 110c-4-4-12-5-17-2" />
        </g>
        {/* 눈 — 뜨고 있다. 흰자 · 홍채 · 하이라이트 */}
        <g>
          <ellipse cx="183" cy="126" rx="9" ry="7.5" fill="#ffffff" />
          <ellipse cx="217" cy="126" rx="9" ry="7.5" fill="#ffffff" />
          <circle cx="184" cy="127" r="5.2" fill="#2c3648" />
          <circle cx="218" cy="127" r="5.2" fill="#2c3648" />
          <circle cx="186" cy="125" r="1.8" fill="#ffffff" />
          <circle cx="220" cy="125" r="1.8" fill="#ffffff" />
          <path
            d="M174 121c4-4 14-4.5 18-0.5M208 120.5c4-4 14-3.5 18 0.5"
            stroke="#39435a" strokeWidth="2.2" strokeLinecap="round" fill="none"
          />
        </g>
        {/* 코와 입 */}
        <path d="M200 132c2 4 1 6-2 7" stroke="#d9a67f" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M190 146c6 6 14 6 20 0" stroke="#b9705a" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M193 147c5 4 9 4 14 0" fill="#c98373" opacity=".35" />
        {/* 볼 */}
        <ellipse cx="173" cy="140" rx="7.5" ry="5" fill="#ef9f8a" opacity=".38" />
        <ellipse cx="227" cy="140" rx="7.5" ry="5" fill="#ef9f8a" opacity=".38" />
      </g>

      {/* ── 책상 위 ── 지금 무엇을 하는지는 이 물건들이 말한다 ── */}
      {/* 책 두 권 */}
      <g>
        <rect x="28" y="272" width="64" height="12" rx="4" fill="#7ea9e2" />
        <rect x="33" y="260" width="56" height="12" rx="4" fill="#aecbf0" />
        <rect x="38" y="250" width="46" height="10" rx="4" fill="#d6e4f8" />
      </g>
      {/* 노트북 */}
      <g>
        <path d="M276 284l8-68h64l8 68z" fill="#cfdbec" />
        <rect x="280" y="214" width="72" height="58" rx="6" fill="url(#rsScreen)" stroke="#bccbe2" strokeWidth="2" />
        <g stroke="#9db4d8" strokeWidth="2.4" strokeLinecap="round">
          <path d="M291 230h44M291 241h28" />
        </g>
        <path d="M266 292l7-12h86l7 12z" fill="#e7eefa" stroke="#c8d5e8" strokeWidth="1.8" />
      </g>
      {/* 머그 */}
      <g>
        <path d="M104 258h28v17a9 9 0 0 1-9 9h-10a9 9 0 0 1-9-9z" fill="#ffffff" stroke="#c6d4e8" strokeWidth="2.2" />
        <path d="M132 263h6a7 7 0 0 1 0 13h-6" fill="none" stroke="#c6d4e8" strokeWidth="2.2" />
        <path d="M112 250c3-5-2-7 0-12M122 250c3-5-2-7 0-12" fill="none" stroke="#cbd8ea" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      {/* 책상 */}
      <rect x="18" y="284" width="364" height="13" rx="6.5" fill="url(#rsDesk)" />
      <rect x="46" y="297" width="11" height="40" rx="5.5" fill="#dde5f1" />
      <rect x="343" y="297" width="11" height="40" rx="5.5" fill="#dde5f1" />
      {/* 펼친 노트 */}
      <g>
        <path d="M148 284l6-32h92l6 32z" fill="#ffffff" stroke="#d4dfee" strokeWidth="2" />
        <path d="M200 252v32" stroke="#dfe7f3" strokeWidth="2" />
        <g stroke="#c2d1e6" strokeWidth="2.2" strokeLinecap="round">
          <path d="M162 265h28M162 275h20M210 265h28M210 275h20" />
        </g>
      </g>
      {/* 펜을 쥔 왼손 */}
      <g>
        <g transform="rotate(34 178 270)">
          <rect x="174" y="230" width="8" height="40" rx="4" fill="#f2a92f" />
          <rect x="174" y="230" width="3.5" height="40" rx="1.8" fill="#ffc96a" />
          <path d="M174 270h8l-4 10z" fill="#2c3548" />
        </g>
        <path d="M150 262c8-5 18-5 26 0l-3 10c-7-4-14-4-21 0z" fill="#1f4f9e" />
        <ellipse cx="175" cy="273" rx="13" ry="10" fill="#f3cda8" />
        <path d="M166 270c4-3 9-3 13 0" stroke="#dcb089" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      {/* 자판에 얹은 오른손 */}
      <g>
        <path d="M268 268c8-5 18-5 26 0l-3 10c-7-4-14-4-21 0z" fill="#1f4f9e" />
        <ellipse cx="294" cy="281" rx="13" ry="9.5" fill="#f3cda8" />
        <path d="M285 278c4-3 10-3 14 0" stroke="#dcb089" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
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
