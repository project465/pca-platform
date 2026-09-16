/**
 * 개발용 시드. 화면을 눈으로 확인하려면 계정과 기관이 최소한 하나씩은 있어야 한다.
 * 운영 데이터가 아니며, 여러 번 돌려도 같은 상태가 되도록 짰다.
 *
 *   npm run db:seed
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tx } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

// tsx 는 .env.local 을 자동으로 읽지 않는다. 필요한 값만 직접 채운다.
function loadEnv(file: string) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* 파일이 없으면 환경변수가 이미 있다고 본다 */
  }
}
loadEnv(".env.local");

/* 운영에서는 절대 돌지 않게 막는다.
   이 파일은 아무나 아는 비밀번호로 운영사 관리자 계정을 만든다. 운영
   데이터베이스에 한 번이라도 돌면 그 순간 아무나 들어올 수 있다.
   실수로 부르는 것을 막을 곳이 여기밖에 없다 */
if (process.env.NODE_ENV === "production" || process.env.ALLOW_SEED === "never") {
  console.error("시드는 운영에서 돌리지 않습니다. 여기서 만드는 계정은 비밀번호가 공개되어 있습니다.");
  process.exit(2);
}


const PW_ADMIN = "pca-dev-admin-1234";
const PW_ORG = "pca-dev-org-1234";
const PW_STUDENT = "TempPass2026";

/** 개발용 계약 규모와 전용 링크 토큰. 고정해 둬야 다시 돌려도 링크가 살아 있다 */
const SEED_SEATS = 30;
const SEED_LINK_TOKEN = "dev-seed-link-token-0000000000ab";

async function main() {
await tx(async (c) => {
  const org = async (
    code: string,
    country: string,
    type: string,
    parent: string | null,
    ko: string,
    en: string,
  ) => {
    const r = await c.query<{ id: string }>(
      `INSERT INTO organizations (code, country, org_type, parent_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET country = EXCLUDED.country
       RETURNING id`,
      [code, country, type, parent],
    );
    const id = r.rows[0].id;
    for (const [lang, value] of [["ko", ko], ["en", en]] as const) {
      await c.query(
        `INSERT INTO translations (table_name, row_id, lang, field, value)
         VALUES ('organizations', $1, $2, 'name', $3)
         ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value`,
        [id, lang, value],
      );
    }
    return id;
  };

  const user = async (
    loginId: string | null,
    email: string | null,
    name: string,
    plain: string,
    mustReset: boolean,
  ) => {
    const hash = await hashPassword(plain);
    const r = await c.query<{ id: string }>(
      `INSERT INTO users (login_id, email, display_name, password_hash, must_reset_pw)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (login_id) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             display_name  = EXCLUDED.display_name,
             must_reset_pw = EXCLUDED.must_reset_pw
       RETURNING id`,
      [loginId, email, name, hash, mustReset],
    );
    return r.rows[0].id;
  };

  const member = (userId: string, orgId: string, role: string) =>
    c.query(
      `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, org_id, role) DO NOTHING`,
      [userId, orgId, role],
    );

  const vendor = await org("PCA", "KR", "company", null, "단체 PCA 운영사", "PCA Platform");
  const univ = await org("HYU", "KR", "university", null, "한양대학교", "Hanyang University");
  const dept = await org("HYU-ME", "KR", "department", univ, "한양대학교 기계공학과", "Dept. of Mechanical Engineering, Hanyang Univ.");
  const univ2 = await org("KNU", "KR", "university", null, "경북대학교", "Kyungpook National University");
  await org("KNU-ME", "KR", "department", univ2, "경북대학교 기계공학부", "School of Mechanical Engineering, KNU");

  const admin = await user("admin", "admin@pca.local", "박운영", PW_ADMIN, false);
  await member(admin, vendor, "superadmin");

  const orgAdmin = await user("me-admin", "me-admin@hyu.ac.kr", "김담당", PW_ORG, false);
  await member(orgAdmin, dept, "org_admin");

  const student = await user("2021001234", null, "이학생", PW_STUDENT, true);
  await member(student, dept, "student");

  /* 계약·응시권·전용 링크.
     이게 없으면 담당자 화면(/org)이 응시권 0 에 링크도 없는 빈 화면이라
     무엇을 하는 화면인지 알 수 없다. 여러 번 돌려도 같은 상태가 되도록
     이미 있으면 넘어간다. */
  const contract = await c.query<{ id: string }>(
    `INSERT INTO contracts (org_id, title, starts_on, ends_on, seat_count)
     SELECT $1, $2, current_date, current_date + 365, $3
      WHERE NOT EXISTS (SELECT 1 FROM contracts WHERE org_id = $1 AND title = $2)
     RETURNING id`,
    [dept, "2026 기계공학과 PCA", SEED_SEATS],
  );
  if (contract.rowCount) {
    const contractId = contract.rows[0].id;
    await c.query(
      `INSERT INTO seats (contract_id, expires_at)
       SELECT $1, current_date + 366 FROM generate_series(1, $2)`,
      [contractId, SEED_SEATS],
    );
    // 토큰을 고정해 둔다. 시드를 다시 돌려도 개발 중 열어 둔 링크가 그대로다
    await c.query(
      `INSERT INTO org_links (org_id, token, label, max_uses, expires_at, created_by)
       VALUES ($1, $2, $3, $4, current_date + 366, $5)
       ON CONFLICT (token) DO NOTHING`,
      [dept, SEED_LINK_TOKEN, "2026-1학기 3학년", SEED_SEATS, orgAdmin],
    );

    /* 회차. 적재된 검사지가 있으면 하나 열어 둔다 — 없으면 학생 화면이
       "응시할 검사가 없습니다" 로만 남아 무엇을 하는 화면인지 알 수 없다.
       문항 적재는 별도다: npx tsx scripts/load-instrument.ts docs/instrument-example.json */
    const inst = await c.query<{ id: string }>(
      `SELECT i.id FROM instruments i
        WHERE (SELECT count(*) FROM questions q WHERE q.instrument_id = i.id) > 0
        ORDER BY i.id LIMIT 1`,
    );
    if (inst.rowCount) {
      await c.query(
        `UPDATE instruments SET status = 'published', published_at = now()
          WHERE id = $1 AND status = 'draft'`,
        [inst.rows[0].id],
      );
      await c.query(
        `INSERT INTO test_sessions (org_id, contract_id, instrument_id, name, opens_at, closes_at)
         VALUES ($1, $2, $3, $4, now() - interval '1 day', now() + interval '90 days')`,
        [dept, contractId, inst.rows[0].id, "2026-1학기 기계공학과 3학년"],
      );
    }
  }
});

  console.log(`
시드 완료. 개발용 계정입니다.

  운영사 관리자   admin        / ${PW_ADMIN}
  학과 담당자     me-admin     / ${PW_ORG}
  학생(첫 로그인) 2021001234   / ${PW_STUDENT}   ← 로그인하면 비밀번호 변경 화면으로 갑니다

  기계공학과에 응시권 ${SEED_SEATS}장과 전용 링크가 하나 있습니다.
  /join/${SEED_LINK_TOKEN}
`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
