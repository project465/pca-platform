/**
 * 기계공학과 한 학년을 통째로 흉내 내 본다.
 *
 * 전공을 늘리기 전에 확인할 것은 하나다 — **산식이 사람을 갈라내는가.**
 * 500명을 넣었는데 전부 같은 직무가 1순위로 나오거나, 적합도가 55~65 사이에
 * 몰려 있으면 그 결과지는 팔 수 없다. 전기전자·컴퓨터로 같은 뼈대를 복사하기
 * 전에 여기서 봐야 한다.
 *
 * 가짜 응시자를 만드는 방식
 *   1. 사람마다 숨은 성향(직무분야 10개 + 업무성향 6개)을 뽑는다
 *   2. 그 성향대로 문항에 답한다. 잡음을 섞어 실제 응답처럼 흔든다
 *   3. 일부는 일부러 불성실하게 답한다 (같은 보기 연타 · 무작위 · 성실도 실패)
 *
 * 그리고 채점 엔진이 1번의 숨은 성향을 되찾아 내는지 본다.
 * 되찾지 못하면 산식이 틀린 것이고, 되찾으면 전공을 늘려도 된다.
 */
import { query, queryOne, tx } from "../../src/lib/db";
import { score } from "../../src/lib/scoring";
import { buildCohort } from "../../src/lib/cohort";

const N = 500;
const SEED = 20260911;

/* ── 재현 가능한 난수 ────────────────────────────── */
let seed = SEED;
function rnd(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
/** 박스-뮬러. 평균 0 표준편차 1 */
function gauss(): number {
  const u = Math.max(1e-9, rnd());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ── 사람의 원형 ─────────────────────────────────── */
const AREAS = [
  "DESIGN_DEV", "MFG_PROD", "ENERGY_PLANT", "AUTO_AERO", "ROBOT_AUTO",
  "IT_DATA", "CONSTR_FACIL", "RND_EDU", "BIO_HEALTH", "PUBLIC_ETC",
] as const;
const TRAITS = ["INDEP", "CHALLENGE", "SPEED", "COLLAB", "STABLE", "QUALITY"] as const;

type Vec = Partial<Record<string, number>>;

/**
 * 여섯 가지 사람. 마지막 "두루형" 이 진짜 시험대다 — 뚜렷한 사람은 아무
 * 산식이나 맞히고, 평평한 사람에게 무엇을 말해 주느냐가 제품의 값이다.
 */
const ARCHETYPES: { name: string; share: number; area: Vec; trait: Vec }[] = [
  { name: "설계형", share: 0.20,
    area: { DESIGN_DEV: 0.90, AUTO_AERO: 0.70, RND_EDU: 0.50, ROBOT_AUTO: 0.45 },
    trait: { QUALITY: 0.80, INDEP: 0.65, CHALLENGE: 0.55 } },
  { name: "현장형", share: 0.20,
    area: { MFG_PROD: 0.90, ENERGY_PLANT: 0.80, CONSTR_FACIL: 0.70 },
    trait: { COLLAB: 0.80, STABLE: 0.75, SPEED: 0.60 } },
  { name: "연구형", share: 0.15,
    area: { RND_EDU: 0.90, AUTO_AERO: 0.65, BIO_HEALTH: 0.55, DESIGN_DEV: 0.50 },
    trait: { INDEP: 0.85, QUALITY: 0.70, CHALLENGE: 0.60 } },
  { name: "소프트형", share: 0.15,
    area: { IT_DATA: 0.90, ROBOT_AUTO: 0.70, RND_EDU: 0.50 },
    trait: { INDEP: 0.70, SPEED: 0.70, CHALLENGE: 0.65 } },
  { name: "로봇형", share: 0.15,
    area: { ROBOT_AUTO: 0.90, IT_DATA: 0.65, MFG_PROD: 0.55, DESIGN_DEV: 0.50 },
    trait: { CHALLENGE: 0.80, SPEED: 0.65, INDEP: 0.55 } },
  { name: "두루형", share: 0.15, area: {}, trait: {} },
];

/** 불성실 응답자 비율 */
const BAD = { straight: 0.05, random: 0.03, careless: 0.02 };

type Person = {
  id: number;
  archetype: string;
  area: Record<string, number>;
  trait: Record<string, number>;
  mode: "normal" | "straight" | "random" | "careless";
};

function makePeople(): Person[] {
  const out: Person[] = [];
  const bag: string[] = [];
  for (const a of ARCHETYPES) {
    for (let i = 0; i < Math.round(a.share * N); i++) bag.push(a.name);
  }
  while (bag.length < N) bag.push("두루형");

  for (let i = 0; i < N; i++) {
    const name = bag[i];
    const arch = ARCHETYPES.find((a) => a.name === name)!;
    const area: Record<string, number> = {};
    for (const a of AREAS) {
      // 원형이 정한 값 + 사람마다의 흔들림. 원형에 없는 분야는 중간에서 흔들린다
      area[a] = clamp((arch.area[a] ?? 0.42) + gauss() * 0.10, 0.02, 0.98);
    }
    const trait: Record<string, number> = {};
    for (const t of TRAITS) {
      trait[t] = clamp((arch.trait[t] ?? 0.45) + gauss() * 0.13, 0.02, 0.98);
    }

    const r = rnd();
    const mode: Person["mode"] =
      r < BAD.straight ? "straight"
      : r < BAD.straight + BAD.random ? "random"
      : r < BAD.straight + BAD.random + BAD.careless ? "careless"
      : "normal";

    out.push({ id: i + 1, archetype: name, area, trait, mode });
  }
  return out;
}

/* ── 응답 만들기 ─────────────────────────────────── */

type Item = {
  id: string;
  order_no: number;
  area_code: string | null;
  axis_code: string | null;
  item_kind: string;
  attention_expect: number | null;
  opt: Record<number, string>;
};

/** 숨은 성향 → 1~5 보기 하나 */
function answer(p: Person, it: Item): number {
  if (it.item_kind === "attention") {
    if (p.mode === "careless" || p.mode === "random") return 1 + Math.floor(rnd() * 5);
    if (p.mode === "straight") return 4;
    return rnd() < 0.97 ? it.attention_expect! : 1 + Math.floor(rnd() * 5);
  }
  if (p.mode === "straight") return 4;
  if (p.mode === "random") return 1 + Math.floor(rnd() * 5);

  const a = p.area[it.area_code!] ?? 0.45;
  // 성향 문항은 분야와 성향을 함께 재는 문항이다. 원본 엑셀의 구조 그대로다.
  const latent = it.axis_code ? 0.55 * a + 0.45 * (p.trait[it.axis_code] ?? 0.45) : a;
  return clamp(Math.round(1 + 4 * latent + gauss() * 0.55), 1, 5);
}

/* ── 실행 ────────────────────────────────────────── */

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
function stats(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
  const q = (f: number) => s[Math.min(s.length - 1, Math.floor(f * s.length))];
  return { min: s[0], max: s[s.length - 1], mean, sd, p10: q(0.1), p50: q(0.5), p90: q(0.9) };
}
const f1 = (x: number) => x.toFixed(1);

async function main() {
  console.log(`기계공학과 ${N}명 시뮬레이션 (seed ${SEED})\n`);

  // ---- 판 깔기 ----
  await query(`DELETE FROM attempts WHERE session_id IN (SELECT id FROM test_sessions WHERE name LIKE 'SIM%')`);
  await query(`DELETE FROM test_sessions WHERE name LIKE 'SIM%'`);
  await query(`DELETE FROM contracts WHERE title LIKE 'SIM%'`);
  await query(`DELETE FROM users WHERE login_id LIKE 'sim-%'`);

  const org = await queryOne<{ id: string }>(
    `INSERT INTO organizations (code, country, org_type) VALUES ('SIMORG','KR','department')
     ON CONFLICT (code) DO UPDATE SET status='active' RETURNING id`);
  const inst = await queryOne<{ id: string }>(
    `SELECT id FROM instruments WHERE status='published' ORDER BY id DESC LIMIT 1`);

  const contract = await tx(async (c) => {
    const r = await c.query<{ id: string }>(
      `INSERT INTO contracts (org_id, title, starts_on, ends_on, seat_count)
       VALUES ($1,'SIM 계약', current_date, current_date+365, $2) RETURNING id`, [org!.id, N]);
    await c.query(`INSERT INTO seats (contract_id) SELECT $1 FROM generate_series(1,$2)`, [r.rows[0].id, N]);
    return r.rows[0].id;
  });
  const sess = await queryOne<{ id: string }>(
    `INSERT INTO test_sessions (org_id, contract_id, kind, instrument_id, name, opens_at, closes_at, release_mode)
     VALUES ($1,$2,'org',$3,'SIM 2026 기계공학과', now(), now()+interval '30 days','instant') RETURNING id`,
    [org!.id, contract, inst!.id]);

  const rows = await query<Omit<Item, "opt">>(
    `SELECT id, order_no, area_code, axis_code, item_kind, attention_expect
       FROM questions WHERE instrument_id=$1 ORDER BY order_no`, [inst!.id]);
  const opts = await query<{ question_id: string; order_no: number; id: string }>(
    `SELECT question_id, order_no, id FROM question_options
      WHERE question_id = ANY($1::bigint[])`, [rows.map(r => r.id)]);
  const items: Item[] = rows.map((r) => ({
    ...r,
    opt: Object.fromEntries(opts.filter(o => o.question_id === r.id).map(o => [o.order_no, o.id])),
  }));
  console.log(`문항 ${items.length}개 · 좌석 ${N}개 준비`);

  // ---- 응시자 만들고 답하게 하기 ----
  const people = makePeople();
  const t0 = Date.now();
  const attemptOf = new Map<number, string>();

  for (const p of people) {
    const uid = await tx(async (c) => {
      const u = await c.query<{ id: string }>(
        `INSERT INTO users (login_id, display_name, password_hash, must_reset_pw, status)
         VALUES ($1,$2,'x',false,'active') RETURNING id`,
        [`sim-${String(p.id).padStart(4, "0")}`, `응시자${p.id}`]);
      const uid = u.rows[0].id;
      const seat = await c.query<{ id: string }>(
        `UPDATE seats SET user_id=$2, assigned_at=now()
          WHERE id=(SELECT id FROM seats WHERE contract_id=$1 AND user_id IS NULL ORDER BY id LIMIT 1)
        RETURNING id`, [contract, uid]);
      const a = await c.query<{ id: string }>(
        `INSERT INTO attempts (session_id, user_id, seat_id, status, started_at, submitted_at)
         VALUES ($1,$2,$3,'submitted',now(),now()) RETURNING id`,
        [sess!.id, uid, seat.rows[0].id]);

      // 253개를 한 번에 넣는다. 한 문항씩 왕복하면 하루가 걸린다
      const vals: string[] = [];
      const args: unknown[] = [a.rows[0].id];
      for (const it of items) {
        const v = answer(p, it);
        const ms = p.mode === "straight" ? 600 + Math.floor(rnd() * 400)
                 : p.mode === "random" ? 900 + Math.floor(rnd() * 600)
                 : 3000 + Math.floor(rnd() * 9000);
        args.push(it.opt[v], ms);
        vals.push(`($1::bigint, $${args.length - 1}::bigint, $${args.length}::int)`);
      }
      await c.query(
        `INSERT INTO responses (attempt_id, question_id, option_id, elapsed_ms)
         SELECT v.a, o.question_id, v.o, v.ms
           FROM (VALUES ${vals.join(",")}) AS v(a, o, ms)
           JOIN question_options o ON o.id = v.o`, args);
      return { uid, attempt: a.rows[0].id };
    });
    attemptOf.set(p.id, uid.attempt);
  }
  console.log(`응답 ${N * items.length}건 저장 ${((Date.now() - t0) / 1000).toFixed(1)}초`);

  // ---- 채점 ----
  const t1 = Date.now();
  const results = new Map<number, Awaited<ReturnType<typeof score>>>();
  for (const p of people) results.set(p.id, await score(attemptOf.get(p.id)!));
  console.log(`채점 ${N}명 ${((Date.now() - t1) / 1000).toFixed(1)}초 (1인당 ${((Date.now() - t1) / N).toFixed(0)}ms)\n`);

  await report(people, results);
  process.exit(0);
}

async function report(people: Person[], results: Map<number, Awaited<ReturnType<typeof score>>>) {
  const names = await query<{ code: string; name: string }>(
    `SELECT jc.code, COALESCE((SELECT value FROM translations
        WHERE table_name='job_clusters' AND row_id=jc.id AND lang='ko' AND field='name'), jc.code) AS name
       FROM job_clusters jc WHERE jc.code LIKE 'ME.%'`);
  const label = new Map(names.map(n => [n.code, n.name]));

  const good = people.filter(p => p.mode === "normal");

  console.log("═══ 1. 1순위 직무가 갈리는가 ═══");
  const top1 = new Map<string, number>();
  for (const p of good) {
    const j = results.get(p.id)!.jobs[0].code;
    top1.set(j, (top1.get(j) ?? 0) + 1);
  }
  const sorted = [...top1.entries()].sort((a, b) => b[1] - a[1]);
  for (const [code, n] of sorted) {
    const bar = "█".repeat(Math.round((n / good.length) * 40));
    console.log(`  ${(label.get(code) ?? code).padEnd(18)} ${String(n).padStart(3)}명 ${pct(n / good.length).padStart(6)} ${bar}`);
  }
  console.log(`  → 서로 다른 직무 ${sorted.length}개 / 8개. 가장 몰린 곳 ${pct(sorted[0][1] / good.length)}`);

  console.log("\n═══ 2. 적합도가 퍼지는가 ═══");
  const fits = good.map(p => results.get(p.id)!.jobs[0].fit);
  const s = stats(fits);
  console.log(`  1순위 적합도  최저 ${f1(s.min)} · 10% ${f1(s.p10)} · 중앙 ${f1(s.p50)} · 90% ${f1(s.p90)} · 최고 ${f1(s.max)}`);
  console.log(`                평균 ${f1(s.mean)} · 표준편차 ${f1(s.sd)} · 폭 ${f1(s.max - s.min)}점`);
  const spread = good.map(p => {
    const j = results.get(p.id)!.jobs;
    return j[0].fit - j[j.length - 1].fit;
  });
  const sp = stats(spread);
  console.log(`  1위와 8위 차이 중앙 ${f1(sp.p50)}점 (10% ${f1(sp.p10)} · 90% ${f1(sp.p90)})`);

  console.log("\n═══ 3. 숨은 성향을 되찾는가 ═══");
  console.log("  원형마다 1순위로 가장 많이 나온 직무");
  for (const arch of ARCHETYPES) {
    const mine = good.filter(p => p.archetype === arch.name);
    if (!mine.length) continue;
    const cnt = new Map<string, number>();
    for (const p of mine) {
      const j = results.get(p.id)!.jobs[0].code;
      cnt.set(j, (cnt.get(j) ?? 0) + 1);
    }
    const top = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
    const line = top.slice(0, 3).map(([c, n]) => `${label.get(c) ?? c} ${pct(n / mine.length)}`).join(" · ");
    console.log(`  ${arch.name.padEnd(6)} (${String(mine.length).padStart(3)}명) ${line}`);
  }

  console.log("\n  원형이 심어 준 1순위 분야를 엔진이 1순위로 집어냈는가");
  let hit1 = 0, hit3 = 0, n = 0;
  for (const p of good) {
    const wanted = Object.entries(p.area).sort((a, b) => b[1] - a[1])[0][0];
    const got = results.get(p.id)!.areas;
    if (got[0].code === wanted) hit1++;
    if (got.slice(0, 3).some(a => a.code === wanted)) hit3++;
    n++;
  }
  console.log(`  1순위 일치 ${pct(hit1 / n)} · 3순위 안에 ${pct(hit3 / n)}  (무작위라면 각각 10% · 30%)`);

  console.log("\n═══ 4. 성향도 되찾는가 ═══");
  let tHit1 = 0, tHit2 = 0;
  for (const p of good) {
    const wanted = Object.entries(p.trait).sort((a, b) => b[1] - a[1])[0][0];
    const got = [...results.get(p.id)!.traits].sort((a, b) => b.scaled - a.scaled);
    if (got[0].code === wanted) tHit1++;
    if (got.slice(0, 2).some(t => t.code === wanted)) tHit2++;
  }
  console.log(`  가장 높은 성향 일치 ${pct(tHit1 / good.length)} · 2순위 안에 ${pct(tHit2 / good.length)}  (무작위 16.7% · 33.3%)`);

  console.log("\n═══ 5. 등수 대신 묶음 ═══");
  let overlap = 0;
  const tierCount: number[] = [];
  const topSize: number[] = [];
  for (const p of good) {
    const j = results.get(p.id)!.jobs;
    if (j[0].band[0] <= j[1].band[1]) overlap++;
    tierCount.push(Math.max(...j.map(x => x.tier)));
    topSize.push(j.filter(x => x.tier === 1).length);
  }
  console.log(`  1위와 2위 구간이 겹치는 사람 ${pct(overlap / good.length)}`);
  console.log(`  → 그래서 등수를 적지 않는다. 겹치는 직무는 한 묶음으로 묶는다`);
  const tc = stats(tierCount), ts = stats(topSize);
  console.log(`  묶음 개수   중앙 ${f1(tc.p50)} · 10% ${f1(tc.p10)} · 90% ${f1(tc.p90)} (1이면 아무것도 못 가른 것)`);
  console.log(`  1군 크기    중앙 ${f1(ts.p50)}개 · 10% ${f1(ts.p10)} · 90% ${f1(ts.p90)} (8이면 쓸모없다)`);
  const usable = tierCount.filter(t => t >= 2).length;
  console.log(`  묶음이 둘 이상으로 갈린 사람 ${pct(usable / good.length)}`);
  const sample = good[0];
  const sj = results.get(sample.id)!.jobs;
  console.log(`  예시 (${sample.archetype}):`);
  for (let t = 1; t <= Math.max(...sj.map(x => x.tier)); t++) {
    const g = sj.filter(x => x.tier === t);
    if (!g.length) continue;
    console.log(`    ${t}군  ${g.map(x => `${label.get(x.code) ?? x.code} ${f1(x.fit)}`).join(" · ")}`);
  }

  console.log("\n═══ 6. 불성실 응답을 잡아내는가 ═══");
  for (const mode of ["normal", "straight", "random", "careless"] as const) {
    const mine = people.filter(p => p.mode === mode);
    if (!mine.length) continue;
    const flags = { ok: 0, check: 0, invalid: 0 };
    for (const p of mine) flags[results.get(p.id)!.quality.flag]++;
    const caught = mode === "normal" ? flags.ok : flags.check + flags.invalid;
    const what = mode === "normal" ? "정상 판정" : "걸러냄";
    console.log(`  ${mode.padEnd(9)} ${String(mine.length).padStart(3)}명 → 정상 ${flags.ok} · 재확인 ${flags.check} · 무효 ${flags.invalid}   ${what} ${pct(caught / mine.length)}`);
  }

  console.log("\n═══ 7. 학과가 받는 단체 리포트 ═══");
  const sid = await queryOne<{ id: string }>(`SELECT id FROM test_sessions WHERE name LIKE 'SIM%' ORDER BY id DESC LIMIT 1`);
  await query(`UPDATE attempts SET status='scored' WHERE session_id=$1`, [sid!.id]);
  const co = (await buildCohort(sid!.id))!;
  console.log(`  채점 ${co.scored}명 · 감춘 칸 ${co.topJobs.filter(j => j.hidden).length}/${co.topJobs.length}`);
  console.log(`  1순위 분포 상위 3: ${co.topJobs.slice(0, 3).map(j => `${j.label} ${j.hidden ? "감춤" : j.n + "명"}`).join(" · ")}`);
  console.log(`  분야 평균 1위 ${co.areas[0].name} ${co.areas[0].mean} / 꼴찌 ${co.areas[co.areas.length - 1].name} ${co.areas[co.areas.length - 1].mean}`);
  console.log(`  신뢰도: 정상 ${co.quality.ok} · 재확인 ${co.quality.check} · 무효 ${co.quality.invalid}`);
  console.log(`  교육 수요 상위 3:`);
  for (const d of co.demand.slice(0, 3)) {
    console.log(`    ${d.name.padEnd(16)} 요구 ${d.required} · 충족 ${d.metPct}% · 대상 ${d.hidden ? "감춤" : d.shortfall + "명"}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
