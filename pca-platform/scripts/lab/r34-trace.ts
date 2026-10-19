/**
 * R34-1: **응답 → 고른 근거 → 판정 → 결과 모델 → 화면 글자**를 ID 단위로 뜬다.
 *
 * Staging 의 학생(응답 109 · 고른 근거 8)과 같은 모양을 이 DB 에 세운다:
 * 끝낸 응시 하나(`FROM`)의 응답 109개를 **같은 문항 번호와 같은 값**으로
 * 새 응시에 적고, 고른 근거 여덟을 실제 체크리스트에서 더한 뒤 제품의
 * `submit()` 으로 굳힌다. 그 다음 굳은 줄에서 무엇이 어디로 갔는지를
 * 표로 적는다. **판정을 여기서 다시 하지 않는다**: 적는 값은 전부
 * `v3_snapshots.result_model` 과 그것을 읽는 문장 함수가 돌려준 것이다.
 *
 *   FROM=174 OUT=var/r34/trace npx tsx scripts/lab/r34-trace.ts
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { mkdirSync, writeFileSync } from "node:fs";
import { query } from "../../src/lib/db";
import { makeStudent, registerCampusStudent } from "../_loop-fixture";
import { allLeaves, university } from "../../src/lib/campus/registry";
import {
  attemptOf, checklistFor, choosePack, domainName, moveTo, openAttempt, saveAnswer,
  savePicks, submit, viewOf, type CampusEntry, type V3Attempt,
} from "../../src/lib/me-v3/runtime/session";
import type { Answer } from "../../src/lib/me-v3/scoring/types";
import { coreOf, type ResultModel } from "../../src/lib/me-v3/result/model";
import {
  actionKo, commonKo, evidenceStoryKo, gapKo, headlineBadgeKo, headlineKo,
} from "../../src/lib/me-v3/result/text.ko";
import { latestResult } from "../../src/lib/me-v3/platform";

const FROM = process.env.FROM ?? "174";
const OUT = process.env.OUT ?? "var/r34/trace";
const LOGIN = process.env.LOGIN ?? "r34-trace@test.invalid";

type Row = { item_id: string; kind: string; value_int: number | null; value_text: string | null };

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const src = await query<{ core_code: string; tier: string; education_stage: string;
    grad_field: string | null; department_code: string; industry_pack: string | null;
    role_pack: string | null }>(
    `SELECT core_code, tier, education_stage, grad_field, department_code, industry_pack, role_pack
       FROM v3_attempts WHERE id = $1`, [FROM]);
  const s = src[0];
  if (!s) throw new Error(`응시 ${FROM} 이 없다`);
  const rows = await query<Row>(
    `SELECT item_id, kind, value_int, value_text FROM v3_responses
      WHERE attempt_id = $1 ORDER BY answered_at, item_id`, [FROM]);

  const u = university("PCU")!;
  const found = allLeaves(u).find((r) => r.leaf.code === s.department_code)!;
  const campus: CampusEntry = {
    university_code: "PCU", college_code: found.college.code,
    department_code: found.leaf.code, core_code: s.core_code,
    specialization: found.leaf.specialization ?? null,
  };
  const st = await makeStudent(LOGIN);
  await registerCampusStudent(st.id, "PCU", s.department_code);
  await query(
    `INSERT INTO entitlements (user_id, product_code, kind, tier, major_code, assessment_version, status)
     VALUES ($1,'ME_V3_PRO_KR','report','PRO','ME','ME_V3_2','active')`, [st.id]);
  const a0 = await openAttempt({
    userId: st.id, tier: "PRO", stage: s.education_stage as never,
    gradField: (s.grad_field ?? null) as never, campus,
  });
  if (a0.core_code !== s.core_code) throw new Error(`Core 가 ${a0.core_code}`);

  /* 1) 응답 109개를 같은 번호·같은 값으로 */
  for (const r of rows) {
    const ans: Answer | null =
      r.kind === "level" ? { kind: "level", index: r.value_int ?? 0 }
      : r.kind === "scale5" ? { kind: "scale5", value: r.value_int ?? 0 }
      : r.kind === "exposure" ? { kind: "exposure", value: r.value_int ?? 0 }
      : r.kind === "choice" ? { kind: "choice", value: r.value_text ?? "" }
      : null;
    if (ans) await saveAnswer(a0.id, r.item_id, ans);
  }

  /* 2) 화면을 차례로 지나며 체크리스트 자리에서 근거 여덟을 고른다.
        **지어내지 않는다**: 그 영역의 체크리스트와 산출물 목록에서 앞의 것을 집는다 */
  const PICKS: Record<string, Record<string, number>> = {
    TD02: { J3: 2, ARTIFACT: 1, VERIFY: 1 },
    TD08: { J3: 1, J4: 1, ARTIFACT: 1, VERIFY: 1 },
  };
  let a = (await attemptOf(a0.id, st.id)) as V3Attempt;
  const picked: { domain: string; slot: string; item_text: string }[] = [];
  let want: string | null = null, guard = 0;
  for (;;) {
    if ((guard += 1) > 400) throw new Error("화면이 끝나지 않는다");
    const v = await viewOf(a, want);
    if (v.screen.kind === "checklist" && v.screen.domain && PICKS[v.screen.domain]) {
      for (const g of checklistFor(s.core_code, v.screen.domain)) {
        const n = PICKS[v.screen.domain][g.slot] ?? 0;
        if (!n) continue;
        const items = g.items.slice(0, n);
        await savePicks(a.id, v.screen.domain, g.slot, items);
        for (const t of items) picked.push({ domain: v.screen.domain, slot: g.slot, item_text: t });
      }
    }
    if (v.screen.kind === "pick-industry" && s.industry_pack) await choosePack(s.core_code, a.id, "industry", s.industry_pack);
    if (v.screen.kind === "pick-role" && s.role_pack) await choosePack(s.core_code, a.id, "role", s.role_pack);
    if (!v.nextId) { await moveTo(a.id, v.screen.id); break; }
    await moveTo(a.id, v.nextId);
    want = v.nextId;
    a = (await attemptOf(a.id, st.id)) as V3Attempt;
  }
  const done = (await attemptOf(a.id, st.id)) as V3Attempt;
  const { id: snapId } = await submit(done);

  /* 3) DB 에 실제로 적힌 수 */
  const cnt = await query<{ ans: string; picks: string; snaps: string }>(
    `SELECT (SELECT count(*) FROM v3_responses WHERE attempt_id=$1)::text ans,
            (SELECT count(*) FROM v3_evidence_picks WHERE attempt_id=$1)::text picks,
            (SELECT count(*) FROM v3_snapshots WHERE attempt_id=$1)::text snaps`, [a.id]);
  const dbPicks = await query<{ domain_code: string; slot: string; item_text: string }>(
    `SELECT domain_code, slot, item_text FROM v3_evidence_picks WHERE attempt_id=$1 ORDER BY 1,2,3`, [a.id]);

  /* 4) 굳은 결과 모델에서 읽는다 */
  const m = (await latestResult(st.id)) as ResultModel;
  const core = coreOf(m);
  const name = (td: string) => domainName(core, td);
  const head = headlineKo(m, name);
  const cm = commonKo(m.common, core);
  const focus = m.overview.focus;
  const d0 = m.domains.find((d) => d.code === focus[0])!;
  const story = evidenceStoryKo(core, d0.code, {
    did: d0.did[0] ?? null, decided: d0.decided[0] ?? null,
    decisions: d0.decided, artifacts: d0.artifacts, verifications: d0.verifications,
  }, "lead", name(d0.code));

  const trace = {
    from_attempt: FROM, attempt: a.id, login: LOGIN, user_id: st.id, snapshot_id: snapId,
    db: { responses: Number(cnt[0].ans), picks: Number(cnt[0].picks), snapshots: Number(cnt[0].snaps) },
    responses_by_kind: Object.fromEntries(
      Object.entries(rows.reduce<Record<string, number>>((o, r) => ((o[r.kind] = (o[r.kind] ?? 0) + 1), o), {}))),
    picks_written: picked, picks_in_db: dbPicks,
    overview: { headline: m.overview.headline, focus, badge: headlineBadgeKo(m), head },
    domains: m.domains.map((d) => ({
      code: d.code, name: name(d.code), zone: d.zone,
      axes: d.axes, did: d.did, decided: d.decided, artifacts: d.artifacts,
      verifications: d.verifications,
    })),
    evidence: { ready: m.evidence.ready, partial: m.evidence.partial },
    common: { raw: m.common, ko: cm },
    gaps: m.gaps.map((g) => ({ ...g, ko: gapKo(g, name(g.domain)) })),
    actions: m.actions.map((x) => ({ ...x, ko: actionKo(x, x.domain ? name(x.domain) : "", m.stage).do })),
    story,
    versions: await query(`SELECT module_versions FROM v3_snapshots WHERE id=$1`, [snapId]),
  };
  writeFileSync(`${OUT}/trace.json`, JSON.stringify(trace, null, 2));
  console.log(`attempt=${a.id} login=${LOGIN} responses=${cnt[0].ans} picks=${cnt[0].picks} snaps=${cnt[0].snaps}`);
  console.log(`headline=${m.overview.headline} focus=${focus.map(name).join(" / ")}`);
  console.log(`badge=${headlineBadgeKo(m)} | ${head.title} | ${head.lead}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
