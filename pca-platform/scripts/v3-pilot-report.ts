/**
 * 파일럿 분석 리포트의 **골격**을 찍는다.
 *
 * 자료가 오기 전에 표를 먼저 세워 두는 까닭은 둘이다. 첫째, 어느 칸이 비는
 * 줄 알면 아직 받지 않는 칸을 지금 받을 수 있다 — 끝난 뒤에는 되물을 수
 * 없다. 둘째, 숫자를 보고 표를 짜면 그 표는 보고 싶은 것을 보여 준다.
 *
 * **합계 하나를 만들지 않는다.** 묻는 것이 여섯이고 여섯이 따로 나간다:
 * 문항 이해 · 소유 구분 · 결과 납득 · 빈자리 이해 · 할 일 실행 가능 ·
 * 상품 가치. 평균 하나로 합치면 무엇을 고쳐야 할지 알 수 없다.
 *
 * **다섯 명이 안 되는 칸은 평균을 내지 않는다.** 수만 적고 값은 만들지
 * 않는다 — 값이 없어야 이 글을 그대로 옮겨도 새지 않는다.
 *
 * **통계 유의성을 만들지 않는다.** 스무 명에서 서른 명이고, 그 표본에
 * p 값을 붙이면 없는 정밀도가 생긴다. 적는 것은 수와 분포와 사례다.
 *
 *   npm run v3:pilot:report              # 전체
 *   WAVE=1 npm run v3:pilot:report       # wave 하나
 *   OUT=docs/metri/61_pilot_wave1.md npm run v3:pilot:report
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { MIN_CELL, pilotRows } from "../src/lib/me-v3/pilot/store";
import { FUNNEL, funnelByWave } from "../src/lib/me-v3/pilot/funnel";
import { syncFunnel } from "../src/lib/me-v3/pilot/sync";
import { WAVE_KO } from "../src/lib/me-v3/pilot/enroll";
import {
  blockTimes, choiceSpread, ISSUE_KO, issues, metrics, ownershipSpread,
  slowItems, spread,
} from "../src/lib/me-v3/pilot/analyze";

const WAVE = process.env.WAVE ? Number(process.env.WAVE) : undefined;
const OUT = process.env.OUT ?? "";

const STEP_KO: Record<string, string> = {
  pilot_link_opened: "초대 링크를 열었다",
  assessment_started: "검사를 시작했다",
  basic_completed: "BASIC 을 끝냈다",
  standard_completed: "STANDARD 를 끝냈다",
  pro_completed: "PRO 를 끝냈다",
  result_opened: "결과를 열었다",
  domain_detail_viewed: "영역을 자세히 봤다",
  evidence_viewed: "근거 절을 봤다",
  action_viewed: "할 일 절을 봤다",
  action_saved: "할 일을 담았다",
  pdf_opened: "종이를 뽑았다",
  feedback_started: "의견 화면에 들어왔다",
  feedback_submitted: "의견을 보냈다",
};
const FIRST_KO: Record<string, string> = {
  focus: "먼저 볼 영역", evidence: "근거", gaps: "채울 것", plan: "다음 할 일",
  industry: "산업", role: "직무", translation: "연구·프로젝트 번역", other: "그 밖",
};
const PRICE_KO: Record<string, string> = {
  "1": "매우 아깝다", "2": "다소 아깝다", "3": "적절하다",
  "4": "괜찮다", "5": "충분히 가치 있다",
};
/** 지표 여섯. **차례가 곧 묻는 차례다** */
const SIX: [string, string][] = [
  ["V1_ITEM_CLEAR", "A 문항 이해"],
  ["V2B_OWNERSHIP", "B 소유 구분"],
  ["V3_MATCH", "C 결과 납득"],
  ["V12_EXPLAIN", "D 설명 가능"],
  ["V5_NEXT", "E 할 일 실행 가능"],
  ["V16_BASIC_VALUE", "F 상품 가치 (BASIC)"],
  ["V16_STD_VALUE", "F 상품 가치 (STANDARD)"],
  ["V16_PRO_VALUE", "F 상품 가치 (PRO)"],
];

const L: string[] = [];
const say = (s = "") => L.push(s);
/** 값이 없으면 `—` 다. **0 으로 적지 않는다**: 0 과 모른다는 다른 말이다 */
const n0 = (x: number | null | undefined) => (x === null || x === undefined ? "—" : String(x));
const mn = (sec: number | null) => (sec === null ? "—" : `${Math.round(sec / 60)}분`);

async function main(): Promise<void> {
  /* **앞 걸음을 먼저 옮긴다.** 검사 시작과 등급 완료는 응시 화면이 적지
     못한다(동결돼 있다). 응답과 `submitted_at` 에 이미 적혀 있는 사실을
     퍼널 표로 옮기는 것이고, 여러 번 돌려도 같은 자리에 선다 */
  await syncFunnel();
  const rows = await pilotRows({ wave: WAVE ?? null });
  const scope = WAVE === undefined ? "전체" : (WAVE_KO[WAVE] ?? `wave ${WAVE}`);

  say(`# 파일럿 분석 — ${scope}`);
  say();
  say(`찍은 날 ${new Date().toISOString().slice(0, 10)} · 참가자 ${rows.length}명`);
  say();
  say("이 글은 `npm run v3:pilot:report` 가 만든다. 손으로 고치지 않는다 —");
  say("고치면 다음에 돌릴 때 사라지고, 사라진 줄을 아무도 못 찾는다.");
  say();
  say("읽는 규칙 넷.");
  say();
  say(`1. ${MIN_CELL}명이 안 되는 칸은 평균을 내지 않는다. 수만 적는다.`);
  say("2. 여섯 지표를 한 숫자로 합치지 않는다. 합치면 고칠 자리가 사라진다.");
  say("3. 비율의 바닥이 0 이면 비율을 만들지 않는다.");
  say("4. 표본이 작아 통계 유의성을 붙이지 않는다. 수와 분포와 사례까지다.");
  say();

  /* ── 1. 완료 퍼널 ── */
  say("## 1. 어디까지 왔는가");
  say();
  say("사람 수로 센다. 같은 응시의 같은 걸음은 한 번만 적힌다.");
  say();
  const fn = await funnelByWave(WAVE);
  say("| 걸음 | 사람 수 |");
  say("| --- | --- |");
  for (const s of FUNNEL) {
    say(`| ${STEP_KO[s] ?? s} | ${fn.find((x) => x.step === s)?.people ?? 0} |`);
  }
  say();
  const fin = rows.filter((r) => r.submitted_at).length;
  const opened = rows.filter((r) => r.result_opened).length;
  const fed = rows.filter((r) => r.feedback > 0).length;
  say(`끝낸 응시 ${fin} · 결과를 연 사람 ${opened} · 의견을 적은 사람 ${fed}.`);
  say();

  /* ── 2. 문항 UX ── */
  say("## 2. 문항과 화면");
  say();
  say("걸린 시간은 답이 찍힌 시각에서 읽는다. 답 사이가 20분을 넘으면 그 틈은");
  say("빼고 센다 — 창을 열어 둔 채 자리를 비운 것을 어려웠다고 읽으면 안 된다.");
  say("중앙값과 1·3사분위를 적고 평균은 적지 않는다.");
  say();
  say("| 묶음 | 사람 수 | 1사분위 | 중앙값 | 3사분위 |");
  say("| --- | --- | --- | --- | --- |");
  for (const b of await blockTimes(WAVE)) {
    say(`| ${b.label} | ${b.n} | ${mn(b.p25)} | ${mn(b.median)} | ${mn(b.p75)} |`);
  }
  say();
  const whole = spread(rows
    .map((r) => r.active_seconds)
    .filter((x): x is number => x !== null));
  say(whole.n === 0
    ? "한 벌 전체로는 아직 적을 것이 없다."
    : whole.p25 === null
      ? `한 벌 전체로는 중앙 ${mn(whole.median)} (${whole.n}명 — 사분위를 내기에 적다).`
      : `한 벌 전체로는 중앙 ${mn(whole.median)}`
        + ` (1·3사분위 ${mn(whole.p25)}~${mn(whole.p75)} · ${whole.n}명).`);
  say();
  say("### 머뭇거린 자리");
  say();
  say("앞 답과의 틈과 고쳐 누른 수로 본다. 문항 번호는 내부 이름이라 묶음");
  say("이름으로 적는다. 키 입력과 화면 녹화 같은 추적은 하지 않는다.");
  say();
  const slow = await slowItems(WAVE, 12);
  if (!slow.length) { say("자료가 없다."); } else {
    say("| 묶음 | 응답 수 | 중앙 초 | 고쳐 누른 수 |");
    say("| --- | --- | --- | --- |");
    for (const s of slow) {
      say(`| ${s.block} | ${s.n} | ${n0(s.median_secs)} | ${s.changed} |`);
    }
  }
  say();
  say("### 보기 넷이 갈려 쓰였는가");
  say();
  say("한 칸에 쏠리면 보기가 갈리지 않은 것이다. 응답이 스무 개가 안 되면");
  say("비율을 내지 않는다.");
  say();
  say("| 보기 | 응답 수 | 비율 |");
  say("| --- | --- | --- |");
  for (const o of await ownershipSpread(WAVE)) {
    say(`| ${o.label} | ${o.n} | ${o.share === null ? "—" : `${o.share}%`} |`);
  }
  say();

  /* ── 3. 결과 ── */
  say("## 3. 결과를 어떻게 읽었는가");
  say();
  const first = await choiceSpread("V11_FIRST_SECTION", WAVE);
  say("### 가장 먼저 본 곳");
  say();
  if (!first.length) { say("자료가 없다."); } else {
    say("| 먼저 본 곳 | 사람 수 |");
    say("| --- | --- |");
    for (const c of first) say(`| ${FIRST_KO[c.value] ?? c.value} | ${c.n} |`);
  }
  say();
  say("### 맞지 않는다고 적은 자리");
  say();
  say("적어 주신 글은 그대로 옮기지 않는다. 가명과 수까지 적고, 글은 운영");
  say("화면에서 그 응시를 열어 읽는다 — 네 줄짜리 표에서는 그 글이 누구");
  say("것인지 짐작이 된다.");
  say();
  const flags = await issues(WAVE);
  const dis = flags.filter((x) => x.kinds.includes("DISAGREE"));
  say(`맞지 않는다고 적은 사람 ${dis.length}명`
    + (dis.length ? `: ${dis.map((x) => x.code).join(" · ")}` : ""));
  say();

  /* ── 4. 상품 ── */
  say("## 4. 상품과 값");
  say();
  say(`지표마다 따로 적는다. ${MIN_CELL}명이 안 되는 칸은 평균을 내지 않는다.`);
  say();
  const mets = await metrics(WAVE);
  say("| 지표 | 응답 수 | 평균 |");
  say("| --- | --- | --- |");
  for (const [code, label] of SIX) {
    const m = mets.find((x) => x.code === code);
    say(`| ${label} | ${m?.n ?? 0} | ${m?.mean ?? "—"} |`);
  }
  say();
  say("### 값에 대한 답");
  say();
  say("**치러 본 값이 아닌 짐작이다.** 세 등급 모두에게 두 값을 보여 주고");
  say("물었으므로, 받지 않은 등급에 대한 답은 자기보고이고 구매 의사가 아니다.");
  say("그 표시 없이 이 표를 옮기면 지불 의사로 읽힌다.");
  say();
  for (const [code, label] of [
    ["V17_PRICE_STD", "14,900원"], ["V17_PRICE_PRO", "21,900원"],
  ] as [string, string][]) {
    const sp = await choiceSpread(code, WAVE);
    say(`${label} — ` + (sp.length
      ? sp.map((c) => `${PRICE_KO[c.value] ?? c.value} ${c.n}`).join(" · ")
      : "자료가 없다"));
    say();
  }

  /* ── 5. 손볼 일 ── */
  say("## 5. 손볼 일");
  say();
  if (!flags.length) { say("없다."); } else {
    say("| 가명 | 무엇이 |");
    say("| --- | --- |");
    for (const x of flags) {
      say(`| ${x.code} | ${x.kinds.map((k) => ISSUE_KO[k]).join(" · ")} |`);
    }
  }
  say();

  /* ── 6. 그래서 무엇을 고치는가 ── */
  say("## 6. 고칠 자리를 고르는 규칙");
  say();
  say("규칙을 자료보다 먼저 적어 둔다. 숫자를 보고 기준을 정하면 그 기준은");
  say("아무것도 막지 못한다. 그리고 **정확한 선을 통계로 못 박지 않는다**:");
  say("스무 명에서 서른 명이라 그 선이 그럴듯해 보일 만큼의 정밀도가 없다.");
  say("아래는 보는 자리와 고치는 쪽이고, 넘길지 말지는 사람이 정한다.");
  say();
  say("| 무엇을 보고 | 어느 쪽으로 읽고 | 무엇을 고치는가 |");
  say("| --- | --- | --- |");
  say("| 문항 이해(A)가 낮게 몰린다 | 문면이 묻는 것이 분명하지 않다 "
    + "| 걸린 묶음의 문면. 문항 수는 줄이지 않는다 |");
  say("| 소유 구분(B)이 낮다 · 보기가 한 칸에 쏠린다 | 네 단계가 갈리지 않는다 "
    + "| 보기 꼬리표와 보기 문면. 판정 규칙은 건드리지 않는다 |");
  say("| 근거 고르기 피로도가 높다 · 그 묶음 시간이 길다 | 항목이 많다 "
    + "| 칩을 묶는 차례와 묶음 수. 항목을 지우지 않는다 |");
  say("| 결과 납득(C)이 낮고 맞지 않는다는 글이 모인다 | 판정이 아니라 "
    + "글이 어긋났을 수 있다 | 먼저 그 응시를 열어 읽는다. 판정 규칙은 마지막 |");
  say("| 먼저 본 곳이 `먼저 볼 영역` 이 아니다 | 첫 화면이 읽는 차례를 "
    + "못 세운다 | 첫 화면 세 칸의 차례와 머리글 |");
  say("| 설명 가능(D)이 낮다 | 왜 그 영역인지가 결과지에 없다 "
    + "| 근거 절이 고른 항목을 어떻게 보여 주는가 |");
  say("| 할 일 실행 가능(E)이 낮다 · 고른 할 일이 한 칸에 쏠린다 "
    + "| 할 일이 막연하거나 영역마다 같다 | 그 영역의 할 일 문장 |");
  say("| 상품 가치(F)가 등급 사이에 갈리지 않는다 | 등급이 파는 것이 "
    + "구별되지 않는다 | 등급 구성. 값은 사업주가 정한다 |");
  say();
  say("### 멈추는 선");
  say();
  say("결과 납득(C)이 바닥에 몰리거나, 끝낸 사람이 절반을 넘지 못하거나,");
  say("결과가 안 만들어진 응시가 나오면 그 wave 를 끝내고 판본을 올린 뒤");
  say("다음 wave 로 간다. **wave 가 도는 동안에는 문항과 판정과 결과지를");
  say("고치지 않는다** — 고치면 그 wave 의 앞뒤가 다른 제품이 된다.");
  say();

  const out = L.join("\n") + "\n";
  if (OUT) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, out);
    console.log(`적었다 ${OUT} (${out.length}자)`);
  } else {
    process.stdout.write(out);
  }
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
