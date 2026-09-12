/**
 * 채점 가중치 평정표를 만든다. 직무 하나에 파일 한 장이다.
 *
 *   npm run sheet:weights -- 1              (검사 도구 id)
 *   npm run sheet:weights -- 1 out/평정표    (폴더를 지정할 때)
 *
 * 왜 직무마다 파일을 나누는가.
 * 지표 10개 × 직무 10개면 100칸이고, 한 사람에게 100칸을 매기게 하면 뒤로 갈수록
 * 아무 숫자나 찍는다. 현직자는 자기 직무 하나만 안다. 그래서 자기 열 10칸만 받는다.
 *
 * 평정자는 현멘 멘토 풀에서 고르면 된다. 이미 현직 인증을 거쳤고 직무 태그가 붙어 있다.
 * 직무당 5~7명이 채운 파일을 모아 scripts/import-weights.ts 로 넣는다.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { query, queryOne } from "../src/lib/db";
import { namesOf, nameOf } from "../src/lib/i18n";
import { writeXlsx, type Row } from "../src/lib/xlsx-write";

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

/** 척도. 값을 바꾸면 import-weights.ts 의 상한도 같이 바꿔야 한다 */
const SCALE = ["0", "1", "2", "3", "4"];
const SCALE_HELP = [
  "0  이 직무와 관계없다",
  "1  있으면 조금 도움이 된다",
  "2  보통 필요하다",
  "3  중요하다",
  "4  이것 없이는 이 일을 못 한다",
];

/** 파일 이름에 쓸 수 없는 글자를 뺀다 */
function safe(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").trim() || "job";
}

async function main() {
  const instrumentId = process.argv[2];
  const outDir = resolve(process.cwd(), process.argv[3] ?? "out/weight-sheets");
  if (!instrumentId || !/^\d+$/.test(instrumentId)) {
    console.error("검사 도구 id 가 필요합니다.  예) npm run sheet:weights -- 1");
    process.exit(1);
  }

  const inst = await queryOne<{ id: string; major_id: string; version: string }>(
    `SELECT id, major_id, version FROM instruments WHERE id = $1`,
    [instrumentId],
  );
  if (!inst) {
    console.error(`검사 도구 ${instrumentId} 을(를) 찾지 못했습니다.`);
    process.exit(1);
  }

  const [indicatorRows, jobRows, majorName] = await Promise.all([
    query<{ id: string; code: string }>(
      `SELECT id, code FROM indicators WHERE instrument_id = $1 ORDER BY id`,
      [instrumentId],
    ),
    query<{ id: string; code: string }>(
      `SELECT id, code FROM job_clusters WHERE major_id = $1 ORDER BY sort_no, code`,
      [inst.major_id],
    ),
    nameOf("majors", inst.major_id, "ko"),
  ]);

  if (indicatorRows.length === 0) {
    console.error("이 검사 도구에 지표가 없습니다. 문항을 먼저 넣으세요.");
    process.exit(1);
  }
  if (jobRows.length === 0) {
    console.error("이 전공에 직무 영역이 없습니다.");
    process.exit(1);
  }

  const [indicatorNames, jobNames] = await Promise.all([
    namesOf("indicators", indicatorRows.map((r) => r.id), "ko"),
    namesOf("job_clusters", jobRows.map((r) => r.id), "ko"),
  ]);

  mkdirSync(outDir, { recursive: true });

  for (const job of jobRows) {
    const jobName = jobNames.get(job.id) ?? job.code;
    const rows: Row[] = [];

    rows.push({ cells: ["PCA 채점 가중치 평정"], style: "bold" });
    rows.push({ cells: [] });
    rows.push({ cells: ["직무 영역", jobName, job.code], style: ["plain", "bold", "plain"] });
    rows.push({
      cells: ["검사 도구", `${majorName ?? ""} ${inst.version}`.trim(), `instrument:${inst.id}`],
    });
    rows.push({ cells: ["평정자 이름", "", ""], style: ["plain", "input", "plain"] });
    rows.push({ cells: ["소속 · 현직 연차", "", ""], style: ["plain", "input", "plain"] });
    rows.push({ cells: [] });

    const headerRow = rows.length + 1; // 1-based
    rows.push({
      cells: ["지표 코드", "지표", "중요도 (0~4)", "메모 (선택)"],
      style: "bold",
    });

    for (const ind of indicatorRows) {
      rows.push({
        cells: [ind.code, indicatorNames.get(ind.id) ?? ind.code, "", ""],
        style: ["plain", "plain", "input", "wrap"],
      });
    }

    const firstDataRow = headerRow + 1;
    const lastDataRow = headerRow + indicatorRows.length;

    rows.push({ cells: [] });
    rows.push({ cells: ["척도"], style: "bold" });
    for (const line of SCALE_HELP) rows.push({ cells: ["", line] });
    rows.push({ cells: [] });
    rows.push({ cells: ["읽는 법"], style: "bold" });
    rows.push({
      cells: [
        "",
        `"${jobName} 직무를 실제로 수행할 때, 이 능력이 얼마나 필요한가"를 묻습니다.`,
      ],
    });
    rows.push({
      cells: ["", "지금 그 일을 하고 계신 분의 판단을 그대로 적어주세요. 정답은 없습니다."],
    });
    rows.push({
      cells: ["", "4를 두세 개보다 많이 주면 변별이 되지 않습니다. 핵심만 4로 남겨주세요."],
    });
    rows.push({
      cells: ["", "판단하기 어려운 칸은 비워두셔도 됩니다. 억지로 채운 숫자가 더 나쁩니다."],
    });

    const buf = writeXlsx({
      name: jobName.slice(0, 31),
      widths: [14, 26, 14, 46],
      freezeRows: headerRow,
      rows,
      validations: [
        {
          ref: `C${firstDataRow}:C${lastDataRow}`,
          allow: SCALE,
          title: "중요도",
          prompt: "0 관계없음 · 1 조금 · 2 보통 · 3 중요 · 4 필수",
        },
      ],
    });

    const file = join(outDir, `가중치평정_${safe(jobName)}.xlsx`);
    writeFileSync(file, buf);
    console.log(`  ${file}`);
  }

  console.log("");
  console.log(`직무 ${jobRows.length}개 × 지표 ${indicatorRows.length}개`);
  console.log("직무당 5~7명에게 각자 자기 직무 파일 하나씩 보내세요.");
  console.log("돌아온 파일은 npm run import:weights -- <검사도구id> <파일들> 로 넣습니다.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
