/**
 * ME_V2 와 ME_V1 을 **읽기 전용으로 잠근다.**
 *
 * 설계 원칙 4 는 문항을 고치지 않고 판본을 올리라고 말한다. 그런데 그
 * 원칙을 문서에만 적어 두면, 다음 사람이 ME_V3 를 만들다 "여기 한 글자만"
 * 하고 ME_V2 문항을 고친다. 그러면 **이미 응시한 사람의 결과가 달라진다.**
 *
 * 그래서 지문을 적어 두고 매번 대조한다. 잠그는 것은 두 벌이다.
 *
 *   ME_V2_DECISION_2026  assessment/ME_V2/*.json 여덟 벌
 *   PCA_ME_V1            data/metri/items_pca_me_v1.json 과 전공 Skill Tree 셋
 *
 * **생성물은 잠그지 않는다.** `data/me-v2.js` 는 `v2:build` 가 만드는
 * 파일이라 원본이 그대로면 같은 값이 다시 나온다. 거기를 잠그면 빌드를
 * 돌릴 때마다 걸린다.
 *
 *   npm run v2:frozen            대조만 한다
 *   npm run v2:frozen -- --기록  지문을 다시 적는다 (판본을 새로 잠글 때만)
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";

const MANIFEST = "assessment-frozen.json";

type Frozen = {
  note: string;
  versions: Record<string, { note: string; files: Record<string, string> }>;
};

function sha(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/** 잠그는 자리. 늘릴 때는 여기만 고친다 */
function targets(): Record<string, { note: string; paths: string[] }> {
  const v2dir = "sites/pca-platform/assessment/ME_V2";
  const v2 = existsSync(v2dir)
    ? readdirSync(v2dir).filter((f) => f.endsWith(".json")).sort()
        .map((f) => `${v2dir}/${f}`)
    : [];
  return {
    ME_V2_DECISION_2026: {
      note: "92문항 · 보존 판본. 새 응시는 ME_V3 로 간다",
      paths: v2,
    },
    PCA_ME_V1: {
      note: "253문항 · 학과 계약 판본. 신규 진입은 막고 읽기와 재현만 남긴다",
      paths: [
        "data/metri/items_pca_me_v1.json",
        "data/metri/major_ME.json",
        "data/metri/major_EE.json",
        "data/metri/major_CE.json",
      ].filter((p) => existsSync(p)),
    },
  };
}

function record(): void {
  const t = targets();
  const out: Frozen = {
    note:
      "잠근 판본의 지문이다. 값이 바뀌면 이미 응시한 사람의 결과가 달라진다. " +
      "고칠 곳은 ME_V3 이고, 여기를 다시 적는 것은 새 판본을 잠글 때뿐이다.",
    versions: {},
  };
  for (const [key, v] of Object.entries(t)) {
    const files: Record<string, string> = {};
    for (const p of v.paths) files[p] = sha(p);
    out.versions[key] = { note: v.note, files };
  }
  writeFileSync(MANIFEST, JSON.stringify(out, null, 2) + "\n");
  const n = Object.values(out.versions).reduce(
    (a, v) => a + Object.keys(v.files).length, 0);
  console.log(`  적었다 ${MANIFEST} — 판본 ${Object.keys(out.versions).length}벌 · 파일 ${n}개`);
}

function verify(): number {
  if (!existsSync(MANIFEST)) {
    console.log(`  없음 ${MANIFEST} — \`npm run v2:frozen -- --기록\` 으로 먼저 적으십시오`);
    return 1;
  }
  const want: Frozen = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const have = targets();
  let bad = 0;
  let seen = 0;

  for (const [key, v] of Object.entries(want.versions)) {
    console.log(`\n  ${key} — ${v.note}`);
    const now = new Set(have[key]?.paths ?? []);
    for (const [path, hash] of Object.entries(v.files)) {
      seen += 1;
      if (!existsSync(path)) {
        bad += 1;
        console.log(`    사라짐 ${path}`);
        continue;
      }
      const got = sha(path);
      if (got === hash) {
        console.log(`    그대로 ${path}`);
      } else {
        bad += 1;
        console.log(`    바뀜   ${path}`);
        console.log(`           적힌 것 ${hash.slice(0, 16)} · 지금 ${got.slice(0, 16)}`);
      }
      now.delete(path);
    }
    for (const extra of now) {
      bad += 1;
      console.log(`    새 파일 ${extra} — 보존 판본에 파일을 더하지 않습니다`);
    }
  }

  console.log(`\n잠근 파일 ${seen}개 — 어긋난 자리 ${bad}곳`);
  if (bad) {
    console.log(
      "\n보존 판본입니다. 이미 응시한 분의 결과가 달라지므로 되돌리십시오.\n" +
      "고칠 곳은 ME_V3 입니다. 판본을 새로 잠그는 경우에만 `-- --기록` 을 씁니다.",
    );
  }
  return bad ? 1 : 0;
}

const wantRecord = process.argv.includes("--기록") || process.argv.includes("--record");
if (wantRecord) {
  record();
  process.exit(0);
}
process.exit(verify());
