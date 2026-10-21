/**
 * 지원서·면접 준비가 지킬 것을 센다. **로컬 DB 에서만 돈다.**
 *
 *   npx tsx scripts/prep-check.ts        (SHOW=1 이면 한 벌을 찍는다)
 *
 * 굳은 결과를 전공마다 하나씩 꺼내 물음을 만들고, 재료가 **그 사람의 결과와
 * 경험에만** 있는지와 손님 화면에 안쪽 코드가 새지 않는지 본다. 저장은
 * 시험용 계정 하나로 넣고 지운다.
 */
import { query, queryOne } from "../src/lib/db";
import type { ResultModel } from "../src/lib/me-v3/result/model";
import { coreOf } from "../src/lib/me-v3/result/model";
import { buildPrep, prepAnswersOf, savePrepAnswer } from "../src/lib/me-v3/prep";

const URL_ = process.env.DATABASE_URL ?? "";
if (!/127\.0\.0\.1|localhost|^postgres(ql)?:\/\/\//.test(URL_)) {
  console.error("로컬 DB 가 아니다"); process.exit(2);
}

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, note = "") => {
  if (cond) pass += 1; else fail += 1;
  console.log(`  ${cond ? "통과" : "걸림"}  ${name}${note ? ` — ${note}` : ""}`);
};

const CODE = /\b(TD\d{2}|J[1-8]|SPEC_[A-Z_]+|ROLE_[A-Z_]+|INDUSTRY_[A-Z_]+|TR_T\d+|Z[1-4]_[A-Z_]+|[A-Z]+_CORE_V\d)\b/;

async function main() {
  const rows = await query<{ m: ResultModel }>(
    `SELECT DISTINCT ON (a.core_code) s.result_model AS m
       FROM v3_snapshots s JOIN v3_attempts a ON a.id = s.attempt_id
      WHERE s.result_model IS NOT NULL AND a.status = 'scored'
      ORDER BY a.core_code, (jsonb_array_length(s.result_model->'evidence'->'ready')) DESC,
               s.created_at DESC`);
  ok("전공마다 굳은 결과가 하나 이상 있다", rows.length > 0, `${rows.length}개 전공`);

  let leaks: string[] = [], invented: string[] = [], dup = 0, shortFrame = 0, total = 0;
  for (const { m } of rows) {
    const core = coreOf(m);
    const p = buildPrep(m, core, null, []);
    total += p.essays.length + p.interviews.length;
    /* 결과 안의 모든 글. 재료는 이 안에 있어야 한다 */
    const pool = JSON.stringify(m);
    for (const e of p.essays) {
      if (e.frame.length !== 4) shortFrame += 1;
      for (const mat of e.materials) for (const it of mat.items) {
        /* 영역 이름과 직무 이름은 사전에서 오므로 결과 글에 없을 수 있다.
           **고른 항목**(직접 정한 것 · 해 본 일 · 남긴 것 · 고친 것)만 센다 */
        if (!mat.label.startsWith("이미") && /정한 것|해 본 일|남긴 것|고친 것|비교해|옮긴 것|쓰인 곳/.test(mat.label)
            && !pool.includes(JSON.stringify(it).slice(1, -1))) {
          invented.push(`${core}:${it}`);
        }
      }
      const text = [e.title, e.ask, e.empty ?? "", ...e.materials.flatMap((x) => [x.label, ...x.items]),
        ...e.frame.flatMap((f) => [f.label, f.hint, ...f.items])].join(" ");
      if (CODE.test(text)) leaks.push(`${core}:${text.match(CODE)![0]}`);
    }
    const qs = new Set<string>();
    for (const q of p.interviews) {
      if (qs.has(q.q)) dup += 1;
      qs.add(q.q);
      const text = [q.q, q.why, ...q.prepare].join(" ");
      if (CODE.test(text)) leaks.push(`${core}:${text.match(CODE)![0]}`);
    }
    if (process.env.SHOW && core === (process.env.SHOW === "1" ? core : process.env.SHOW)) {
      console.log(`\n── ${core}`);
      for (const e of p.essays) {
        console.log(`  [${e.title}] ${e.ask}`);
        for (const mat of e.materials) console.log(`     · ${mat.label}: ${mat.items.join(" / ")}`);
        if (e.empty) console.log(`     (비어 있음) ${e.empty}`);
      }
      for (const q of p.interviews) console.log(`  Q ${q.q}\n     왜: ${q.why}\n     떠올릴 것: ${q.prepare.join(" / ")}`);
      process.env.SHOW = "done";
    }
  }
  ok("지원서 문항마다 적는 차례가 넷이다", shortFrame === 0, `${shortFrame}`);
  ok("손님 글에 안쪽 코드가 없다", leaks.length === 0, leaks.slice(0, 4).join(" "));
  ok("고른 항목은 그 사람의 결과에만 있다(지어내지 않는다)", invented.length === 0, invented.slice(0, 3).join(" "));
  ok("한 결과 안에서 같은 면접 질문이 두 번 서지 않는다", dup === 0, `${dup}`);
  ok("물음이 만들어진다", total > 0, `${total}개`);

  /* 저장 · 덮어쓰기 · 비우면 지움 */
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash, status, locale, is_demo)
     VALUES ('zz-prep-check','zz-prep-check@example.test','점검','x','active','ko',TRUE)
     ON CONFLICT (login_id) DO UPDATE SET status='active' RETURNING id::text`);
  const uid = u!.id;
  const core = rows[0] ? coreOf(rows[0].m) : "ME_CORE_V3";
  await query(`DELETE FROM v3_prep_answers WHERE user_id = $1`, [uid]);
  await savePrepAnswer(uid, { core, kind: "essay", key: "essay:job", prompt: "물음", answer: "첫 답" });
  await savePrepAnswer(uid, { core, kind: "essay", key: "essay:job", prompt: "물음", answer: "고친 답" });
  let a = await prepAnswersOf(uid, core);
  ok("같은 물음을 고쳐 쓰면 한 줄이 덮인다", a.length === 1 && a[0].answer_text === "고친 답" && a[0].saves === 2);
  ok("다른 전공의 답은 섞이지 않는다", (await prepAnswersOf(uid, "ZZ_NONE")).length === 0);
  await savePrepAnswer(uid, { core, kind: "essay", key: "essay:job", prompt: "물음", answer: "   " });
  a = await prepAnswersOf(uid, core);
  ok("비워서 저장하면 지운다", a.length === 0);
  await query(`DELETE FROM v3_prep_answers WHERE user_id = $1`, [uid]);
  await query(`DELETE FROM users WHERE id = $1`, [uid]).catch(() => undefined);

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
