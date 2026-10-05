/**
 * 동의.
 *
 * **받았다는 사실만으로는 쓸 수 없다.** 분쟁이 생기면 "그때 어느 문서의
 * 어느 판에 동의했는가" 를 대야 한다. 판을 적어 두지 않으면 약관을 고친
 * 뒤에 받은 동의와 고치기 전에 받은 동의가 구별되지 않는다.
 *
 * **지우지 않고 철회 시각을 적는다.** 동의한 사실과 철회한 사실이 둘 다
 * 남아야 쓸 수 있다.
 *
 * **IP 와 User-Agent 를 담지 않는다.** 분쟁에 쓰이는 것은 '어느 판에
 * 동의했는가' 이고, 그 둘은 그 질문에 답하지 않으면서 파기 대상만 늘린다.
 */
import { query, queryOne } from "@/lib/db";

export type ConsentKind = "terms" | "privacy" | "marketing" | "third_party";

export type ConsentDoc = {
  id: string;
  kind: ConsentKind;
  version: string;
  locale: string;
  title: string;
  body_path: string | null;
  required: boolean;
  /** translated = 그 언어의 본문이 있다 · pending = 아직 없다 */
  translation_status: "translated" | "pending";
  /** 번역이 없을 때 기준이 되는 본문의 언어 */
  governing_locale: string | null;
};

/**
 * 지금 유효한 동의문. 그 언어의 줄을 돌려준다.
 *
 * **없는 언어를 한국어로 바꿔 돌려주지 않는다.** 바꿔 주면 화면이 그
 * 사실을 모르고 영어 화면에 한국어 제목을 띄운다. 영어 줄은 만들어 두고
 * `translation_status` 로 번역이 없다는 것을 말한다.
 */
export async function activeDocs(locale: string): Promise<ConsentDoc[]> {
  const l = locale === "en" ? "en" : "ko";
  return query<ConsentDoc>(
    `SELECT id::text, kind, version, locale, title, body_path, required,
            translation_status, governing_locale
       FROM consent_documents
      WHERE locale = $1 AND retired_at IS NULL
        AND effective_at <= now()
      ORDER BY CASE kind WHEN 'terms' THEN 1 WHEN 'privacy' THEN 2
                         WHEN 'third_party' THEN 3 ELSE 4 END`,
    [l],
  ).catch(() => [] as ConsentDoc[]);
}

/** 반드시 받아야 하는 것들의 id. 화면이 이걸로 체크박스를 거른다 */
export function requiredIds(docs: ConsentDoc[]): string[] {
  return docs.filter((d) => d.required).map((d) => d.id);
}

/**
 * 동의를 적는다.
 *
 * **같은 사람이 같은 판에 두 줄을 만들지 않는다.** 철회한 뒤 다시
 * 동의하면 철회 시각을 비우고 동의 시각을 올린다.
 *
 * **필수 동의가 빠졌으면 거절한다.** 화면에서 막는 것은 안내이고,
 * 막는 것은 서버다.
 */
export async function record(opts: {
  userId: string;
  locale: string;
  siteId?: string | null;
  /** 동의한 문서 id 들 */
  agreedIds: string[];
}): Promise<{ ok: true; saved: number } | { ok: false; reason: string }> {
  const docs = await activeDocs(opts.locale);
  if (!docs.length) return { ok: false, reason: "동의문이 등록되지 않았습니다." };

  const need = requiredIds(docs);
  const missing = need.filter((id) => !opts.agreedIds.includes(id));
  if (missing.length) {
    return { ok: false, reason: "필수 동의 항목이 빠졌습니다." };
  }

  let saved = 0;
  for (const d of docs) {
    const agreed = opts.agreedIds.includes(d.id);
    const r = await query(
      `INSERT INTO consent_records (user_id, document_id, site_id, agreed)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, document_id) DO UPDATE
         SET agreed = EXCLUDED.agreed,
             agreed_at = now(),
             site_id = EXCLUDED.site_id,
             withdrawn_at = NULL`,
      [opts.userId, d.id, opts.siteId ?? null, agreed],
    ).then(() => 1).catch(() => 0);
    saved += r;
  }
  return { ok: true, saved };
}

/** 선택 동의를 철회한다. **줄을 지우지 않는다** */
export async function withdraw(userId: string, documentId: string): Promise<boolean> {
  const d = await queryOne<{ required: boolean }>(
    `SELECT required FROM consent_documents WHERE id = $1`, [documentId],
  ).catch(() => null);
  /* 필수 동의는 철회로 끄지 않는다. 그건 탈퇴이고 `erasure.ts` 가 한다 */
  if (!d || d.required) return false;
  const r = await query(
    `UPDATE consent_records SET agreed = false, withdrawn_at = now()
      WHERE user_id = $1 AND document_id = $2 AND withdrawn_at IS NULL`,
    [userId, documentId],
  ).then(() => true).catch(() => false);
  return r;
}

export type ConsentStatus = ConsentDoc & {
  agreed: boolean;
  agreed_at: string | null;
  withdrawn_at: string | null;
};

/** 이 사람이 무엇에 동의해 두었는가. 계정 화면이 읽는다 */
export async function statusOf(userId: string, locale: string): Promise<ConsentStatus[]> {
  const l = locale === "en" ? "en" : "ko";
  return query<ConsentStatus>(
    `SELECT d.id::text, d.kind, d.version, d.locale, d.title, d.body_path,
            d.required, d.translation_status, d.governing_locale,
            COALESCE(r.agreed, false) AS agreed,
            r.agreed_at::text, r.withdrawn_at::text
       FROM consent_documents d
       LEFT JOIN consent_records r
              ON r.document_id = d.id AND r.user_id = $2
      WHERE d.locale = $1 AND d.retired_at IS NULL
      ORDER BY CASE d.kind WHEN 'terms' THEN 1 WHEN 'privacy' THEN 2
                           WHEN 'third_party' THEN 3 ELSE 4 END`,
    [l, userId],
  ).catch(() => [] as ConsentStatus[]);
}

/**
 * 필수 동의를 다 받았는가.
 *
 * **판까지 본다.** 약관을 v1.1 로 올리면 v1.0 에 동의한 사람은 다시
 * 받아야 한다. 종류만 보면 고친 약관에 동의 없이 서비스가 계속된다.
 */
export async function hasRequired(userId: string, locale: string): Promise<boolean> {
  const docs = await activeDocs(locale);
  const need = docs.filter((d) => d.required);
  if (!need.length) return false;
  const got = await query<{ document_id: string }>(
    `SELECT document_id::text FROM consent_records
      WHERE user_id = $1 AND agreed AND withdrawn_at IS NULL`,
    [userId],
  ).catch(() => [] as { document_id: string }[]);
  const ids = new Set(got.map((g) => g.document_id));
  return need.every((d) => ids.has(d.id));
}
