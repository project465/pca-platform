import * as z from "zod/v4";
import { aiReady, askStructured, RESEARCH_MODEL, type AiBlock } from "@/lib/assistant/claude";
import { opFail, ref } from "@/lib/oplog";

/**
 * 통이미지 공고 읽기(2026-11-01 대표 결정 1: 1주차에 넣는다).
 *
 * 잡인더스트리 공고 가운데 본문을 그림 한 장으로 올린 글은 글자가 비어 있어 요구 항목을
 * 못 읽고, 그래서 MAT 이 그 공고를 누구에게도 맞는 공고로 내놓지 못한다. **수집할 때 한 번**
 * 그림을 Claude 로 읽어 글자로 옮기고, 그 글자를 늘 하던 대로 `ingest` 에 넘긴다.
 *
 * - **저장하는 것은 그대로다.** 옮긴 글자는 요구 항목을 읽는 데만 쓰고 표에 담지 않는다
 *   (`ingest` 는 원문 링크 · 마감일 · 읽어 낸 요구만 남긴다). 그림도 저장하지 않는다
 * - **돈이 든다**(공고당 약 35원 어림). 한 번 돌 때 `JOBINDUSTRY_VISION_MAX`(기본 10)건까지,
 *   끄려면 `JOBINDUSTRY_VISION=off`. Claude 열쇠가 없으면 저절로 꺼진다
 * - **지어내지 않는다.** 그림에 적힌 글만 옮기라고 시키고, 못 읽으면 빈 값이다
 * - 잡인더스트리 API 가 본문을 글자로 주면 그쪽이 먼저다(결정 1). 그때는 부를 일이 없다
 */

export function visionEnabled(): boolean {
  if ((process.env.JOBINDUSTRY_VISION ?? "").trim().toLowerCase() === "off") return false;
  return aiReady();
}

export function visionMax(): number {
  const n = Number(process.env.JOBINDUSTRY_VISION_MAX ?? 10);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 10;
}

/** 글자가 이만큼도 안 되면 그림 공고로 본다. 머리말 · 연락처 한두 줄만 있는 글이 많다 */
const THIN = 200;

export function needsVision(body: string, images: string[]): boolean {
  return images.length > 0 && body.replace(/\s+/g, "").length < THIN;
}

const MAX_IMAGES = 4;
const MAX_BYTES = 4_500_000;
const TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ImgType = (typeof TYPES)[number];

async function fetchImage(url: string): Promise<AiBlock | null> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    redirect: "error",
    headers: { "user-agent": "CareerMatri-MAT/1.0 (+https://app.careermatri.com)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!(TYPES as readonly string[]).includes(type)) return null;
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) return null;
  return { type: "image", source: { type: "base64", media_type: type as ImgType, data: buf.toString("base64") } };
}

const Out = z.object({
  text: z.string().describe("그림에 적힌 공고 글. 줄바꿈을 살려 그대로. 읽을 글이 없으면 빈 문자열"),
});

const SYSTEM = [
  "채용 공고 그림에 적힌 글을 글자로 옮긴다.",
  "그림에 실제로 적힌 글만 그대로 옮긴다. 요약하거나 고치거나 없는 내용을 더하지 않는다.",
  "자격 요건 · 우대 사항 · 담당 업무 · 전공 · 학위 · 근무지 · 접수 기간(마감일)을 빠뜨리지 않는다.",
  "읽을 수 없는 칸은 건너뛴다. 공고 글이 아닌 그림(로고 · 사진)이면 빈 문자열을 낸다.",
].join("\n");

/**
 * 공고 하나의 그림을 읽어 글자로. 실패하면 빈 값(그 공고는 제목만으로 들어간다).
 * 기록에는 공고 번호와 까닭만 남기고 그림 주소 · 옮긴 글은 남기지 않는다.
 */
export async function readPostingImages(postingRef: string, title: string, images: string[]): Promise<string> {
  const blocks: AiBlock[] = [];
  for (const u of images.slice(0, MAX_IMAGES)) {
    try {
      const b = await fetchImage(u);
      if (b) blocks.push(b);
    } catch (e) {
      opFail({ operation: "jobs.jobindustry", ref: ref("posting", postingRef), step: "image", category: "upstream" }, e);
    }
  }
  if (!blocks.length) return "";
  const r = await askStructured({
    op: "jobs.jobindustry.vision",
    schema: Out,
    system: SYSTEM,
    user: `공고 제목: ${title.slice(0, 200)}\n위 그림에 적힌 공고 글을 옮겨 주세요.`,
    blocks,
    model: RESEARCH_MODEL,
    maxTokens: 3000,
    timeoutMs: 90_000,
  });
  return r.ok ? r.value.text.trim().slice(0, 20_000) : "";
}
