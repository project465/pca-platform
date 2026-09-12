/**
 * METRI 채점 엔진.
 *
 * 원칙 하나만 지킨다 — 점수는 산식이 만들고, 문장은 모델이 만든다.
 * 이 파일은 점수만 만든다. 여기서 나온 숫자가 결과지의 82점이 되고,
 * LLM 이 쓴 문장은 이 숫자를 읽기만 할 뿐 절대 이 숫자를 바꾸지 않는다.
 *
 * 채점 순서
 *   1. 영역             문항이 직접 재는 것. 대학판은 직무분야 10개(25문항
 *                       평균), 고교판은 계열 8개(14문항 평균).
 *   2. 업무성향 6개      두 검사지가 공유하는 축.
 *   3. activity 축 8개   1번을 job_area_axis_weights 로 옮긴 해석값.
 *                       두 검사지가 공유하는 축은 이것과 2번뿐이고,
 *                       그래서 고1 결과와 대학 결과가 같은 자 위에 놓인다.
 *   4. 적합도           3번 × 가중치 + 성향 보정.
 *                       대학판은 직무(job_axis_weights),
 *                       고교판은 전공(major_fit_weights) 을 향한다.
 *   5. 응답 품질         신뢰구간의 폭을 정한다.
 *
 * 3번의 변환 행렬도 4번의 가중치도 코드가 아니라 테이블에 있다.
 * 전공이 늘거나 가중치를 바꿀 때 이 파일은 건드리지 않는다.
 */
import { query, tx } from "./db";

/** 리커트 5점을 0~100 으로. 1점=0, 3점=50, 5점=100. */
export function scale100(mean1to5: number): number {
  return Math.round(((mean1to5 - 1) / 4) * 1000) / 10;
}

/**
 * 리커트 5점에서 이보다 작은 흩어짐은 신호가 아니다.
 * 표준편차가 정확히 0 이 아니라 1e-16 으로 남는 경우를 함께 막는다.
 */
const SPREAD_FLOOR = 0.05;

/** 로지스틱. 평균보다 위면 빠르게 올라가고 아래면 빠르게 떨어진다. */
function sigma(z: number): number {
  return 1 / (1 + Math.exp(-1.2 * z));
}

/** 이 응시가 무엇을 향해 채점되는가. 검사지가 정한다 */
export type FitKind = "job" | "major";

export type AttemptScore = {
  /** job = 대학판(직무 적합) · major = 고교판(전공 적합) */
  kind: FitKind;
  areas: { code: string; raw: number; scaled: number; rank: number }[];
  traits: { code: string; raw: number; scaled: number }[];
  axes: { code: string; scaled: number }[];
  jobs: {
    code: string;
    fit: number;
    a: number;
    p: number;
    band: [number, number];
    rank: number;
    /** 구간이 겹치는 직무끼리 같은 번호. 결과지는 등수가 아니라 이것을 읽는다 */
    tier: number;
  }[];
  quality: Quality;
};

export type Quality = {
  answered: number;
  total: number;
  straightRun: number;      // 같은 답이 연속으로 이어진 최대 길이
  fastRatio: number;        // 1.5초 미만으로 답한 비율
  attentionPassed: number;
  attentionTotal: number;
  bandWidth: number;        // 신뢰구간 폭. 품질이 나쁠수록 넓어진다
  flag: "ok" | "check" | "invalid";
};

type ResponseRow = {
  question_id: string;
  order_no: number;
  score: string | null;
  option_no: number | null;
  elapsed_ms: number | null;
  area_code: string | null;
  axis_code: string | null;
  item_kind: string;
  attention_expect: number | null;
};

async function load(attemptId: string): Promise<ResponseRow[]> {
  return query<ResponseRow>(
    `SELECT q.id AS question_id, q.order_no, o.score, o.order_no AS option_no,
            r.elapsed_ms, q.area_code, q.axis_code, q.item_kind, q.attention_expect
       FROM questions q
       JOIN attempts a ON a.id = $1
       JOIN test_sessions ts ON ts.id = a.session_id AND ts.instrument_id = q.instrument_id
       LEFT JOIN responses r ON r.attempt_id = a.id AND r.question_id = q.id
       LEFT JOIN question_options o ON o.id = r.option_id
      ORDER BY q.order_no`,
    [attemptId],
  );
}

/** 응답 품질. 여기서 나온 bandWidth 가 적합도 점수의 ±폭이 된다. */
export function quality(rows: ResponseRow[]): Quality {
  const answered = rows.filter((r) => r.score !== null);
  const scorable = rows.filter((r) => r.item_kind !== "attention");

  let run = 1;
  let straightRun = answered.length ? 1 : 0;
  for (let i = 1; i < answered.length; i++) {
    run = answered[i].option_no === answered[i - 1].option_no ? run + 1 : 1;
    if (run > straightRun) straightRun = run;
  }

  const timed = answered.filter((r) => r.elapsed_ms !== null);
  const fastRatio = timed.length
    ? timed.filter((r) => (r.elapsed_ms as number) < 1500).length / timed.length
    : 0;

  const attention = rows.filter((r) => r.item_kind === "attention");
  const attentionPassed = attention.filter((r) => r.option_no === r.attention_expect).length;

  // 폭은 6점에서 시작해 문제가 보일 때마다 벌어진다. 최대 20점.
  let bandWidth = 6;
  if (straightRun >= 12) bandWidth += 6;
  else if (straightRun >= 8) bandWidth += 3;
  if (fastRatio > 0.3) bandWidth += 5;
  else if (fastRatio > 0.15) bandWidth += 2;
  bandWidth += (attention.length - attentionPassed) * 3;
  const coverage = scorable.length ? answered.filter((r) => r.item_kind !== "attention").length / scorable.length : 0;
  if (coverage < 0.95) bandWidth += 4;
  bandWidth = Math.min(20, bandWidth);

  /**
   * 성실도 문항은 폭(bandWidth)에 얹는 것만으로 부족하다.
   *
   * 예전에는 "전부 틀렸을 때만 무효" 였다. 3문항짜리 검사에서 무작위로
   * 찍으면 하나쯤은 우연히 맞으므로(P≈38%), 세 문항 중 둘을 틀린 응시자가
   * 폭 12 로 남아 "정상" 판정을 받았다. 500명 고교 시뮬레이션에서 성실도를
   * 안 읽은 응시자의 절반이 그렇게 빠져나갔다.
   *
   * 그래서 절반 이상(최소 둘)을 틀리면 무효로 본다. 성실하게 답한 사람이
   * 여기에 걸릴 확률은 문항당 실수율 3% 기준 0.3% 아래다.
   */
  const attentionMissed = attention.length - attentionPassed;
  const invalidAt = Math.max(2, Math.ceil(attention.length / 2));
  const attentionFailed =
    attention.length > 0 &&
    (attentionPassed === 0 || (attention.length >= 2 && attentionMissed >= invalidAt));

  const flag: Quality["flag"] =
    attentionFailed ? "invalid" : bandWidth >= 14 ? "check" : "ok";

  return {
    answered: answered.length,
    total: rows.length,
    straightRun,
    fastRatio: Math.round(fastRatio * 1000) / 1000,
    attentionPassed,
    attentionTotal: attention.length,
    bandWidth,
    flag,
  };
}

function meanBy(rows: ResponseRow[], pick: (r: ResponseRow) => boolean): number | null {
  const vals = rows.filter((r) => r.score !== null && pick(r)).map((r) => Number(r.score));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * 응시 하나를 채점해 area_scores / indicator_scores / job_fit_scores /
 * attempt_quality 에 쓴다. 같은 응시를 다시 채점하면 덮어쓴다.
 */
export async function score(attemptId: string): Promise<AttemptScore> {
  const rows = await load(attemptId);
  if (!rows.length) throw new Error(`응시 ${attemptId} 의 문항을 찾을 수 없습니다`);

  const q = quality(rows);

  /**
   * 이 응시가 어느 검사지였는지 먼저 확인한다.
   *
   * 전공이 있으면 그 전공의 직무로 내려가고(대학판), 없으면 전공 자체를
   * 향한다(고교판). 검사지가 늘 때 이 파일에 if 가 늘지 않도록, 갈라지는
   * 곳은 "무엇을 향해 계산하는가" 한 군데뿐이다.
   */
  const inst = await query<{ instrument_key: string | null; major_code: string | null }>(
    `SELECT i.instrument_key, m.code AS major_code
       FROM attempts a
       JOIN test_sessions ts ON ts.id = a.session_id
       JOIN instruments i ON i.id = ts.instrument_id
       LEFT JOIN majors m ON m.id = i.major_id
      WHERE a.id = $1`,
    [attemptId],
  );
  if (!inst[0]) throw new Error(`응시 ${attemptId} 의 검사지를 찾을 수 없습니다`);
  const instrumentKey = inst[0].instrument_key;
  const majorCode = inst[0].major_code;
  const kind: FitKind = majorCode ? "job" : "major";

  /**
   * 1. 영역.
   *
   * 검사지에 묶인 영역만 본다. 예전에는 job_areas 를 통째로 긁었는데,
   * 고교판 영역 8개가 생기는 순간 대학 응시자의 채점에 응답 0개짜리 영역이
   * 여덟 개 끼어들어 순위와 표준오차가 전부 흔들린다.
   */
  const areaCodes = await query<{ code: string }>(
    `SELECT code FROM job_areas
      WHERE instrument_key IS NOT DISTINCT FROM $1
      ORDER BY sort_no`,
    [instrumentKey],
  );
  if (!areaCodes.length) throw new Error(`검사지 ${instrumentKey ?? "(이름 없음)"} 에 영역이 없습니다`);
  /**
   * 분야 점수의 표준오차. 25문항 평균이므로 sd/√25 이다.
   * 이 값이 적합도 신뢰구간의 근거가 된다 — 예전에는 ±6 이라는 상수를 썼는데,
   * 그건 근거 없는 숫자였고 1위와 2위 차이(보통 1~2점)보다 훨씬 넓어서
   * 500명 시뮬레이션에서 100% 겹쳤다. 구간은 재서 나와야 한다.
   */
  const areaSe = new Map<string, number>();
  for (const { code } of areaCodes) {
    const vals = rows
      .filter((r) => r.score !== null && r.area_code === code && r.item_kind !== "attention")
      .map((r) => Number(r.score));
    if (vals.length < 2) {
      areaSe.set(code, 25);
      continue;
    }
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, v) => a + (v - m) ** 2, 0) / (vals.length - 1));
    areaSe.set(code, (sd / Math.sqrt(vals.length)) * 25); // 1~5 를 0~100 으로 편 만큼 곱한다
  }

  const areas = areaCodes
    .map(({ code }) => {
      const raw = meanBy(rows, (r) => r.area_code === code && r.item_kind !== "attention");
      return { code, raw: raw ?? 1, scaled: scale100(raw ?? 1) };
    })
    .sort((a, b) => b.scaled - a.scaled)
    .map((a, i) => ({ ...a, rank: i + 1 }));
  const areaByCode = new Map(areas.map((a) => [a.code, a]));

  /**
   * 영역의 사람 안 z. 고교판이 이것을 직접 쓴다.
   * 축을 거치지 않는 이유는 아래 4번에 적었다.
   */
  const areaVals = areas.map((a) => a.raw);
  const areaMean = areaVals.reduce((x, y) => x + y, 0) / (areaVals.length || 1);
  const areaSdRaw = Math.sqrt(
    areaVals.reduce((x, v) => x + (v - areaMean) ** 2, 0) / (areaVals.length || 1),
  );
  const AREA_SPREAD = areaSdRaw < SPREAD_FLOOR ? 0 : areaSdRaw;
  const areaZ = new Map(
    areas.map((a) => [
      a.code,
      AREA_SPREAD === 0 ? 0 : Math.max(-3, Math.min(3, (a.raw - areaMean) / AREA_SPREAD)),
    ]),
  );

  // 2. 업무성향 — 성향은 절대값보다 6개 사이의 상대 높낮이가 정보다.
  const traitCodes = await query<{ code: string }>(
    `SELECT code FROM indicator_axes WHERE kind = 'trait' ORDER BY code`,
  );
  const traits = traitCodes.map(({ code }) => {
    const raw = meanBy(rows, (r) => r.axis_code === code);
    return { code, raw: raw ?? 1, scaled: scale100(raw ?? 1) };
  });
  const traitMean = traits.reduce((a, t) => a + t.raw, 0) / (traits.length || 1);
  const traitSd = Math.sqrt(
    traits.reduce((a, t) => a + (t.raw - traitMean) ** 2, 0) / (traits.length || 1),
  );
  // 여섯 성향이 사실상 같게 나오는 응시자가 있다. 이때 표준편차는 정확히 0 이
  // 아니라 1e-16 쯤으로 남아서, 나누면 부동소수점 찌꺼기가 z=±1 로 부풀어
  // 오른다. 리커트 5점에서 0.05 미만의 차이는 신호가 아니므로 0 으로 본다.
  //   — "성향이 고르다" 를 "성향이 뚜렷하다" 로 읽지 않기 위한 바닥값이다.
  const traitZ = new Map(
    traits.map((t) => [
      t.code,
      traitSd < SPREAD_FLOOR
        ? 0
        : Math.max(-3, Math.min(3, (t.raw - traitMean) / traitSd)),
    ]),
  );

  // 3. activity 축 — 변환 행렬은 테이블에 있다.
  const matrix = await query<{ area_code: string; axis_code: string; weight: string }>(
    `SELECT area_code, axis_code, weight FROM job_area_axis_weights`,
  );
  const axisNum = new Map<string, number>();
  const axisDen = new Map<string, number>();
  for (const m of matrix) {
    const area = areaByCode.get(m.area_code);
    if (!area) continue;
    const w = Number(m.weight);
    axisNum.set(m.axis_code, (axisNum.get(m.axis_code) ?? 0) + w * area.raw);
    axisDen.set(m.axis_code, (axisDen.get(m.axis_code) ?? 0) + w);
  }
  const axisRaw = new Map(
    [...axisNum.keys()].map((code) => [code, axisNum.get(code)! / axisDen.get(code)!]),
  );
  const axes = [...axisRaw.keys()].map((code) => ({ code, scaled: scale100(axisRaw.get(code)!) }));

  /**
   * 직무 순위를 매길 때는 축의 절대 높이가 아니라 **그 사람 안에서의 높낮이**
   * 를 쓴다. 축마다 몇 개 분야에서 오는지가 달라서 그렇다 —
   * ANALYZE 는 열 분야 중 여덟에서 평균돼 평평해지고, CODE 는 둘뿐이라 크게
   * 흔들린다. 날것을 그대로 쓰면 CODE 에 가중치를 둔 직무가 사람과 무관하게
   * 유리해진다(500명 시뮬레이션에서 로봇·자동화 28% 대 품질·신뢰성 2%).
   *
   * 성향(traitZ)에 이미 쓰던 방법을 활동 축에도 그대로 쓴다.
   * 절대 높이는 결과지의 8축 레이더가 따로 보여준다 — 거기서는 날것이 맞다.
   */
  // 분야 오차를 축으로 옮긴다. axis = Σ(w·area)/Σw 이므로 오차도 같은 계수로 간다.
  const axisSe = new Map<string, number>();
  for (const code of axisRaw.keys()) {
    let v = 0;
    for (const m of matrix) {
      if (m.axis_code !== code) continue;
      const c = Number(m.weight) / (axisDen.get(code) ?? 1);
      const se = areaSe.get(m.area_code) ?? 0;
      v += (c * se) ** 2;
    }
    axisSe.set(code, Math.sqrt(v));
  }

  const axisVals = [...axisRaw.values()];
  const axisMean = axisVals.reduce((a, b) => a + b, 0) / (axisVals.length || 1);
  const axisSd = Math.sqrt(
    axisVals.reduce((a, v) => a + (v - axisMean) ** 2, 0) / (axisVals.length || 1),
  );
  const SPREAD = axisSd < SPREAD_FLOOR ? 0 : axisSd;
  const axisZ = new Map(
    [...axisRaw.entries()].map(([code, v]) => [
      code,
      SPREAD === 0 ? 0 : Math.max(-3, Math.min(3, (v - axisMean) / SPREAD)),
    ]),
  );

  // 4. 직무 적합도
  //    A = activity 축 가중합. 축 가중치는 job_axis_weights 에 있다.
  //    P = 그 직무가 요구하는 성향과 응시자 성향이 맞는 정도.
  //    현재 트랙(재학생)은 증거(S)와 맥락(C)이 아직 없으므로 A·P 만 쓴다.
  /**
   * 적합 대상의 축 가중치.
   *   대학판 — 그 전공에 달린 직무들 (job_axis_weights)
   *   고교판 — 전공 8개              (major_fit_weights)
   * 둘 다 (대상 코드 × 축 × 무게) 모양이라 아래 산식은 하나로 간다.
   *
   * 대학판의 범위를 전공 코드로 잡는다. 예전에는 'ME.%' 가 코드에 박혀
   * 있어서, 전기전자 검사지를 올리는 순간 기계 직무로 채점됐을 것이다.
   */
  const jobWeights = majorCode
    ? await query<{ code: string; axis_code: string; weight: string }>(
        `SELECT j.code, w.axis_code, w.weight
           FROM job_axis_weights w JOIN job_clusters j ON j.id = w.job_id
          WHERE j.code LIKE $1`,
        [majorCode + ".%"],
      )
    : await query<{ code: string; axis_code: string; weight: string }>(
        `SELECT m.code, w.axis_code, w.weight
           FROM major_fit_weights w JOIN majors m ON m.id = w.major_id`,
      );
  if (!jobWeights.length) {
    throw new Error(
      kind === "job"
        ? `전공 ${majorCode} 에 직무 축 가중치가 없습니다`
        : `major_fit_weights 가 비어 있습니다. npm run metri:seed 를 먼저 돌리세요.`,
    );
  }

  /**
   * 고교판에서 전공 하나가 어느 영역에서 재어졌는지.
   *
   * 대학판은 직무를 문항이 직접 재지 않는다 — 문항은 직무분야를 재고, 축을
   * 거쳐야 직무에 닿는다. 고교판은 다르다. 계열 14문항이 그 계열을 바로
   * 재고 있어서, 축을 한 번 거치면 신호가 섞이기만 한다.
   *
   * 실제로 섞였다. 500명 시뮬레이션에서 전기·전자 문항만 높게 답한 학생의
   * 1순위가 컴퓨터공학 74% 로 나왔다. W·Wᵀ 를 보면 이유가 분명하다 —
   * 전기·전자의 축 분포는 평평해서(ANALYZE .24 가 최대) 자기 자신을 가리키는
   * 힘이 0.155 인데, 컴퓨터공학은 CODE .38 로 뾰족해 0.250 이다. 축을 거치는
   * 순간 뾰족한 전공이 남의 학생까지 가져간다.
   *
   * 그래서 고교판의 A 는 축이 아니라 **그 전공의 영역 점수**에서 온다.
   * 축 8개는 결과지의 레이더와 대학판과의 연속성에 그대로 쓰인다 —
   * 재는 데 안 쓸 뿐, 없애지 않는다.
   */
  const areaOfMajor = new Map<string, string>();
  if (kind === "major") {
    const pairs = await query<{ major_code: string; area_code: string }>(
      `SELECT m.code AS major_code, ja.code AS area_code
         FROM job_areas ja JOIN majors m ON m.id = ja.major_id
        WHERE ja.instrument_key IS NOT DISTINCT FROM $1`,
      [instrumentKey],
    );
    for (const r of pairs) areaOfMajor.set(r.major_code, r.area_code);
  }
  const byJob = new Map<string, { axis: string; w: number }[]>();
  for (const r of jobWeights) {
    if (!byJob.has(r.code)) byJob.set(r.code, []);
    byJob.get(r.code)!.push({ axis: r.axis_code, w: Number(r.weight) });
  }

  // 직무별 선호 성향 — 직무분야 연결에서 유도하지 않고, 축 가중치에서 읽는다.
  //   설계·해석이 무거우면 품질, 현장·조율이 무거우면 협력, 탐구면 독립.
  const traitAffinity: Record<string, string[]> = {
    ANALYZE: ["QUALITY", "INDEP"],
    DESIGN: ["QUALITY", "CHALLENGE"],
    BUILD: ["SPEED", "CHALLENGE"],
    CODE: ["INDEP", "SPEED"],
    FIELD: ["COLLAB", "STABLE"],
    OPTIMIZE: ["QUALITY", "STABLE"],
    RESEARCH: ["INDEP", "CHALLENGE"],
    ORCHESTRATE: ["COLLAB", "STABLE"],
  };

  const jobs = [...byJob.entries()]
    .map(([code, ws]) => {
      const den = ws.reduce((a, x) => a + x.w, 0) || 1;
      // 대학판: 이 직무가 무겁게 보는 축에서 그 사람이 얼마나 위에 있는가
      // 고교판: 그 계열 문항에서 그 사람이 얼마나 위에 있는가 (위 주석 참고)
      const lean =
        kind === "major"
          ? (areaZ.get(areaOfMajor.get(code) ?? "") ?? 0)
          : ws.reduce((acc, x) => acc + x.w * (axisZ.get(x.axis) ?? 0), 0) / den;
      const a = Math.round(sigma(lean) * 1000) / 10;

      // 성향 적합 P: 이 직무에서 무거운 축이 선호하는 성향의 z 를 가중 평균해
      //   0~100 으로 편다. 성향은 높낮이 자체보다 방향이 맞는지가 정보다.
      let pNum = 0;
      let pDen = 0;
      for (const x of ws) {
        for (const t of traitAffinity[x.axis] ?? []) {
          pNum += x.w * (traitZ.get(t) ?? 0);
          pDen += x.w;
        }
      }
      const p = Math.round(sigma(pDen ? pNum / pDen : 0) * 1000) / 10;

      // 재학생 트랙 가중치: 활동 선호 0.75, 업무 성향 0.25.
      const fit = Math.round((0.75 * a + 0.25 * p) * 10) / 10;

      /**
       * 신뢰구간을 잰다.
       *
       * lean 은 축 z 의 가중합이고, 축마다 표준오차가 있다. 그것을 모아
       * lean 의 오차를 만들고, 로지스틱의 기울기(120·σ·(1-σ))를 곱해
       * 적합도 점수 단위로 옮긴다. 여기에 응답 품질에서 온 벌점을 더한다 —
       * 같은 보기를 연타한 사람은 측정 자체가 덜 믿을 만하기 때문이다.
       */
      let leanVar = 0;
      if (kind === "major") {
        // 영역 점수 하나에서 바로 온다. areaSe 는 0~100 단위이므로 z 단위로 되돌린다.
        const se = (areaSe.get(areaOfMajor.get(code) ?? "") ?? 0) /
          (AREA_SPREAD === 0 ? 1 : AREA_SPREAD * 25);
        leanVar = se ** 2;
      } else {
        for (const x of ws) {
          const se = (axisSe.get(x.axis) ?? 0) / (SPREAD === 0 ? 1 : SPREAD * 25);
          leanVar += ((x.w / den) * se) ** 2;
        }
      }
      const sg = sigma(lean);
      const seFit = 120 * sg * (1 - sg) * 1.2 * Math.sqrt(leanVar);
      /**
       * 폭은 표준오차 1배(약 68%)로 잡는다.
       *
       * 95%(1.96배)로 잡아 봤더니 500명 중 절반이 1군에 직무 네 개 이상을
       * 담았고, 열에 하나는 여덟 개가 전부 한 묶음이 됐다. "여덟 개 중에
       * 어느 것인지 모르겠습니다" 는 결과지가 아니다.
       *
       * 검사 점수 보고에서 표준오차 1배는 관례이기도 하다. 다만 이 폭으로
       * 두 직무를 "못 가른다" 고 판정하는 것은 대략 1.4시그마 검정이므로,
       * 결과지 문구도 "우열을 가릴 수 없다" 까지만 말하고 그 이상을
       * 주장하지 않는다.
       */
      const half = Math.max(0.5, seFit + (q.bandWidth - 6) / 2);

      return {
        code,
        fit,
        a: Math.round(a * 10) / 10,
        p,
        band: [
          Math.max(0, Math.round((fit - half) * 10) / 10),
          Math.min(100, Math.round((fit + half) * 10) / 10),
        ] as [number, number],
      };
    })
    .sort((x, y) => y.fit - x.fit)
    .map((j, i) => ({ ...j, rank: i + 1 }));

  /**
   * 등수를 묶음으로 바꾼다.
   *
   * 측정 오차가 1위와 2위의 차이보다 크다(시뮬레이션에서 7.3 대 3.7).
   * 그 상태로 "1위 · 2위" 를 적으면 없는 정밀도를 파는 것이다. 구간이
   * 겹치면 같은 묶음으로 둔다.
   *
   * 비교 대상은 바로 앞 직무가 아니라 그 묶음의 머리다. 앞 직무와만
   * 비교하면 조금씩 겹치는 것이 사슬처럼 이어져 여덟 개가 한 묶음이 된다.
   */
  const tiered = jobs.map((j) => ({ ...j, tier: 1 }));
  let tier = 1;
  let head = tiered[0];
  for (let i = 1; i < tiered.length; i++) {
    if (tiered[i].band[1] < head.band[0]) {
      tier += 1;
      head = tiered[i];
    }
    tiered[i].tier = tier;
  }

  const result: AttemptScore = { kind, areas, traits, axes, jobs: tiered, quality: q };
  await persist(attemptId, result);
  return result;
}

async function persist(attemptId: string, s: AttemptScore) {
  await tx(async (c) => {
    await c.query(`DELETE FROM area_scores     WHERE attempt_id = $1`, [attemptId]);
    await c.query(`DELETE FROM indicator_scores WHERE attempt_id = $1`, [attemptId]);
    await c.query(`DELETE FROM job_fit_scores   WHERE attempt_id = $1`, [attemptId]);
    await c.query(`DELETE FROM major_fit_scores WHERE attempt_id = $1`, [attemptId]);

    for (const a of s.areas) {
      await c.query(
        `INSERT INTO area_scores (attempt_id, area_code, raw_score, scaled_score, rank_no)
         VALUES ($1, $2, $3, $4, $5)`,
        [attemptId, a.code, a.raw.toFixed(2), a.scaled, a.rank],
      );
    }

    // indicator_scores 는 검사 버전에 묶인 indicators 를 가리킨다.
    for (const t of [...s.traits, ...s.axes.map((a) => ({ code: a.code, raw: 0, scaled: a.scaled }))]) {
      const ind = await c.query<{ id: string }>(
        `SELECT i.id FROM indicators i
           JOIN questions q ON q.instrument_id = i.instrument_id
           JOIN attempts a ON a.id = $1
           JOIN test_sessions ts ON ts.id = a.session_id AND ts.instrument_id = i.instrument_id
          WHERE i.code = $2 LIMIT 1`,
        [attemptId, t.code],
      );
      if (!ind.rows[0]) continue;
      await c.query(
        `INSERT INTO indicator_scores (attempt_id, indicator_id, raw_score, scaled_score)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (attempt_id, indicator_id)
         DO UPDATE SET raw_score = EXCLUDED.raw_score, scaled_score = EXCLUDED.scaled_score`,
        [attemptId, ind.rows[0].id, t.raw.toFixed(2), t.scaled],
      );
    }

    // 같은 숫자를 대상만 바꿔 담는다. 고교판은 직무가 없으므로 전공 표로 간다.
    const into =
      s.kind === "job"
        ? `INSERT INTO job_fit_scores
             (attempt_id, job_id, fit_score, rank_no, a_score, p_score, band_low, band_high, tier)
           SELECT $1, id, $3, $4, $5, $6, $7, $8, $9 FROM job_clusters WHERE code = $2`
        : `INSERT INTO major_fit_scores
             (attempt_id, major_id, fit_score, rank_no, a_score, p_score, band_low, band_high, tier)
           SELECT $1, id, $3, $4, $5, $6, $7, $8, $9 FROM majors WHERE code = $2`;
    for (const j of s.jobs) {
      await c.query(into, [
        attemptId, j.code, j.fit, j.rank, j.a, j.p, j.band[0], j.band[1], j.tier,
      ]);
    }

    await c.query(
      `INSERT INTO attempt_quality
         (attempt_id, straightline_run, fast_ratio, attention_pass, attention_total,
          band_width, flagged, flag)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (attempt_id) DO UPDATE SET
         straightline_run = EXCLUDED.straightline_run, fast_ratio = EXCLUDED.fast_ratio,
         attention_pass = EXCLUDED.attention_pass, attention_total = EXCLUDED.attention_total,
         band_width = EXCLUDED.band_width, flagged = EXCLUDED.flagged, flag = EXCLUDED.flag`,
      [
        attemptId,
        s.quality.straightRun,
        s.quality.fastRatio,
        s.quality.attentionPassed,
        s.quality.attentionTotal,
        s.quality.bandWidth,
        s.quality.flag !== "ok",
        s.quality.flag,
      ],
    );

    await c.query(`UPDATE attempts SET status = 'scored', scored_at = now() WHERE id = $1`, [attemptId]);
  });
}
