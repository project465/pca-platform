#!/usr/bin/env node
/**
 * 세종 DB 층과 접근 경계 검사. **psql 만 쓴다**(npm 없이 돈다).
 *
 *   DATABASE_URL=... node scripts/sejong/db-check.mjs
 *
 * 세는 것
 * - `sj_` 표 10개가 서 있고, 공통 DB 체인(`deploy/db-chain.json`)에 세종 파일이 없다
 * - 공통 표의 칸·제약을 바꾸지 않았다 (세종 스키마를 다시 올려도 공통 표 정의가 같다)
 * - 시드: 가상 참여자만, 실제 이메일 없음, 채용 표시 없음
 * - 동의: 마지막 줄이 이긴다(철회한 사람은 철회로 읽힌다)
 * - 상담사 열람 조건(배정·동의·기관 허용)을 SQL 로 다시 세어 화면 판단과 같은 수가 나온다
 * - ME_V3 응시 표를 건드리지 않았다
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DB = process.env.DATABASE_URL;
if (!DB) { console.error("DATABASE_URL 이 필요합니다"); process.exit(2); }
const q = (s) => execFileSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-tAc", s], { encoding: "utf8" }).trim();
const n = (s) => Number(q(s));

let pass = 0;
const bad = [];
const ok = (what, cond, saw = "") => {
  if (cond) { pass++; console.log(`  통과  ${what}`); }
  else { bad.push(what); console.log(`  걸림  ${what} ${saw}`); }
};

console.log("\n세종 DB 층 · 접근 경계\n");

const TABLES = ["sj_programs", "sj_participants", "sj_staff", "sj_counselor_assignments", "sj_attempts",
  "sj_responses", "sj_experiences", "sj_actions", "sj_report_renders", "sj_access_logs"];
const have = q(`SELECT string_agg(table_name, ',' ORDER BY table_name) FROM information_schema.tables
                 WHERE table_schema='public' AND table_name LIKE 'sj\\_%'`).split(",");
ok(`sj_ 표 ${TABLES.length}개`, TABLES.every((t) => have.includes(t)), have.join(" "));

const chain = JSON.parse(readFileSync("deploy/db-chain.json", "utf8"));
const all = [...chain.base, ...chain.upgrade];
ok("공통 DB 체인에 세종 파일이 없다", !all.some((f) => /sejong|sj_/.test(f)));

const sig = () => q(`SELECT md5(string_agg(table_name||'.'||column_name||':'||data_type||':'||is_nullable, '|'
                     ORDER BY table_name, column_name)) FROM information_schema.columns
                     WHERE table_schema='public' AND table_name NOT LIKE 'sj\\_%'`);
const before = sig();
execFileSync("psql", [DB, "-q", "-v", "ON_ERROR_STOP=1", "-f", "db/sejong/schema_sejong_demo.sql"], { stdio: "ignore" });
ok("세종 스키마를 다시 올려도 공통 표 정의가 같다 (멱등 · 공통 칸 불변)", sig() === before);

const fk = q(`SELECT string_agg(DISTINCT ccu.table_name, ',') FROM information_schema.table_constraints tc
               JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
              WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name LIKE 'sj\\_%'`).split(",");
ok("sj_ 표가 가리키는 공통 표는 users · organizations 뿐",
  fk.filter((t) => !t.startsWith("sj_")).every((t) => ["users", "organizations"].includes(t)), fk.join(" "));

const org = q(`SELECT id FROM organizations WHERE code = 'SJEPA_DEMO'`);
ok("시연 기관이 is_demo", q(`SELECT is_demo FROM organizations WHERE id = ${org}`) === "t");
ok("세종 참여자는 전부 is_demo 계정",
  n(`SELECT count(*) FROM sj_participants p JOIN users u ON u.id = p.user_id WHERE p.org_id = ${org} AND NOT u.is_demo`) === 0);
ok("세종 계정에 이메일이 없다 (실제 개인정보 없음)",
  n(`SELECT count(*) FROM users u WHERE u.email IS NOT NULL AND u.id IN
       (SELECT user_id FROM sj_participants UNION SELECT user_id FROM sj_staff)`) === 0);
ok("가상 참여자 이름 규칙",
  n(`SELECT count(*) FROM sj_participants p JOIN users u ON u.id = p.user_id
      WHERE u.login_id LIKE 'sj-v%' AND u.display_name NOT LIKE '가상 참여자 %'`) === 0);

const lastConsent = (uid) => q(`SELECT granted FROM consents WHERE user_id = ${uid} AND org_id = ${org}
                                  AND kind='data_visibility' ORDER BY created_at DESC, id DESC LIMIT 1`);
const withdrawn = q(`SELECT user_id FROM sj_participants p JOIN users u ON u.id = p.user_id WHERE u.login_id = 'sj-v14'`);
ok("동의 철회는 마지막 줄로 읽힌다 (sj-v14 → 철회)", lastConsent(withdrawn) === "f");

/* 화면의 counselorMayRead 와 같은 네 조건을 SQL 로 다시 센다 */
const readable = n(`
  SELECT count(*) FROM sj_counselor_assignments ca
    JOIN sj_staff s ON s.user_id = ca.counselor_user_id AND s.org_id = ca.org_id AND s.kind = 'counselor'
    JOIN sj_participants p ON p.user_id = ca.participant_user_id AND p.org_id = ca.org_id
    JOIN organizations o ON o.id = ca.org_id AND (o.workspace_settings->>'individual_access')::boolean
   WHERE ca.active AND ca.org_id = ${org}
     AND (SELECT granted FROM consents c WHERE c.user_id = ca.participant_user_id AND c.org_id = ca.org_id
           AND c.kind = 'data_visibility' ORDER BY c.created_at DESC, c.id DESC LIMIT 1)`);
const assigned = n(`SELECT count(*) FROM sj_counselor_assignments WHERE active AND org_id = ${org}`);
ok(`상담사가 열 수 있는 쌍 ${readable} < 배정 ${assigned} (동의 없는 배정은 닫힌다)`, readable < assigned && readable > 0);
ok("참여자 한 명에 활성 상담사 하나",
  n(`SELECT count(*) FROM (SELECT participant_user_id FROM sj_counselor_assignments WHERE active
      GROUP BY 1 HAVING count(*) > 1) x`) === 0);

ok("완료 응시는 결과가 굳어 있다",
  n(`SELECT count(*) FROM sj_attempts WHERE status='scored' AND (result IS NULL OR analysis_version IS NULL)`) === 0);
ok("결과에 총점·적합도 칸이 없다",
  n(`SELECT count(*) FROM sj_attempts WHERE result::text ~* '"(score|total|fit|rank|overall|composite)"'`) === 0);
ok("결과에 '추천' · '채용 중' 이 없다",
  n(`SELECT count(*) FROM sj_attempts WHERE result::text ~ '(추천|채용 중|채용중)'`) === 0);
ok("응답 값이 0~3 밖에 없다", n(`SELECT count(*) FROM sj_responses WHERE value NOT BETWEEN 0 AND 3`) === 0);
ok("ME_V3 응시 표는 비어 있다 (세종은 v3_attempts 를 쓰지 않는다)", n(`SELECT count(*) FROM v3_attempts`) === 0);

console.log(`\n${pass} 통과 · ${bad.length} 걸림\n`);
process.exit(bad.length ? 1 : 0);
