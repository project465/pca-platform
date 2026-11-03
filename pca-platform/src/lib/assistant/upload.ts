import { createHash } from "node:crypto";
import * as z from "zod/v4";
import { query, queryOne } from "@/lib/db";
import { activeCoreOrPick, EXPERIENCE_KINDS } from "@/lib/me-v3/platform";
import { askStructured, aiReady, UPLOAD_MODEL, type AiBlock } from "./claude";
import { clamp, menu, Out, type DraftValue } from "./draft";
import { settingsOf } from "./settings";

/**
 * 올린 파일(성적증명서 · 수료증 · 상장 · 활동 확인서)을 경험 추가의 보기로
 * 옮긴다. 메모를 옮기는 `draftExperience` 와 같은 일을 파일로 한다.
 *
 * **원본을 저장하지 않는다.** 바이트는 이 함수 안에서만 살고, 남는 것은
 * 지문(같은 파일을 두 번 읽지 않으려는 것)과 만든 초안뿐이다. 파일 이름도
 * 적지 않는다: 이름에 학번이나 이름이 들어가는 일이 흔하다.
 *
 * **점수에 들어가지 않는다**(설계 원칙 6). 나오는 것은 켜 둘 보기의
 * 묶음이고 사람이 고쳐서 직접 저장한다. 보기는 그 Core 의 체크리스트에
 * 있는 문장만 남는다(`clamp`).
 *
 * **규칙으로 내려가지 않는다.** 메모는 낱말로라도 읽을 수 있지만 파일은
 * 모델 없이는 한 글자도 못 읽는다. 열쇠가 없거나 동의가 없으면 까닭을
 * 돌려주고 끝낸다.
 *
 * **한 달 열 건까지.** 월 6,900원 안에서 비용을 지키는 선이다. 같은 파일을
 * 다시 올리면 앞에서 만든 초안을 돌려주고 세지 않는다. 모델을 부르지 못한
 * 것(`failed`)도 세지 않는다: 그 사람 잘못이 아니다.
 */

export const UPLOAD_MONTHLY_CAP = 10;
/** 서버 액션 본문 한도가 8MB 라 그 아래에 둔다 */
export const UPLOAD_MAX_BYTES = 7 * 1024 * 1024;
export const UPLOAD_MAX_PAGES = 10;
/** 그림은 긴 변을 이만큼으로 줄여 보낸다. 글자를 읽기에 충분하고 값이 싸다 */
const IMAGE_EDGE = 1600;

export type UploadFail =
  | "off" | "consent" | "cap" | "type" | "size" | "pages"
  | "refusal" | "empty" | "error";

export type UploadResult =
  | { ok: true; drafts: { id: string; title: string; kind: string | null }[]; reused: boolean; used: number }
  | { ok: false; reason: UploadFail; used: number };

const SOURCES = ["course", "certificate", "award", "activity", "other"] as const;
const FileOut = z.object({
  doc_type: z.enum(["transcript", "certificate", "award", "activity", "other", "unreadable"]),
  items: z.array(Out.extend({ source: z.enum(SOURCES) })),
});

const SYSTEM =
  "당신은 대학생이 자기 경험을 정리하도록 돕는 진로 상담사입니다. 학생이 올린 문서" +
  "(성적증명서·수료증·자격증·상장·활동 확인서)를 읽고, 진로 경험으로 적을 만한 것을 " +
  "최대 5개 고른 뒤 아래 보기 목록에서 맞는 보기만 고릅니다.\n규칙:\n" +
  "1. 이름·학번·생년월일·주민등록번호·주소·연락처·증명서 번호·평점 평균은 어디에도 적지 않습니다.\n" +
  "2. 성적증명서면 보기 목록의 기술영역과 가까운 과목 가운데 실습·설계·프로젝트·" +
  "캡스톤·현장실습이 들어간 과목을 먼저 고릅니다. 교양 과목은 고르지 않습니다. source 는 course 입니다.\n" +
  "3. 수료증·자격증은 certificate, 상장은 award, 활동 확인서는 activity 입니다.\n" +
  "4. domains 는 기술영역 코드 가운데 가장 가까운 것 최대 2개입니다.\n" +
  "5. problems·decisions·artifacts·verifications 는 고른 영역의 보기 문장을 글자 그대로 " +
  "옮겨 적습니다. **문서에 근거가 없으면 고르지 않습니다.** 과목명만 있으면 넷 다 비워 둡니다.\n" +
  "6. kind 는 종류 코드 하나입니다. 과목은 course, 캡스톤은 capstone, 현장실습은 internship 입니다.\n" +
  "7. title 은 문서에 적힌 과목·자격·상·활동 이름을 그대로 쓴 한 줄(30자 안)입니다. 성적이나 " +
  "수치를 넣지 않습니다.\n" +
  "8. ask 는 문서만으로는 알 수 없어 학생에게 되물을 짧은 질문 최대 3개입니다. 존댓말로 적습니다.\n" +
  "9. 문서를 읽을 수 없거나 진로 경험으로 적을 것이 없으면 doc_type 을 맞게 적고 items 를 비웁니다.";

/** 파일의 첫 바이트로 종류를 정한다. **보낸 쪽이 적은 형식을 믿지 않는다** */
export function sniff(b: Buffer): "pdf" | "png" | "jpeg" | "webp" | null {
  if (b.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (b[0] === 0x89 && b.subarray(1, 4).toString("latin1") === "PNG") return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}

/** 쪽 수를 어림한다. 라이브러리를 들이지 않는다: 넘치는지만 알면 된다 */
export function pdfPages(b: Buffer): number {
  return (b.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
}

/** 지문에서 사람을 좁히는 숫자를 걷는다(학번 · 증명서 번호) */
function cleanTitle(t: string): string {
  return t.replace(/\d{5,}/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
}

async function shrink(b: Buffer): Promise<{ data: Buffer; type: "image/jpeg" | "image/png" | "image/webp" } | null> {
  try {
    const sharp = (await import("sharp")).default;
    const data = await sharp(b).rotate()
      .resize({ width: IMAGE_EDGE, height: IMAGE_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 }).toBuffer();
    return { data, type: "image/jpeg" };
  } catch {
    /* sharp 가 없는 배포본. 그대로 보낼 수 있는 크기면 그대로 보낸다
       (API 의 그림 한 장 상한이 5MB 이고 base64 로 늘어난다) */
    const kind = sniff(b);
    if (b.length > 3.5 * 1024 * 1024 || !kind || kind === "pdf") return null;
    return { data: b, type: kind === "png" ? "image/png" : kind === "webp" ? "image/webp" : "image/jpeg" };
  }
}

/** 이번 달(한국 시각)에 센 건수 */
export async function usedThisMonth(userId: string): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM assistant_uploads
      WHERE user_id = $1 AND status <> 'failed'
        AND created_at >= (date_trunc('month', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`,
    [userId]).catch(() => null);
  return r?.n ?? 0;
}

async function log(userId: string, core: string, sha: string, kind: "pdf" | "image",
  status: "read" | "empty" | "refused" | "failed", model: string | null,
  usage: { input: number; output: number } | undefined, ids: string[]): Promise<void> {
  await query(
    `INSERT INTO assistant_uploads
       (user_id, core_code, sha256, file_kind, status, model, input_tokens, output_tokens, draft_ids)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::bigint[])`,
    [userId, core, sha, kind, status, model, usage?.input ?? null, usage?.output ?? null, ids]);
}

export async function readUpload(userId: string, bytes: Buffer): Promise<UploadResult> {
  const used = await usedThisMonth(userId);
  if (!aiReady()) return { ok: false, reason: "off", used };
  if (!(await settingsOf(userId)).file_consent_at) return { ok: false, reason: "consent", used };
  if (bytes.length === 0 || bytes.length > UPLOAD_MAX_BYTES) return { ok: false, reason: "size", used };
  const kind = sniff(bytes);
  if (!kind) return { ok: false, reason: "type", used };
  if (kind === "pdf" && pdfPages(bytes) > UPLOAD_MAX_PAGES) return { ok: false, reason: "pages", used };

  const core = await activeCoreOrPick(userId);
  const sha = createHash("sha256").update(bytes).digest("hex");

  /* 같은 파일은 다시 읽지 않는다. 아직 쓰지 않은 초안이 남아 있으면 그것을 돌려준다 */
  const prev = await query<{ id: string; draft: DraftValue }>(
    `SELECT d.id::text, d.draft FROM assistant_uploads u
       JOIN assistant_drafts d ON d.id = ANY(u.draft_ids) AND d.user_id = u.user_id
      WHERE u.user_id = $1 AND u.sha256 = $2 AND u.core_code = $3 AND u.status = 'read'
        AND d.used_at IS NULL
      ORDER BY d.id`, [userId, sha, core]).catch(() => []);
  if (prev.length) {
    return { ok: true, reused: true, used,
      drafts: prev.map((p) => ({ id: p.id, title: p.draft.title, kind: p.draft.kind })) };
  }
  if (used >= UPLOAD_MONTHLY_CAP) return { ok: false, reason: "cap", used };

  let block: AiBlock;
  if (kind === "pdf") {
    block = { type: "document", source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") } };
  } else {
    const img = await shrink(bytes);
    if (!img) return { ok: false, reason: "size", used };
    block = { type: "image", source: { type: "base64", media_type: img.type, data: img.data.toString("base64") } };
  }
  const fileKind = kind === "pdf" ? "pdf" : "image";

  const r = await askStructured({
    op: "assistant.upload", schema: FileOut, system: SYSTEM, model: UPLOAD_MODEL,
    blocks: [block], maxTokens: 6000,
    user: `종류 코드: ${EXPERIENCE_KINDS.map((k) => `${k.code}(${k.label})`).join(", ")}\n\n${menu(core)}\n\n` +
      "위 문서에서 진로 경험으로 적을 만한 것을 고르세요.",
  });
  if (!r.ok) {
    const refused = r.reason === "refusal";
    await log(userId, core, sha, fileKind, refused ? "refused" : "failed", null, undefined, []).catch(() => undefined);
    return { ok: false, reason: refused ? "refusal" : "error", used: refused ? used + 1 : used };
  }

  const items = r.value.items.slice(0, 5)
    .map((it) => ({ ...clamp(core, it), title: cleanTitle(it.title), from: "file" as const }))
    .filter((v) => v.title.length > 0);
  if (!items.length) {
    await log(userId, core, sha, fileKind, "empty", r.model, r.usage, []).catch(() => undefined);
    return { ok: false, reason: "empty", used: used + 1 };
  }
  const ids: string[] = [];
  for (const v of items) {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO assistant_drafts (user_id, core_code, note_text, draft, drafted_by, model)
       VALUES ($1,$2,NULL,$3::jsonb,'claude',$4) RETURNING id::text`,
      [userId, core, JSON.stringify(v), r.model]);
    ids.push(row!.id);
  }
  await log(userId, core, sha, fileKind, "read", r.model, r.usage, ids);
  return { ok: true, reused: false, used: used + 1,
    drafts: items.map((v, i) => ({ id: ids[i], title: v.title, kind: v.kind })) };
}

/** 화면에 적을 한 줄 */
export function uploadFailKo(r: UploadFail): string {
  switch (r) {
    case "off": return "지금은 파일 읽기가 꺼져 있습니다. 메모로 적어 주시면 옮겨 드립니다.";
    case "consent": return "파일을 읽으려면 아래 동의가 필요합니다.";
    case "cap": return `이번 달에 읽을 수 있는 ${UPLOAD_MONTHLY_CAP}건을 다 쓰셨습니다. 다음 달 1일에 다시 열립니다.`;
    case "type": return "PDF, JPG, PNG, WEBP 파일만 읽을 수 있습니다.";
    case "size": return "파일이 너무 큽니다. 7MB 안으로 올려 주세요.";
    case "pages": return `${UPLOAD_MAX_PAGES}쪽이 넘는 PDF는 읽지 않습니다. 필요한 쪽만 저장해 올려 주세요.`;
    case "refusal": return "이 파일은 읽지 못했습니다. 다른 파일로 다시 올려 주세요.";
    case "empty": return "파일에서 경험으로 옮길 것을 찾지 못했습니다. 글씨가 잘 보이게 다시 찍어 올리시거나 메모로 적어 주세요.";
    default: return "파일을 읽는 중에 문제가 생겼습니다. 잠시 뒤 다시 올려 주세요. 이 경우는 한 달 건수에 세지 않습니다.";
  }
}

/** 기한이 지난 업로드 기록을 지운다. 남는 것이 지문과 건수뿐이라 줄째 지운다 */
export async function purgeUploads(): Promise<number> {
  const r = await query<{ id: string }>(
    `DELETE FROM assistant_uploads WHERE purge_after < now() RETURNING id::text`).catch(() => []);
  return r.length;
}

/** 파일에서 옮겨 두고 아직 적지 않은 초안. 한 파일에서 여럿이 나오므로
    하나를 저장하고 돌아온 사람이 나머지를 다시 찾을 수 있게 둔다 */
export async function pendingFileDrafts(userId: string): Promise<{ id: string; title: string }[]> {
  return query<{ id: string; title: string }>(
    `SELECT id::text, draft->>'title' AS title FROM assistant_drafts
      WHERE user_id = $1 AND used_at IS NULL AND draft->>'from' = 'file'
        AND created_at > now() - interval '30 days'
      ORDER BY id DESC LIMIT 10`, [userId]).catch(() => []);
}
