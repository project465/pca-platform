/* 목표 화면의 **가로 잉크 폭**과 우리 글꼴이 같은 글자를 그리는 폭을
   견주어 자리마다 필요한 글자 크기를 돌려준다.

   **잉크 높이로 재지 않는다**: 목표 화면은 올려 그린 그림이라 가장자리가
   번져 높이가 한 단 커 보인다. 가로 폭은 번져도 양끝에서만 늘어나므로
   글자 수가 많을수록 그 오차가 묻힌다.

   목표 쪽 수는 `S()`(판 573px → 창 1440px, 2.5131배)로 옮겨 적은 값이다. */
import { chromium } from "playwright";

const STACK =
  '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,-apple-system,sans-serif';

/** [자리, 글자, 굵기, 목표 잉크 폭(1440 자), 지금 크기] */
const T: [string, string, number, number, number][] = [
  ["띠 제품 이름", "CareerMatri", 700, 153.3, 26.3],
  ["띠 전공", "기계공학", 500, 70.4, 18.0],
  ["띠 묶음 머리", "지금", 700, 37.7, 20.0],
  ["띠 줄", "현재 상태", 600, 93.0, 20.7],
  ["띠 줄2", "결과 기록", 600, 90.5, 20.7],
  ["쪽 제목", "내 커리어", 700, 135.7, 32.3],
  ["쪽 메타", "기계공학 · 최근 업데이트 2024.10.07", 500, 306.6, 18.2],
  ["Hero 꼬리표", "지금 할 일", 700, 105.5, 24.0],
  ["Hero 머리", "구조·내구 해석 경험에서", 700, 339.3, 30.5],
  ["Hero 까닭", "이 경험을 명확히 정리하면, 지원서와 면접에서 더 구체적으로 설명할 수 있습니다.", 400, 688.6, 20.5],
  ["Hero 더보기", "그 밖에 할 일 2개", 600, 153.3, 20.0],
  ["절 머리", "현재 상태", 700, 118.1, 28.0],
  ["절 머리2", "최근 변화", 700, 118.1, 28.0],
  ["절 머리3", "최근 기록", 700, 110.6, 28.0],
  ["절 머리 링크", "전체 보기", 600, 75.4, 19.8],
  ["절 머리 링크2", "모두 보기", 600, 77.9, 19.8],
  ["절 거드는 줄", "지금 설명할 수 있는 주요 영역 3가지입니다.", 400, 364.4, 19.0],
  ["절 거드는 줄2", "최근 추가한 경험으로 다음과 같은 변화가 생겼습니다.", 400, 434.8, 19.0],
  ["절 거드는 줄3", "최근 검사 결과와 경험을 확인할 수 있습니다.", 400, 369.4, 19.0],
  ["타일 제목", "구조·내구 해석", 700, 143.2, 21.4],
  ["타일 거드는 줄", "모델링·해석·설계", 400, 145.8, 18.4],
  ["변화 줄", "시험·계측 영역의 검증 근거가 추가되었습니다.", 500, 409.6, 19.9],
  ["변화 시각", "2024.10.05", 500, 103.0, 16.8],
  ["기록 이름", "기계공학 진로진단 검사 (PRO)", 700, 258.8, 19.9],
  ["기록 번호", "기록#08912", 400, 93.0, 16.8],
  ["기록 시각", "2024.09.12", 500, 98.0, 16.8],
  ["기록 단추", "결과 보기", 600, 75.4, 17.0],
];

async function main() {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent("<canvas id=c width=3000 height=200></canvas>");
  const ratios = await p.evaluate(`(() => {
    const STACK = ${JSON.stringify(STACK)};
    const T = ${JSON.stringify(T)};
    const g = document.getElementById("c").getContext("2d");
    return T.map(([, s, w]) => {
      g.fillStyle = "#fff"; g.fillRect(0, 0, 3000, 200);
      g.fillStyle = "#000";
      g.font = w + " 100px " + STACK;
      g.textBaseline = "alphabetic";
      g.fillText(s, 20, 140);
      const d = g.getImageData(0, 0, 3000, 200).data;
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, ink = 0;
      for (let y = 0; y < 200; y++) for (let x = 0; x < 3000; x++) {
        const i = (y * 3000 + x) * 4;
        if ((d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 < 150) {
          ink++;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      return { r: (x1 - x0 + 1) / 100, d: ink / ((x1 - x0 + 1) * (y1 - y0 + 1)) };
    });
  })()`) as { r: number; d: number }[];
  console.log("자리".padEnd(16), "굵기", "목표폭".padStart(7), "지금".padStart(6),
    "필요".padStart(6), "차".padStart(6), " 우리 짙기");
  for (let i = 0; i < T.length; i++) {
    const [name, , w, ref, cur] = T[i];
    const need = ref / ratios[i].r;
    console.log(
      name.padEnd(16), String(w).padStart(4),
      ref.toFixed(1).padStart(8), cur.toFixed(1).padStart(6),
      need.toFixed(1).padStart(6), (need - cur).toFixed(1).padStart(6),
      "  " + ratios[i].d.toFixed(3),
    );
  }
  await b.close();
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
