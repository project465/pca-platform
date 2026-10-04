/**
 * 결과지와 PDF 를 만든다.
 *
 * **엔진을 한 벌만 돌린다.** 점수·판정·문장은 `sites/pca-platform/assets`
 * 의 그 파일들이고, 플랫폼은 그것을 `/pca/v2.html` 로 내주고 머리 없는
 * 브라우저로 불러 쓴다. 서버에 TypeScript 로 옮겨 적으면 같은 응답에서
 * 웹과 PDF 가 다른 글을 낼 수 있고, 다르다는 것을 아무도 모른다.
 *
 * **응답을 화면에서 받지 않는다.** 응시 번호만 받고 응답은 `v2_responses`
 * 에서 다시 읽는다. 화면이 보낸 답으로 결과를 만들면 주소를 고쳐 남의
 * 결과지를 만들 수 있다.
 *
 * **만들어 둔 것은 고치지 않는다.** `report_snapshots` 는 줄이 쌓이기만
 * 하고, 각 줄이 그때의 결과 객체(`payload`)와 그때 본 경험을 품는다. 엔진을
 * 고쳐도 이미 나간 결과지는 그대로다(설계 원칙 4 와 같은 규칙이다).
 */
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { query, queryOne } from "@/lib/db";
import { answersOf, attemptOf, type V2Attempt } from "./attempt";
import { freezeForAttempt, frozenOf, type EvidencePayload } from "./evidence";
import { engineVersions } from "./versions";

/** PDF 를 두는 곳. 웹에서 직접 열리지 않고 로그인한 본인에게만 흘러나간다 */
export const PDF_DIR = process.env.REPORT_PDF_DIR
  ?? path.join(process.cwd(), "var", "reports");

export type Snapshot = {
  id: string;
  attempt_id: string;
  report_level: string;
  generated_at: string;
  pdf_path: string | null;
  trace_id: string | null;
  interface_language: string | null;
  payload: unknown;
};

/** 지금 보고 있는 결과지. 여러 판본이 쌓이면 **가장 최근 것**이다 */
export async function latestSnapshot(attemptId: string): Promise<Snapshot | null> {
  return queryOne<Snapshot>(
    `SELECT id::text, attempt_id::text, report_level,
            generated_at::text, pdf_path, trace_id, interface_language, payload
       FROM report_snapshots
      WHERE attempt_id = $1
      ORDER BY generated_at DESC LIMIT 1`,
    [attemptId],
  ).catch(() => null);
}

/** 무엇이 깨졌는지 아침에 보이게 적는다. **개인 서술은 담지 않는다** */
async function noteFailure(
  kind: string, attemptId: string | null, traceId: string, message: string,
): Promise<void> {
  await query(
    `INSERT INTO job_failures (kind, attempt_id, trace_id, message)
     VALUES ($1, $2, $3, $4)`,
    [kind, attemptId, traceId, message.slice(0, 400)],
  ).catch(() => undefined);
}

export type RenderResult =
  | { ok: true; snapshotId: string; traceId: string; pdfPath: string | null; sheets: number }
  | { ok: false; traceId: string; reason: string };

/* 머리말과 꼬리말을 우리가 그린다. **브라우저가 붙이는 주소와 날짜를 쓰지
   않는다**: 인쇄 대화상자의 설정이라 CSS 로 못 끄고, 그대로 두면 파는
   문서에 `localhost:3100` 이 찍힌다 */
const HEADER = `<div style="width:100%;font-size:7pt;color:#76859b;
  font-family:'Noto Sans CJK KR',sans-serif;padding:0 16mm;
  display:flex;justify-content:space-between;letter-spacing:.06em">
  <span>CAREERMATRI</span><span>진로 결정 자료</span></div>`;
const FOOTER = `<div style="width:100%;font-size:7pt;color:#76859b;
  font-family:'Noto Sans CJK KR',sans-serif;padding:0 16mm;
  display:flex;justify-content:space-between">
  <span>합격 가능성이나 실력을 잰 값이 아닙니다</span>
  <span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;

/**
 * 결과지 한 판본을 만든다.
 *
 * `baseUrl` 은 이 플랫폼 자신이다. 부르는 쪽(서버 액션)이 자기 주소를
 * 넘긴다. 머리 없는 브라우저가 `/pca/v2.html` 을 열어야 하는데, 그 주소는
 * 배포마다 달라서 코드에 적어 둘 수 없다.
 */
export async function generateReport(opts: {
  attemptId: string;
  userId: string;
  baseUrl: string;
  /** 결과지 글 언어. 응시가 들고 있던 값이 기본이다 */
  lang?: string;
}): Promise<RenderResult> {
  const traceId = randomUUID();
  const a = await attemptOf(opts.attemptId, opts.userId);
  if (!a) return { ok: false, traceId, reason: "응시를 찾을 수 없습니다." };
  if (!a.submitted_at) {
    return { ok: false, traceId, reason: "아직 제출되지 않은 응시입니다." };
  }

  /* 경험을 먼저 굳힌다. 그려 놓고 굳히면 그 사이에 한 줄 더 적힌 경험이
     결과지에는 없는데 사본에는 있는 상태가 된다 */
  const frozen = (await freezeForAttempt(opts.attemptId, opts.userId))
    ?? (await frozenOf(opts.attemptId));
  if (!frozen) {
    await noteFailure("result", opts.attemptId, traceId, "경험 사본을 만들지 못했습니다.");
    return { ok: false, traceId, reason: "경험 사본을 만들지 못했습니다." };
  }

  const answers = await answersOf(opts.attemptId);
  if (!Object.keys(answers).length) {
    await noteFailure("result", opts.attemptId, traceId, "저장된 응답이 없습니다.");
    return { ok: false, traceId, reason: "저장된 응답이 없습니다." };
  }

  try {
    const out = await drawInBrowser({
      attempt: a, answers, evidence: frozen.payload,
      baseUrl: opts.baseUrl,
    });

    await mkdir(PDF_DIR, { recursive: true });
    const file = path.join(PDF_DIR, `${opts.attemptId}-${Date.now()}.pdf`);
    await writeFile(file, out.pdf);

    const V = engineVersions();
    const row = await queryOne<{ id: string }>(
      `INSERT INTO report_snapshots
         (attempt_id, report_level, assessment_version, scoring_engine_version,
          evidence_engine_version, value_engine_version, coverage_engine_version,
          renderer_version, generated_at, payload, evidence_snapshot_id,
          pdf_path, trace_id, interface_language)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), $9::jsonb, $10, $11, $12, $13)
       RETURNING id::text`,
      [
        opts.attemptId, a.tier, V.assessment_version, V.scoring_engine_version,
        V.evidence_engine_version, V.value_engine_version, V.coverage_engine_version,
        V.renderer_version,
        JSON.stringify({
          result: out.result,
          summary: out.summary,
          /* 그때 본 경험을 결과지 안에 함께 담는다. 사본 표는 응시마다
             한 줄이라 다시 만들면 바뀌지만, 이미 나간 결과지는 자기
             안에 들고 있어 흔들리지 않는다 */
          evidence: frozen.payload,
          evidence_profile_version: frozen.profileVersion,
          /* 뜻 없는 입력은 본문에서 비우고 여기에 안쪽 경고로만 남는다 */
          input_warnings: out.warnings,
          sheets: out.sheets,
        }),
        frozen.snapshotId, file, traceId, a.interface_language ?? opts.lang ?? "ko",
      ],
    );
    if (!row) {
      await noteFailure("result", opts.attemptId, traceId, "결과를 저장하지 못했습니다.");
      return { ok: false, traceId, reason: "결과를 저장하지 못했습니다." };
    }

    await query(
      `UPDATE attempts SET status = 'scored', scored_at = now()
        WHERE id = $1 AND status <> 'scored'`,
      [opts.attemptId],
    ).catch(() => undefined);

    return { ok: true, snapshotId: row.id, traceId, pdfPath: file, sheets: out.sheets };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "결과를 만들지 못했습니다.";
    await noteFailure("result", opts.attemptId, traceId, msg);
    return { ok: false, traceId, reason: msg };
  }
}

/* ── 머리 없는 브라우저 ───────────────────────────────────────────── */

type Drawn = {
  html: string;
  result: unknown;
  summary: unknown;
  warnings: unknown;
  pdf: Buffer;
  sheets: number;
};

/**
 * 같은 엔진을 불러 그리고, 그린 그대로 찍는다.
 *
 * `localStorage` 에 넣는 것은 **엔진이 읽는 자리**다. 서버가 그 모양을 다시
 * 정하지 않고 정적 결과지가 쓰던 키를 그대로 쓴다. 브라우저 저장소가 진실인
 * 것이 아니라, 이 한 번의 그리기에 값을 건네는 통로일 뿐이다: 창은 그리고
 * 나면 닫힌다.
 */
async function drawInBrowser(opts: {
  attempt: V2Attempt;
  answers: Record<string, unknown>;
  evidence: EvidencePayload;
  baseUrl: string;
}): Promise<Drawn> {
  const { chromium } = await import("playwright");
  /* **운영 이미지에 브라우저를 두 벌 넣지 않는다.** 알파인에는 패키지로
     깔린 크로미움이 있고, 플레이라이트가 받아 오는 것은 거기서 돌지
     않는다. 경로가 주어지면 깔린 것을 쓰고, 없으면 개발 기계의 것을 쓴다 */
  const bin = process.env.CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(bin ? { executablePath: bin } : {}),
  });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 1000 } });
    const page = await ctx.newPage();
    const url = `${opts.baseUrl.replace(/\/$/, "")}/pca/v2.html`;

    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(e.message));

    await page.goto(url, { waitUntil: "domcontentloaded" });

    /* 응답과 경험을 엔진이 읽는 자리에 넣는다. 등급과 학위 단계는 응시가
       들고 있던 값이다: 여기서 고르면 주소로 등급을 올리는 길이 생긴다 */
    await page.evaluate((s) => {
      try { localStorage.clear(); } catch { /* 꺼져 있을 수 있다 */ }
      const EV = (window as unknown as { PCAEvidence?: {
        emptyEvidence(): Record<string, unknown>;
        saveEvidence(v: Record<string, unknown>): void;
        saveResearch(v: unknown[]): void;
        loadTarget(): Record<string, unknown>;
        saveTarget(v: Record<string, unknown>): void;
      } }).PCAEvidence;
      if (EV) {
        EV.saveEvidence(Object.assign(EV.emptyEvidence(), s.evidence));
        EV.saveResearch(s.research);
        EV.saveTarget(Object.assign(EV.loadTarget(), s.target));
      }
      localStorage.setItem("pca_v2_session_v1", JSON.stringify({
        tier: s.tier, stage: s.stage, sec: 0, answers: s.answers,
        profile: { name: "" }, startedAt: null, savedAt: Date.now(),
      }));
    }, {
      tier: opts.attempt.tier,
      stage: opts.attempt.education_stage,
      answers: opts.answers,
      evidence: opts.evidence.evidence ?? {},
      research: opts.evidence.research ?? [],
      target: opts.evidence.target ?? {},
    });

    /* 다시 열어야 엔진이 넣어 둔 응답을 읽고 선다 */
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      const app = (window as unknown as { PCAV2App?: { showResult(): void } }).PCAV2App;
      if (!app) throw new Error("결과지 엔진을 불러오지 못했습니다.");
      app.showResult();
    });
    await page.waitForSelector(".rpage", { timeout: 20000 });

    const got = await page.evaluate(() => {
      const w = window as unknown as {
        PCA_V2_RESULT_JSON?: unknown;
        PCA_V2_DECISION_SUMMARY?: unknown;
        PCA_V2_INPUT_WARNINGS?: unknown;
      };
      return {
        result: w.PCA_V2_RESULT_JSON ?? null,
        summary: w.PCA_V2_DECISION_SUMMARY ?? null,
        warnings: w.PCA_V2_INPUT_WARNINGS ?? null,
        html: document.getElementById("v2ResultBody")?.innerHTML ?? "",
        pages: document.querySelectorAll(".rpage").length,
      };
    });
    if (!got.result) throw new Error("결과 객체가 비어 있습니다.");
    if (!got.pages) throw new Error("결과지 쪽이 그려지지 않았습니다.");

    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({
      format: "A4", printBackground: true,
      displayHeaderFooter: true, headerTemplate: HEADER, footerTemplate: FOOTER,
      margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
    });
    await ctx.close();

    /* 찍힌 장수는 PDF 안에 적혀 있다. 바깥 도구를 부르지 않는 것은
       운영 컨테이너에 그 도구가 없을 수 있어서다 */
    const sheets = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;

    if (errs.length) {
      /* 그려졌는데 스크립트 오류가 있었으면 남겨만 둔다. 그려진 것을
         버리면 산 사람이 아무것도 못 받는다 */
      await noteFailure("result", opts.attempt.id, "draw",
        `그리는 중 오류: ${errs.slice(0, 3).join(" | ")}`);
    }
    return { html: got.html, result: got.result, summary: got.summary,
      warnings: got.warnings, pdf, sheets };
  } finally {
    await browser.close();
  }
}
