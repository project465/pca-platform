/**
 * 돌아온 평정표를 모아 채점 가중치로 넣는다.
 *
 *   npm run import:weights -- 1 out/받은표/*.xlsx          (검사 도구 id, 파일들)
 *   npm run import:weights -- 1 out/받은표/*.xlsx --dry    (넣지 않고 결과만 본다)
 *
 * 집계 규칙 세 가지. 값을 평균만 내고 끝내지 않는 이유가 각각 있다.
 *
 *  1. 표준편차가 큰 칸은 채택하지 않는다.
 *     평정자들이 그 지표를 서로 다르게 읽었다는 뜻이고, 평균은 그 불일치를 감춘다.
 *     그 칸만 다시 물어보는 편이 낫다.
 *
 *  2. 평균이 낮은 칸은 0으로 내린다.
 *     약한 가중치를 많이 남기면 모든 직무 점수가 비슷해져서 결과지가 아무 말도
 *     못 하게 된다. 0 은 산식에서 분모에서도 빠지므로 "관계없음"이라는 선언이다.
 *
 *  3. 평정자가 적으면 표시만 하고 넣는다.
 *     2~3명으로 정한 값은 근거가 약하다. 막지는 않되 어느 칸인지 알려준다.
 *
 * 산식이 가중평균이라(= 합으로 나눈다) 열 합을 100 으로 맞출 필요가 없다.
 * 평균값을 그대로 넣어도 결과는 같다.
 */
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { query, queryOne } from "../src/lib/db";
import { namesOf } from "../src/lib/i18n";
import { readSheet, SheetError } from "../src/lib/sheet";
import { saveWeights, type WeightCell } from "../src/lib/scoring";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* 환경변수가 이미 있다고 본다 */
  }
}
loadEnv(".env.local");

const MAX_SCORE = 4;
/** 이보다 흩어지면 그 칸은 채택하지 않는다 */
const SD_LIMIT = 1.2;
/** 이보다 낮은 평균은 0 으로 내린다 */
const FLOOR = 1.0;
/** 이보다 적은 평정자로 정해진 칸은 표시한다 */
const THIN = 4;

type Rating = { job: string; indicator: string; score: number; rater: string; file: string };

function cell(rows: string[][], r: number, c: number): string {
  return (rows[r]?.[c] ?? "").trim();
}

/** 평정표 한 장을 읽는다. 만든 형식이 아니면 이유를 말하고 건너뛴다 */
function readRatings(file: string, instrumentId: string): Rating[] | string {
  let rows: string[][];
  try {
    rows = readSheet(file, readFileSync(file));
  } catch (e) {
    return e instanceof SheetError ? e.message : "읽을 수 없는 파일입니다.";
  }

  // 3행: 직무 영역 · 이름 · 코드   4행: 검사 도구 · 표기 · instrument:<id>
  const jobCode = cell(rows, 2, 2);
  const instTag = cell(rows, 3, 2);
  if (!jobCode) return "직무 코드 칸(C3)이 비었습니다. 평정표 서식이 아닌 것 같습니다.";
  if (instTag && instTag !== `instrument:${instrumentId}`) {
    return `다른 검사 도구의 평정표입니다 (${instTag}).`;
  }

  const rater = cell(rows, 4, 1) || "(이름 없음)";

  // 머리글 줄을 찾는다. 행을 몇 개 지웠다 넣었다 해도 견디게
  const head = rows.findIndex((r) => (r?.[0] ?? "").trim() === "지표 코드");
  if (head < 0) return "'지표 코드' 머리글을 찾지 못했습니다.";

  const out: Rating[] = [];
  for (let i = head + 1; i < rows.length; i++) {
    const code = cell(rows, i, 0);
    if (!code) break; // 표는 빈 줄에서 끝난다
    const raw = cell(rows, i, 2);
    if (raw === "") continue; // 판단하기 어려워 비워둔 칸
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
      return `${i + 1}행 '${code}' 의 중요도가 0~${MAX_SCORE} 가 아닙니다: ${raw}`;
    }
    out.push({ job: jobCode, indicator: code, score, rater, file: basename(file) });
  }
  if (out.length === 0) return "채워진 칸이 없습니다.";
  return out;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** 표본 표준편차. 한 명이면 0 */
function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

const f1 = (n: number) => n.toFixed(1);


/**
 * 판별력. 이 가중치로 기존 응시를 다시 채점하면 직무 점수가 얼마나 벌어지는지 본다.
 * 1위와 꼴찌가 붙어 있으면 결과지가 "당신은 이 직무입니다"라고 말할 수 없다.
 * 채점을 건드리지 않고 계산만 해본다.
 */
async function spread(instrumentId: string) {
  return queryOne<{ n: number; avg_spread: string | null }>(
    `WITH s AS (
       SELECT i.attempt_id, i.indicator_id, i.scaled_score
         FROM indicator_scores i
         JOIN attempts a       ON a.id = i.attempt_id
         JOIN test_sessions ts ON ts.id = a.session_id
        WHERE ts.instrument_id = $1 AND a.status = 'scored'
     ),
     f AS (
       SELECT s.attempt_id, w.job_id,
              sum(s.scaled_score * w.weight) / sum(w.weight) AS fit
         FROM s
         JOIN scoring_weights w
           ON w.indicator_id = s.indicator_id AND w.instrument_id = $1 AND w.weight > 0
        GROUP BY s.attempt_id, w.job_id
     ),
     g AS (SELECT attempt_id, max(fit) - min(fit) AS gap FROM f GROUP BY attempt_id)
     SELECT count(*)::int AS n, to_char(avg(gap), 'FM990.0') AS avg_spread FROM g`,
    [instrumentId],
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const rest = args.filter((a) => a !== "--dry");
  const instrumentId = rest[0];
  const files = rest.slice(1);

  if (!instrumentId || !/^\d+$/.test(instrumentId) || files.length === 0) {
    console.error("사용법: npm run import:weights -- <검사도구id> <평정표 파일…> [--dry]");
    process.exit(1);
  }

  const inst = await queryOne<{ id: string; major_id: string }>(
    `SELECT id, major_id FROM instruments WHERE id = $1`,
    [instrumentId],
  );
  if (!inst) {
    console.error(`검사 도구 ${instrumentId} 을(를) 찾지 못했습니다.`);
    process.exit(1);
  }

  const [indicatorRows, jobRows] = await Promise.all([
    query<{ id: string; code: string }>(
      `SELECT id, code FROM indicators WHERE instrument_id = $1 ORDER BY id`,
      [instrumentId],
    ),
    query<{ id: string; code: string }>(
      `SELECT id, code FROM job_clusters WHERE major_id = $1 ORDER BY sort_no, code`,
      [inst.major_id],
    ),
  ]);
  const indicatorId = new Map(indicatorRows.map((r) => [r.code, r.id]));
  const jobId = new Map(jobRows.map((r) => [r.code, r.id]));
  const jobNames = await namesOf("job_clusters", jobRows.map((r) => r.id), "ko");

  /* ---- 파일 읽기 ---- */
  const ratings: Rating[] = [];
  const skipped: string[] = [];
  const unknown = new Set<string>();

  for (const file of files) {
    const got = readRatings(file, instrumentId);
    if (typeof got === "string") {
      skipped.push(`${basename(file)} — ${got}`);
      continue;
    }
    for (const r of got) {
      if (!jobId.has(r.job)) {
        unknown.add(`직무 코드 ${r.job} (${basename(file)})`);
        continue;
      }
      if (!indicatorId.has(r.indicator)) {
        unknown.add(`지표 코드 ${r.indicator} (${basename(file)})`);
        continue;
      }
      ratings.push(r);
    }
  }

  if (skipped.length > 0) {
    console.log("건너뛴 파일");
    for (const s of skipped) console.log("  " + s);
    console.log("");
  }
  if (unknown.size > 0) {
    console.log("모르는 코드 — 무시했습니다");
    for (const u of unknown) console.log("  " + u);
    console.log("");
  }
  if (ratings.length === 0) {
    console.error("쓸 수 있는 평정이 없습니다.");
    process.exit(1);
  }

  /* ---- 집계 ---- */
  const bucket = new Map<string, number[]>();
  const raters = new Map<string, Set<string>>();
  for (const r of ratings) {
    const key = `${r.job} ${r.indicator}`;
    if (!bucket.has(key)) bucket.set(key, []);
    bucket.get(key)!.push(r.score);
    if (!raters.has(r.job)) raters.set(r.job, new Set());
    raters.get(r.job)!.add(r.rater);
  }

  const cells: WeightCell[] = [];
  const disputed: string[] = [];
  const thin: string[] = [];
  const zeroed: string[] = [];
  const perJob = new Map<string, { name: string; kept: number; total: number; top: string[] }>();

  for (const [key, scores] of bucket) {
    const [job, indicator] = key.split(" ");
    const m = mean(scores);
    const s = sd(scores);
    const label = `${jobNames.get(jobId.get(job)!) ?? job} · ${indicator}`;

    let weight = m;
    if (s >= SD_LIMIT) {
      // 합의가 안 된 칸. 0 으로 두고 사람이 다시 본다
      weight = 0;
      disputed.push(`${label}  평균 ${f1(m)} · 표준편차 ${f1(s)} · ${scores.length}명`);
    } else if (m < FLOOR) {
      weight = 0;
      zeroed.push(`${label}  평균 ${f1(m)}`);
    }
    if (scores.length < THIN && weight > 0) {
      thin.push(`${label}  ${scores.length}명`);
    }

    cells.push({
      indicatorId: indicatorId.get(indicator)!,
      jobId: jobId.get(job)!,
      weight: Math.round(weight * 1000) / 1000,
    });

    if (!perJob.has(job)) {
      perJob.set(job, { name: jobNames.get(jobId.get(job)!) ?? job, kept: 0, total: 0, top: [] });
    }
    const p = perJob.get(job)!;
    p.total++;
    if (weight > 0) {
      p.kept++;
      p.top.push(`${indicator} ${f1(weight)}`);
    }
  }

  /* ---- 보고 ---- */
  console.log(`평정 ${ratings.length}칸 · 평정자 ${new Set(ratings.map((r) => r.rater)).size}명`);
  console.log("");
  console.log("직무별 결과");
  for (const [job, p] of [...perJob].sort((a, b) => a[1].name.localeCompare(b[1].name, "ko"))) {
    const n = raters.get(job)?.size ?? 0;
    console.log(`  ${p.name.padEnd(20)} 살린 지표 ${p.kept}/${p.total} · 평정자 ${n}명`);
    if (p.kept > 0) {
      const top = p.top
        .map((t) => t.split(" "))
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 4)
        .map((t) => `${t[0]} ${t[1]}`)
        .join(" · ");
      console.log(`  ${" ".repeat(20)} ${top}`);
    }
  }

  if (disputed.length > 0) {
    console.log("");
    console.log(`합의가 안 된 칸 — 0 으로 두었습니다 (표준편차 ${SD_LIMIT} 이상)`);
    for (const d of disputed) console.log("  " + d);
    console.log("  이 칸만 다시 물어보세요. 대개 지표 이름을 서로 다르게 읽은 경우입니다.");
  }
  if (zeroed.length > 0) {
    console.log("");
    console.log(`낮아서 0 으로 내린 칸 (평균 ${FLOOR} 미만) — ${zeroed.length}개`);
  }
  if (thin.length > 0) {
    console.log("");
    console.log(`평정자가 ${THIN}명 미만인 칸 — 값은 넣었지만 근거가 약합니다`);
    for (const t of thin.slice(0, 12)) console.log("  " + t);
    if (thin.length > 12) console.log(`  … 그 외 ${thin.length - 12}개`);
  }

  const empty = [...perJob.values()].filter((p) => p.kept === 0).map((p) => p.name);
  if (empty.length > 0) {
    console.log("");
    console.log("살아남은 지표가 하나도 없는 직무 — 결과지에 나오지 않습니다");
    for (const e of empty) console.log("  " + e);
  }

  if (dry) {
    console.log("");
    console.log("--dry 라 넣지 않았습니다.");
    return;
  }

  await saveWeights(instrumentId, cells);
  console.log("");
  console.log(`가중치 ${cells.filter((c) => c.weight > 0).length}칸을 넣었습니다.`);
  console.log("회차 화면에서 채점을 다시 돌리면 반영됩니다.");

  // 이미 채점된 응시가 있으면 이 가중치가 실제로 갈라주는지 본다
  const sp = await spread(instrumentId);
  if (sp && sp.n > 0 && sp.avg_spread !== null) {
    const gap = Number(sp.avg_spread);
    console.log("");
    console.log(`판별력 — 기존 응시 ${sp.n}건 기준, 1위 직무와 꼴찌 직무의 평균 차이 ${sp.avg_spread}점`);
    if (gap < 15) {
      console.log("  15점이 안 됩니다. 가중치가 평평해서 결과지가 직무를 고르지 못합니다.");
      console.log("  0 으로 내릴 칸이 더 있거나, 아직 평정이 안 들어온 직무가 남아 있습니다.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
