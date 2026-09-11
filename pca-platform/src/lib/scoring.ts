/**
 * METRI 채점 엔진.
 *
 * 원칙 하나만 지킨다 — 점수는 산식이 만들고, 문장은 모델이 만든다.
 * 이 파일은 점수만 만든다. 여기서 나온 숫자가 결과지의 82점이 되고,
 * LLM 이 쓴 문장은 이 숫자를 읽기만 할 뿐 절대 이 숫자를 바꾸지 않는다.
 *
 * 채점 순서
 *   1. 직무분야 10개      문항이 직접 재는 것. 25문항 평균.
 *   2. 업무성향 6개        120문항이 재는 것. 20문항 평균.
 *   3. activity 축 8개     1번을 job_area_axis_weights 로 옮긴 해석값.
 *   4. 직무 적합도         3번 × job_axis_weights + 성향 보정.
 *   5. 응답 품질           신뢰구간의 폭을 정한다.
 *
 * 3번의 변환 행렬도 4번의 가중치도 코드가 아니라 테이블에 있다.
 * 전공이 늘거나 가중치를 바꿀 때 이 파일은 건드리지 않는다.
 */
import { query, tx } from "./db";

/** 리커트 5점을 0~100 으로. 1점=0, 3점=50, 5점=100. */
export function scale100(mean1to5: number): number {
  return Math.round(((mean1to5 - 1) / 4) * 1000) / 10;
}

/** 로지스틱. 평균보다 위면 빠르게 올라가고 아래면 빠르게 떨어진다. */
function sigma(z: number): number {
  return 1 / (1 + Math.exp(-1.2 * z));
}

export type AttemptScore = {
  areas: { code: string; raw: number; scaled: number; rank: number }[];
  traits: { code: string; raw: number; scaled: number }[];
  axes: { code: string; scaled: number }[];
  jobs: { code: string; fit: number; a: number; p: number; band: [number, number]; rank: number }[];
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

  const flag: Quality["flag"] =
    attentionPassed === 0 && attention.length > 0
      ? "invalid"
      : bandWidth >= 14
        ? "check"
        : "ok";

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

  // 1. 직무분야
  const areaCodes = await query<{ code: string }>(`SELECT code FROM job_areas ORDER BY sort_no`);
  const areas = areaCodes
    .map(({ code }) => {
      const raw = meanBy(rows, (r) => r.area_code === code && r.item_kind !== "attention");
      return { code, raw: raw ?? 1, scaled: scale100(raw ?? 1) };
    })
    .sort((a, b) => b.scaled - a.scaled)
    .map((a, i) => ({ ...a, rank: i + 1 }));
  const areaByCode = new Map(areas.map((a) => [a.code, a]));

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
  const SPREAD_FLOOR = 0.05;
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
  const axes = [...axisNum.keys()].map((code) => ({
    code,
    scaled: scale100(axisNum.get(code)! / axisDen.get(code)!),
  }));
  const axisByCode = new Map(axes.map((a) => [a.code, a.scaled]));

  // 4. 직무 적합도
  //    A = activity 축 가중합. 축 가중치는 job_axis_weights 에 있다.
  //    P = 그 직무가 요구하는 성향과 응시자 성향이 맞는 정도.
  //    현재 트랙(재학생)은 증거(S)와 맥락(C)이 아직 없으므로 A·P 만 쓴다.
  const jobWeights = await query<{ code: string; axis_code: string; weight: string }>(
    `SELECT j.code, w.axis_code, w.weight
       FROM job_axis_weights w JOIN job_clusters j ON j.id = w.job_id
      WHERE j.code LIKE 'ME.%'`,
  );
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
      const a = ws.reduce((acc, x) => acc + x.w * (axisByCode.get(x.axis) ?? 0), 0) / den;

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
      const half = q.bandWidth / 2;
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

  await persist(attemptId, { areas, traits, axes, jobs, quality: q });
  return { areas, traits, axes, jobs, quality: q };
}

async function persist(attemptId: string, s: AttemptScore) {
  await tx(async (c) => {
    await c.query(`DELETE FROM area_scores     WHERE attempt_id = $1`, [attemptId]);
    await c.query(`DELETE FROM indicator_scores WHERE attempt_id = $1`, [attemptId]);
    await c.query(`DELETE FROM job_fit_scores   WHERE attempt_id = $1`, [attemptId]);

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

    for (const j of s.jobs) {
      await c.query(
        `INSERT INTO job_fit_scores
           (attempt_id, job_id, fit_score, rank_no, a_score, p_score, band_low, band_high)
         SELECT $1, id, $3, $4, $5, $6, $7, $8 FROM job_clusters WHERE code = $2`,
        [attemptId, j.code, j.fit, j.rank, j.a, j.p, j.band[0], j.band[1]],
      );
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
