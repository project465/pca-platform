/**
 * 현멘 개발용 시드. 갤러리를 눈으로 보려면 승인된 멘토와 열린 시간대가 있어야 한다.
 *
 *   npm run db:seed        (먼저 — 관리자·학생 계정)
 *   npm run db:seed:mentoring
 *
 * 여러 번 돌려도 같은 상태가 되게 짰다. 운영 데이터가 아니다.
 * 직무 영역 10개는 academix.co.kr 기준(CLAUDE.md)으로 넣는다. 매핑 데이터가
 * 아직 없는 상태에서도 갤러리 필터를 확인할 수 있어야 하기 때문이다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tx } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

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

const PW_MENTOR = "pca-dev-mentor-1234";

/**
 * CLAUDE.md 의 직무 영역 10개.
 * 멘토는 전원 석·박사다 (career peak 는 STEM 석·박사 대상).
 * 진로 경로가 골고루 들어가도록 섞어 뒀다 — 산업계 R&D·비R&D·출연연·학계·창업.
 */
const CLUSTERS: [string, string, string][] = [
  ["BIZ_STRAT", "경영·전략", "Management and Strategy"],
  ["HR_ORG", "인사·조직", "HR and Organization"],
  ["GA_SUPPORT", "총무·경영지원", "General Affairs"],
  ["FIN_ACCT", "재무·회계", "Finance and Accounting"],
  ["FIN_INVEST", "금융·투자", "Banking and Investment"],
  ["MKT_SALES", "마케팅·홍보·영업", "Marketing and Sales"],
  ["SCM", "물류·유통·구매", "Logistics and Procurement"],
  ["PROD_OPS", "생산·운영관리", "Production and Operations"],
  ["IT_DATA", "IT·데이터·서비스기획", "IT, Data and Product"],
  ["CONSULT", "컨설팅·리서치·조사분석", "Consulting and Research"],
];

type MentorSeed = {
  login: string;
  name: string;
  email: string;
  alias: string;
  years: number;
  degree: string;
  track: string;
  path: string;
  scale: string;
  region: string;
  headline: string;
  bio: string;
  minutes: number;
  jobs: string[];
  /** 지금부터 몇 시간 뒤에 시간대를 열어둘지 */
  slotHours: number[];
};

const MENTORS: MentorSeed[] = [
  {
    login: "mentor-semi",
    name: "정현직",
    email: "mentor-semi@example.com",
    alias: "반도체 공정 · 박사 졸업 8년차",
    years: 8,
    degree: "phd",
    track: "stem",
    path: "industry_rnd",
    scale: "large",
    region: "경기",
    headline: "박사 졸업 후 산업계 R&D로 갈 때 실제로 보는 것만 말합니다.",
    bio: "소자 공정 개발을 합니다.\n논문 실적을 산업계 이력서로 옮기는 작업을 주로 봅니다.",
    minutes: 30,
    jobs: ["PROD_OPS", "IT_DATA"],
    slotHours: [26, 30, 50],
  },
  {
    login: "mentor-rnd",
    name: "박현직",
    email: "mentor-rnd@example.com",
    alias: "출연연 선임연구원 11년차",
    years: 11,
    degree: "phd",
    track: "stem",
    path: "research_inst",
    scale: "research",
    region: "대전",
    headline: "포닥과 출연연, 산업계를 같은 표에 놓고 비교해 드립니다.",
    bio: "기계 분야 국가과제를 합니다. 대전 지역 기관 사정을 압니다.",
    minutes: 60,
    jobs: ["PROD_OPS", "CONSULT"],
    slotHours: [72, 76],
  },
  {
    login: "mentor-prof",
    name: "최현직",
    email: "mentor-prof@example.com",
    alias: "공대 조교수 3년차",
    years: 3,
    degree: "phd",
    track: "stem",
    path: "academia",
    scale: "public",
    region: "부산",
    headline: "임용 서류와 잡토크를 준비하는 순서를 알려드립니다.",
    bio: "국립대에서 연구실을 운영합니다. 임용 심사에 들어간 경험이 있습니다.",
    minutes: 45,
    jobs: ["CONSULT", "HR_ORG"],
    slotHours: [25, 49, 54],
  },
  {
    login: "mentor-data",
    name: "이현직",
    email: "mentor-data@example.com",
    alias: "ML 엔지니어 · 석사 졸업 4년차",
    years: 4,
    degree: "master",
    track: "stem",
    path: "industry_rnd",
    scale: "startup",
    region: "서울",
    headline: "석사로 끝낼지 박사로 갈지, 연구 주제 기준으로 봅니다.",
    bio: "추천 모델을 만듭니다. 석사 졸업 시점의 선택을 많이 상담했습니다.",
    minutes: 30,
    jobs: ["IT_DATA", "MKT_SALES"],
    slotHours: [27, 33],
  },
  {
    login: "mentor-biz",
    name: "김현직",
    email: "mentor-biz@example.com",
    alias: "기술전략 · 박사 졸업 6년차",
    years: 6,
    degree: "phd",
    track: "stem",
    path: "industry_biz",
    scale: "large",
    region: "서울",
    headline: "실험실을 떠나 기획·전략으로 옮긴 경로를 설명합니다.",
    bio: "기술기획에서 과제 포트폴리오를 봅니다. 비R&D 전환을 고민하는 분께 맞습니다.",
    minutes: 30,
    jobs: ["BIZ_STRAT", "CONSULT"],
    slotHours: [28, 52],
  },
  {
    login: "mentor-vc",
    name: "한현직",
    email: "mentor-vc@example.com",
    alias: "딥테크 창업 · 박사 5년차",
    years: 5,
    degree: "phd",
    track: "stem",
    path: "startup",
    scale: "startup",
    region: "대전",
    headline: "연구 결과를 사업으로 옮길 때 처음 막히는 지점을 짚습니다.",
    bio: "실험실 기술로 창업했습니다. 기술이전과 초기 투자 과정을 지나왔습니다.",
    minutes: 45,
    jobs: ["BIZ_STRAT", "FIN_INVEST"],
    slotHours: [31, 55],
  },
];

async function main() {
  await tx(async (c) => {
    // 직무 영역. 이미 있으면 그대로 쓴다.
    const major = await c.query<{ id: string }>(
      `INSERT INTO majors (code) VALUES ('ALL')
       ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
       RETURNING id`,
    );
    const majorId = major.rows[0].id;

    const jobId = new Map<string, string>();
    for (const [i, [code, ko, en]] of CLUSTERS.entries()) {
      const r = await c.query<{ id: string }>(
        `INSERT INTO job_clusters (major_id, code, sort_no) VALUES ($1, $2, $3)
         ON CONFLICT (major_id, code) DO UPDATE SET sort_no = EXCLUDED.sort_no
         RETURNING id`,
        [majorId, code, i + 1],
      );
      const id = r.rows[0].id;
      jobId.set(code, id);
      for (const [lang, value] of [["ko", ko], ["en", en]] as const) {
        await c.query(
          `INSERT INTO translations (table_name, row_id, lang, field, value)
           VALUES ('job_clusters', $1, $2, 'name', $3)
           ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value`,
          [id, lang, value],
        );
      }
    }

    const admin = await c.query<{ id: string }>(
      `SELECT id FROM users WHERE login_id = 'admin'`,
    );
    const approver = admin.rows[0]?.id ?? null;

    for (const m of MENTORS) {
      const hash = await hashPassword(PW_MENTOR);
      const u = await c.query<{ id: string }>(
        `INSERT INTO users (login_id, email, display_name, password_hash, must_reset_pw)
         VALUES ($1, $2, $3, $4, false)
         ON CONFLICT (login_id) DO UPDATE
           SET password_hash = EXCLUDED.password_hash,
               email = EXCLUDED.email,
               display_name = EXCLUDED.display_name
         RETURNING id`,
        [m.login, m.email, m.name, hash],
      );
      const userId = u.rows[0].id;

      // handle 은 시드에서 고정한다. 매번 바뀌면 링크를 다시 찾아야 한다.
      // login 의 하이픈 뒤만 쓴다 (mentor-rnd → M-RND).
      const handle = `M-${m.login.split("-")[1].toUpperCase()}`;
      const mentor = await c.query<{ id: string }>(
        `INSERT INTO mentors
           (user_id, handle, alias, years, company_scale, region, headline, bio,
            session_minutes, status, verify_note, approved_at, approved_by,
            degree, field_track, career_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, now(), $11, $12, $13, $14)
         ON CONFLICT (user_id) DO UPDATE
           SET handle = EXCLUDED.handle,
               alias = EXCLUDED.alias, years = EXCLUDED.years,
               degree = EXCLUDED.degree, field_track = EXCLUDED.field_track,
               career_path = EXCLUDED.career_path,
               company_scale = EXCLUDED.company_scale, region = EXCLUDED.region,
               headline = EXCLUDED.headline, bio = EXCLUDED.bio,
               session_minutes = EXCLUDED.session_minutes,
               status = 'active', verify_note = EXCLUDED.verify_note,
               approved_at = now()
         RETURNING id`,
        [
          userId,
          handle,
          m.alias,
          m.years,
          m.scale,
          m.region,
          m.headline,
          m.bio,
          m.minutes,
          "개발용 시드 데이터 — 실제 인증 아님",
          approver,
          m.degree,
          m.track,
          m.path,
        ],
      );
      const mentorId = mentor.rows[0].id;

      for (const code of m.jobs) {
        await c.query(
          `INSERT INTO mentor_job_clusters (mentor_id, job_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [mentorId, jobId.get(code)],
        );
      }

      for (const h of m.slotHours) {
        // 정시로 맞춰 둔다. 화면에서 읽기 쉽다.
        await c.query(
          `INSERT INTO mentor_slots (mentor_id, starts_at)
           VALUES ($1, date_trunc('hour', now() + ($2 || ' hours')::interval))
           ON CONFLICT (mentor_id, starts_at) DO NOTHING`,
          [mentorId, h],
        );
      }
    }
  });

  console.log(`
현멘 시드 완료.

  멘토 계정 (전부 석·박사, 비밀번호는 모두 ${PW_MENTOR})
${MENTORS.map((m) => `    ${m.login.padEnd(14)} ${m.alias}`).join("\n")}

  갤러리        http://localhost:3000/mentoring
  멘토 콘솔      http://localhost:3000/mentoring/mentor   (멘토 계정으로 로그인)
  승인 화면      http://localhost:3000/admin/mentors      (admin 계정으로 로그인)

줌 없이 승낙 흐름만 보려면 .env.local 에 ZOOM_DRY_RUN=1 을 넣으세요.
`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
