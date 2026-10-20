#!/usr/bin/env node
/**
 * 세종 시연 자료를 SQL 로 뽑는다. **개발·시연용 DB 에만 넣는다.**
 *
 *   node --experimental-strip-types scripts/sejong/seed-demo.mjs > /tmp/sj-seed.sql
 *   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f /tmp/sj-seed.sql
 *
 * 무엇을 넣는가
 * - 시연 기관 `SJEPA_DEMO` (이름 끝에 `(시연)`) · 가상 사업 둘
 * - 관리자 1 · 상담사 2 · 직접 눌러 볼 구직자 1
 * - **가상 참여자 20명.** 응답은 정해진 씨앗으로 만든 가짜이고, 결과는 화면과
 *   같은 분석 함수(`src/sejong/lib/analysis.ts`)로 계산한다. 이름이 전부
 *   `가상 참여자 NN` 이다. PDF 생성 기록은 넣지 않는다: 그 칸은 실제로 뽑은
 *   것만 센다
 *
 * 비밀번호 해시는 PostgreSQL `pgcrypto` 의 bcrypt 로 만든다(`$2a$`, bcryptjs 가
 * 읽는다). 비밀번호는 시연용이고 운영에 쓰지 않는다.
 */
import { readFileSync } from "node:fs";
import { analyze } from "../../src/sejong/lib/analysis.ts";

const url = process.env.DATABASE_URL ?? "";
if (/prod|production|railway/i.test(url)) {
  console.error("운영이나 원격처럼 보이는 주소입니다. 로컬 시연 DB 에만 넣으십시오.");
  process.exit(1);
}

const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const instrument = read("src/sejong/content/instrument.sj-jobseeker-demo-0.json");
const axisInfo = read("sites/pca-platform/content/me-v3-2-taxonomy.json").axes;
const items = instrument.sections.flatMap((s) => s.items);

const q = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const j = (v) => `${q(JSON.stringify(v))}::jsonb`;
const arr = (a) => `ARRAY[${a.map(q).join(",")}]::text[]`;

/* 정해진 씨앗. 돌릴 때마다 같은 가짜가 나와야 화면 캡처가 비교된다 */
let seed = 20261020;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];

const PW = {
  admin: "sejong-admin-demo-2026",
  counsel: "sejong-counsel-demo-2026",
  seeker: "sejong-seeker-demo-2026",
  virtual: "sejong-virtual-demo-2026",
};

const out = [];
const sql = (s) => out.push(s.trim() + ";");

sql(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
sql(`INSERT INTO organizations (code, country, org_type, name, language, workspace_settings, aggregate_min_cell, is_demo)
     VALUES ('SJEPA_DEMO', 'KR', 'agency', '세종일자리경제진흥원 (시연)', 'ko',
             '{"individual_access": true, "tenant": "sejong", "demo": true}'::jsonb, 5, true)
     ON CONFLICT (code) DO NOTHING`);
const ORG = `(SELECT id FROM organizations WHERE code = 'SJEPA_DEMO')`;

sql(`INSERT INTO sj_programs (code, org_id, name, region_rule, is_demo) VALUES
     ('SJ-DEMO-A', ${ORG}, '시연 사업 A · 구직 역량 진단 (가상)', 'NONE', true),
     ('SJ-DEMO-B', ${ORG}, '시연 사업 B · 세종 지역 취업 연계 (가상, 세종 한정)', 'SEJONG_ONLY', true)
     ON CONFLICT (code) DO NOTHING`);

function user(login, name, pw, { reset = false } = {}) {
  sql(`INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo, pw_login)
       VALUES (${q(login)}, crypt(${q(pw)}, gen_salt('bf', 12)), ${q(name)}, ${reset}, true, true)
       ON CONFLICT DO NOTHING`);
  return `(SELECT id FROM users WHERE login_id = ${q(login)})`;
}
function member(uid, role) {
  sql(`INSERT INTO memberships (user_id, org_id, role) VALUES (${uid}, ${ORG}, ${q(role)})
       ON CONFLICT (user_id, org_id, role) DO NOTHING`);
}

const admin = user("sj-admin", "시연 관리자", PW.admin);
member(admin, "org_admin");
sql(`INSERT INTO sj_staff (user_id, org_id, kind) VALUES (${admin}, ${ORG}, 'admin') ON CONFLICT DO NOTHING`);

const counselors = [
  user("sj-counsel1", "시연 상담사 1", PW.counsel),
  user("sj-counsel2", "시연 상담사 2", PW.counsel),
];
for (const c of counselors) {
  member(c, "instructor");
  sql(`INSERT INTO sj_staff (user_id, org_id, kind) VALUES (${c}, ${ORG}, 'counselor') ON CONFLICT DO NOTHING`);
}

/* 직접 눌러 볼 구직자. 응시가 비어 있다 */
const seeker = user("sj-demo01", "시연 구직자", PW.seeker);
member(seeker, "student");
sql(`INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
     VALUES (${seeker}, ${ORG}, 'SJ-DEMO-A', 'SJ-A-000') ON CONFLICT DO NOTHING`);
sql(`INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
     VALUES (${ORG}, ${counselors[0]}, ${seeker}) ON CONFLICT DO NOTHING`);

/* 세종 산업 구성에 맞춰 공공·제조·바이오·사무 쪽에 무게를 둔다(가상 분포) */
const AREAS = ["JA01", "JA01", "JA02", "JA03", "JA03", "JA04", "JA05", "JA06", "JA06", "JA07", "JA08", "JA08", "JA09", "JA10", "JA11"];
const AUD = instrument.audiences.options.map((o) => o.code);
const RANGE = ["HOME_ONLY", "ADJACENT", "ADJACENT", "ANYWHERE", "UNDECIDED"];
const KINDS = ["work", "parttime", "intern", "project", "training", "credential", "volunteer"];
const CHECKS = instrument.experience_checks.map((c) => c.code);
const EXP_TITLES = ["물류센터 출고 검수", "카페 매장 운영", "공공기관 행정 인턴", "직업훈련 데이터 분석 과정",
  "제조 현장 생산 보조", "지역 축제 운영 봉사", "사무 보조 계약직", "품질 검사 아르바이트"];

/* 상태 분포: 발급만 4 · 로그인만 2 · 진행 중 4 · 완료 10 */
const plan = [
  ...Array(4).fill("issued"), ...Array(2).fill("login"), ...Array(4).fill("progress"), ...Array(10).fill("scored"),
];
plan.forEach((state, i) => {
  const n = String(i + 1).padStart(2, "0");
  const prog = i < 14 ? "SJ-DEMO-A" : "SJ-DEMO-B";
  const no = `${prog === "SJ-DEMO-A" ? "SJ-A" : "SJ-B"}-${String(i + 1).padStart(3, "0")}`;
  const uid = user(`sj-v${n}`, `가상 참여자 ${n}`, PW.virtual);
  member(uid, "student");
  sql(`INSERT INTO sj_participants (user_id, org_id, program_code, participant_no)
       VALUES (${uid}, ${ORG}, ${q(prog)}, ${q(no)}) ON CONFLICT DO NOTHING`);
  sql(`INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id)
       VALUES (${ORG}, ${counselors[i % 2]}, ${uid}) ON CONFLICT DO NOTHING`);
  if (state === "issued") return;
  sql(`UPDATE users SET last_login_at = now() - interval '${i % 7} days' - interval '1 hour' WHERE id = ${uid}`);
  /* 동의는 절반 남짓. 철회한 사람도 하나 둔다 */
  if (i % 3 !== 0) {
    sql(`INSERT INTO consents (user_id, kind, version, granted, org_id)
         VALUES (${uid}, 'data_visibility', 'SJ-DEMO-COUNSELOR-1', true, ${ORG})`);
  }
  if (i === 13) {
    sql(`INSERT INTO consents (user_id, kind, version, granted, org_id, created_at)
         VALUES (${uid}, 'data_visibility', 'SJ-DEMO-COUNSELOR-1', false, ${ORG}, now() + interval '1 second')`);
  }
  if (state === "login") return;

  const areas = [...new Set([pick(AREAS), pick(AREAS)])];
  const profile = { audience: pick(AUD), job_areas: areas, region_range: pick(RANGE), skills: [] };
  const base = Math.floor(rnd() * 3);
  const responses = {};
  for (const it of items) {
    if (state === "progress" && rnd() < 0.5) continue;
    responses[it.code] = Math.max(0, Math.min(3, base + Math.floor(rnd() * 3) - 1));
  }
  const exps = [];
  const nExp = state === "scored" ? 1 + Math.floor(rnd() * 3) : 0;
  for (let k = 0; k < nExp; k++) {
    const checks = CHECKS.filter(() => rnd() < 0.5);
    exps.push({ id: `${i}-${k}`, kind: pick(KINDS), title: pick(EXP_TITLES), checks, skills: [], job_area: pick(areas) });
  }
  for (const e of exps) {
    sql(`INSERT INTO sj_experiences (user_id, kind, title, job_area, checks, skills)
         VALUES (${uid}, ${q(e.kind)}, ${q(e.title)}, ${q(e.job_area)}, ${arr(e.checks)}, ${arr([])})`);
  }
  const started = `now() - interval '${(i % 7) + 1} days'`;
  if (state === "progress") {
    sql(`INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, started_at)
         VALUES (${uid}, ${ORG}, ${q(prog)}, ${q(instrument.instrument_version)}, ${j(profile)}, ${started})`);
  } else {
    const result = analyze({ instrument, axisInfo, responses, experiences: exps, profile, now: new Date("2026-10-20T00:00:00Z") });
    sql(`INSERT INTO sj_attempts (user_id, org_id, program_code, instrument_version, profile, status, result,
                                  analysis_version, started_at, scored_at)
         VALUES (${uid}, ${ORG}, ${q(prog)}, ${q(instrument.instrument_version)}, ${j(profile)}, 'scored',
                 ${j(result)}, ${q(result.analysis_version)}, ${started}, ${started} + interval '25 minutes')`);
  }
  const att = `(SELECT id FROM sj_attempts WHERE user_id = ${uid} ORDER BY started_at DESC LIMIT 1)`;
  for (const [code, v] of Object.entries(responses)) {
    sql(`INSERT INTO sj_responses (attempt_id, item_code, value) VALUES (${att}, ${q(code)}, ${v})
         ON CONFLICT DO NOTHING`);
  }
});

console.log(`-- 세종 시연 자료 (scripts/sejong/seed-demo.mjs). 개발·시연 DB 전용\n${out.join("\n")}`);
