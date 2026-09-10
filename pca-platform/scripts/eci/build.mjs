// data/eci/*.json 하나를 원본으로 삼아 세 가지를 만든다.
//   1. db/seed/eci/skill_tree.sql        — 시드 SQL
//   2. docs/eci/generated/skill_tree.md  — 문서용 표
//   3. prototypes/eci/data.js            — 프리뷰 사이트가 읽는 데이터
// 스킬 트리를 고칠 때는 JSON만 고치고 `npm run eci:build` 를 돌린다.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))

const common = read('data/eci/common.json')
const majors = ['ME', 'EE', 'CE'].map((c) => read(`data/eci/major_${c}.json`))

const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const CRIT = { 3: '필수', 2: '중요', 1: '보조' }
const LAYER = { L1: '기초과학', L2: '전공 핵심', L3: '도구·소프트웨어', L4: '응용 도메인', L5: '공통 역량' }

// ---------------------------------------------------------------- 1. 시드 SQL
const sql = []
const out = (s) => sql.push(s)
const nameRow = (table, code, lang, field, value) =>
  out(
    `INSERT INTO translations (table_name, row_id, lang, field, value)\n` +
      `  SELECT ${q(table)}, id, ${q(lang)}, ${q(field)}, ${q(value)} FROM ${table} WHERE code = ${q(code)}\n` +
      `  ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value;`
  )

out(`-- 자동 생성 파일. 고치지 말 것. 원본은 data/eci/*.json, 생성은 scripts/eci/build.mjs`)
out(`-- 적용 순서: db/schema.sql → db/schema_eci.sql → 이 파일`)
out(`BEGIN;`)

out(`\n-- 지표 축`)
for (const i of common.indicators) {
  out(`INSERT INTO indicator_axes (code, kind) VALUES (${q(i.code)}, 'activity') ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind;`)
  nameRow('indicator_axes', i.code, 'ko', 'name', i.ko)
  nameRow('indicator_axes', i.code, 'ko', 'description', i.desc)
  nameRow('indicator_axes', i.code, 'en', 'name', i.en)
}
for (const t of common.traits) {
  out(`INSERT INTO indicator_axes (code, kind) VALUES (${q(t.code)}, 'trait') ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind;`)
  nameRow('indicator_axes', t.code, 'ko', 'name', t.ko)
  nameRow('indicator_axes', t.code, 'en', 'name', t.en)
}

out(`\n-- 트랙`)
for (const [n, t] of common.tracks.entries()) {
  out(`INSERT INTO tracks (code, stage, instrument_key, sort_no) VALUES (${q(t.code)}, ${q(t.stage)}, ${q(t.instrument)}, ${n + 1}) ON CONFLICT (code) DO UPDATE SET stage = EXCLUDED.stage, instrument_key = EXCLUDED.instrument_key, sort_no = EXCLUDED.sort_no;`)
  nameRow('tracks', t.code, 'ko', 'name', t.ko)
}

out(`\n-- 진로 목표 (고교 결과지 분기)`)
for (const [n, g] of common.goals.entries()) {
  out(`INSERT INTO learner_goals (code, sort_no) VALUES (${q(g.code)}, ${n + 1}) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;`)
  nameRow('learner_goals', g.code, 'ko', 'name', g.ko)
}

out(`\n-- 산업`)
for (const [n, ind] of common.industries.entries()) {
  out(`INSERT INTO industries (code, sort_no) VALUES (${q(ind.code)}, ${n + 1}) ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no;`)
  nameRow('industries', ind.code, 'ko', 'name', ind.ko)
}

out(`\n-- 증거 출처`)
for (const s of common.evidenceWeights.sources) {
  out(
    `INSERT INTO evidence_sources (code, max_point, reliability, needs_proof) VALUES (${q(s.code)}, ${s.maxPoint}, ${s.reliability}, ${s.needsProof})\n` +
      `  ON CONFLICT (code) DO UPDATE SET max_point = EXCLUDED.max_point, reliability = EXCLUDED.reliability, needs_proof = EXCLUDED.needs_proof;`
  )
  nameRow('evidence_sources', s.code, 'ko', 'name', s.ko)
}

out(`\n-- 트랙별 채점 프로파일`)
for (const p of common.scoringProfiles) {
  out(
    `INSERT INTO scoring_profiles (track_code, goal_code, w_aptitude, w_skill, w_preference, w_coursework, display_mode, top_n)\n` +
      `  VALUES (${q(p.track)}, ${q(p.goal)}, ${p.wA}, ${p.wS}, ${p.wP}, ${p.wC}, ${q(p.display)}, ${p.topN})\n` +
      `  ON CONFLICT (track_code, goal_code) DO UPDATE SET w_aptitude = EXCLUDED.w_aptitude, w_skill = EXCLUDED.w_skill,\n` +
      `    w_preference = EXCLUDED.w_preference, w_coursework = EXCLUDED.w_coursework,\n` +
      `    display_mode = EXCLUDED.display_mode, top_n = EXCLUDED.top_n;`
  )
}

out(`\n-- 전공`)
const fitMajors = common.majorFit.map((m) => m.code)
const allMajorCodes = [...new Set([...fitMajors, ...majors.map((m) => m.code)])]
for (const code of allMajorCodes) {
  const ko = common.majorFit.find((m) => m.code === code)?.ko ?? majors.find((m) => m.code === code)?.ko
  out(`INSERT INTO majors (code) VALUES (${q(code)}) ON CONFLICT (code) DO NOTHING;`)
  nameRow('majors', code, 'ko', 'name', ko)
}

out(`\n-- 고교 전공적합 가중치`)
for (const m of common.majorFit) {
  for (const [axis, w] of Object.entries(m.weights)) {
    out(
      `INSERT INTO major_fit_weights (major_id, axis_code, weight)\n` +
        `  SELECT id, ${q(axis)}, ${w} FROM majors WHERE code = ${q(m.code)}\n` +
        `  ON CONFLICT (major_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;`
    )
  }
}

for (const major of majors) {
  out(`\n-- ======== ${major.code} ${major.ko} ========`)
  for (const c of major.competencies) {
    const scoped = c.layer === 'L5' ? 'NULL' : `(SELECT id FROM majors WHERE code = ${q(major.code)})`
    out(
      `INSERT INTO competencies (code, comp_type, layer, major_id) VALUES (${q(c.code)}, ${q(c.type)}, ${q(c.layer)}, ${scoped})\n` +
        `  ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type, layer = EXCLUDED.layer;`
    )
    nameRow('competencies', c.code, 'ko', 'name', c.ko)
    nameRow('competencies', c.code, 'en', 'name', c.en)
    for (const a of [c.ko, c.en, ...(c.aliases ?? [])]) {
      const lang = /[가-힣]/.test(a) ? 'ko' : 'en'
      out(
        `INSERT INTO competency_aliases (competency_id, lang, alias)\n` +
          `  SELECT id, ${q(lang)}, lower(${q(a)}) FROM competencies WHERE code = ${q(c.code)}\n` +
          `  ON CONFLICT (lang, alias) DO NOTHING;`
      )
    }
  }
  for (const [n, j] of major.jobs.entries()) {
    out(
      `INSERT INTO job_clusters (major_id, code, onet_code, sort_no)\n` +
        `  SELECT id, ${q(j.code)}, ${q(j.onet)}, ${n + 1} FROM majors WHERE code = ${q(major.code)}\n` +
        `  ON CONFLICT (major_id, code) DO UPDATE SET onet_code = EXCLUDED.onet_code, sort_no = EXCLUDED.sort_no;`
    )
    nameRow('job_clusters', j.code, 'ko', 'name', j.ko)
    nameRow('job_clusters', j.code, 'en', 'name', j.en)
    for (const ind of j.industries) {
      out(
        `INSERT INTO job_industry_map (job_id, industry_id)\n` +
          `  SELECT j.id, i.id FROM job_clusters j, industries i WHERE j.code = ${q(j.code)} AND i.code = ${q(ind)}\n` +
          `  ON CONFLICT DO NOTHING;`
      )
    }
    for (const tr of j.tracks) {
      out(
        `INSERT INTO job_cluster_tracks (job_id, track_code)\n` +
          `  SELECT id, ${q(tr)} FROM job_clusters WHERE code = ${q(j.code)} ON CONFLICT DO NOTHING;`
      )
    }
    for (const [axis, w] of Object.entries(j.weights)) {
      out(
        `INSERT INTO job_axis_weights (job_id, axis_code, weight)\n` +
          `  SELECT id, ${q(axis)}, ${w} FROM job_clusters WHERE code = ${q(j.code)}\n` +
          `  ON CONFLICT (job_id, axis_code) DO UPDATE SET weight = EXCLUDED.weight;`
      )
    }
    for (const [cc, level, crit] of j.requires) {
      out(
        `INSERT INTO job_competency_map (job_id, competency_id, required_level, criticality)\n` +
          `  SELECT j.id, c.id, ${level}, ${crit} FROM job_clusters j, competencies c WHERE j.code = ${q(j.code)} AND c.code = ${q(cc)}\n` +
          `  ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level, criticality = EXCLUDED.criticality;`
      )
    }
  }
}
out(`\nCOMMIT;`)

mkdirSync(join(root, 'db/seed/eci'), { recursive: true })
writeFileSync(join(root, 'db/seed/eci/skill_tree.sql'), sql.join('\n') + '\n')

// ---------------------------------------------------------------- 2. 문서용 표
const md = []
md.push('# 3개 전공 Skill Tree (자동 생성)')
md.push('')
md.push('> 이 파일은 `scripts/eci/build.mjs` 가 만든다. 고칠 곳은 `data/eci/*.json` 이다.')
md.push('')
md.push(`전공 ${majors.length}개 · 역량 ${majors.reduce((a, m) => a + m.competencies.length, 0)}개 · 직무군 ${majors.reduce((a, m) => a + m.jobs.length, 0)}개`)
md.push('')
md.push('필수도 표기 — ★★★ 필수 / ★★ 중요 / ★ 보조. 요구 수준은 1~5.')

for (const major of majors) {
  md.push('')
  md.push(`## ${major.ko} (${major.code})`)
  md.push('')
  md.push('### 계층별 역량')
  for (const layer of ['L1', 'L2', 'L3', 'L4', 'L5']) {
    const list = major.competencies.filter((c) => c.layer === layer)
    if (!list.length) continue
    md.push('')
    md.push(`**${layer} · ${LAYER[layer]}** (${list.length})`)
    md.push('')
    md.push('| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |')
    md.push('|---|---|---|---|')
    for (const c of list) md.push(`| \`${c.code}\` | ${c.ko} | ${c.type} | ${(c.aliases ?? []).join(', ') || '—'} |`)
  }
  md.push('')
  md.push('### 직무군과 요구 역량')
  for (const j of major.jobs) {
    md.push('')
    md.push(`#### ${j.ko} — \`${j.code}\``)
    md.push('')
    md.push(`O*NET \`${j.onet}\` · 산업 ${j.industries.join(', ')} · 트랙 ${j.tracks.join(', ')}`)
    md.push('')
    md.push(`활동 지표 가중치 — ${Object.entries(j.weights).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
    md.push('')
    md.push('| 역량 | 요구 수준 | 필수도 |')
    md.push('|---|---|---|')
    for (const [cc, level, crit] of j.requires) {
      const c = major.competencies.find((x) => x.code === cc)
      md.push(`| ${c ? c.ko : cc} \`${cc}\` | ${level} | ${'★'.repeat(crit)} |`)
    }
  }
}
mkdirSync(join(root, 'docs/eci/generated'), { recursive: true })
writeFileSync(join(root, 'docs/eci/generated/skill_tree.md'), md.join('\n') + '\n')

// ---------------------------------------------------------------- 3. 프리뷰 데이터
const bundle = { ...common, majors }
mkdirSync(join(root, 'prototypes/eci'), { recursive: true })
writeFileSync(
  join(root, 'prototypes/eci/data.js'),
  `// 자동 생성 파일. 원본은 data/eci/*.json\nwindow.ECI_DATA = ${JSON.stringify(bundle)};\n`
)

// 아티팩트로 게시할 자립형 파일 — data.js 를 인라인으로 박는다
try {
  const page = readFileSync(join(root, 'prototypes/eci/index.html'), 'utf8')
  const inlined = page.replace(
    '<script src="data.js"></script>',
    `<script>window.ECI_DATA = ${JSON.stringify(bundle)};</script>`
  )
  writeFileSync(join(root, 'prototypes/eci/standalone.html'), inlined)
  console.log('  prototypes/eci/standalone.html')
} catch (e) {
  console.log('  (standalone 생략 — index.html 없음)')
}

const counts = majors.map((m) => `${m.code} 역량 ${m.competencies.length} · 직무 ${m.jobs.length}`).join(' / ')
console.log(`생성 완료 — ${counts}`)
console.log(`  db/seed/eci/skill_tree.sql (${sql.length} 문)`)
console.log(`  docs/eci/generated/skill_tree.md`)
console.log(`  prototypes/eci/data.js`)
