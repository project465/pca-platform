import { isProduction } from "@/lib/env";
import { notFound } from "next/navigation";
import Link from "next/link";
import BrandHome from "@/components/sf/brand-home";
import PublicFooter from "@/components/sf/public-footer";
import { readLegalBody } from "@/lib/legal-doc";
import { LegalMarkdown } from "@/lib/legal-md";
import { resolveLang } from "@/lib/locale-server";
import { activeDocs, type ConsentKind } from "@/lib/consent";
import { toLang2, txer } from "@/lib/surface-text";

/**
 * 약관·개인정보 처리방침 전문.
 *
 * **본문은 파일에서 읽는다.** 표에 담으면 고칠 때 두 곳을 고치게 되고,
 * 둘이 갈리면 어느 쪽에 동의한 것인지 알 수 없다. 표가 들고 있는 것은
 * 어느 판이 언제부터 유효하고 본문이 어디 있는지까지다.
 *
 * **번역이 없으면 없다고 적는다.** 영어로 들어온 사람에게 한국어 본문을
 * 조용히 보여 주면 자기가 무엇에 동의했는지 모른다. 영문 번역이 준비
 * 중이고 한국어 본문이 기준이라는 것을 영어로 먼저 적고, 그 아래에
 * 한국어 본문을 둔다.
 */
const KINDS: ConsentKind[] = ["terms", "privacy", "marketing", "third_party"];

/**
 * 환불정책은 동의 문서가 아니다.
 *
 * 약관과 처리방침은 가입할 때 **동의를 받는** 글이라 `consent_documents`
 * 에 판과 효력 시점이 적힌다. 환불정책은 동의를 받지 않고 **알리기만**
 * 하는 글이고(전자상거래법 제13조 제2항의 청약철회 조건 표시), 그
 * 표의 `kind` CHECK 에도 들어가지 않는다.
 *
 * 그래서 줄 없이 파일만 읽는다. 전에는 상품 쪽 꼬리말이 `/legal/refund`
 * 를 가리키는데 이 쪽이 404 였다: **환불 조건을 적어 두었다고 링크를
 * 걸어 놓고 눌리면 없는 쪽으로 보냈다.**
 */
/**
 * **영어 본문은 검토용 번역 초안이다**(`sites/careermetri/legal/en/`, 2026-11-03 영어 공개 전 필수 목록).
 * 영어 화면에서는 이 초안을 보이고, 맨 위에 `한국어본이 우선 · 검토 중인 번역 초안` 을 영어로 먼저 적는다.
 * 동의 기록(`consent_documents`)은 바꾸지 않는다: 동의의 기준은 그대로 한국어본이다
 */
/* **운영에서는 검토 전 초안을 내놓지 않는다**(초안 README "검토 전 공개 금지"). `LEGAL_EN_DRAFTS=1` 을 넣은 날부터 보인다.
   운영이 아닌 배포본은 늘 보인다(검토 · 시험용) */
const draftsOn = () => process.env.LEGAL_EN_DRAFTS === "1" || !isProduction();
const EN_DRAFT: Record<string, string> = {
  terms: "sites/careermetri/legal/en/01-terms.md",
  privacy: "sites/careermetri/legal/en/02-privacy.md",
  refund: "sites/careermetri/legal/en/03-refund.md",
  subscription: "sites/careermetri/legal/en/04-subscription.md",
};

function DraftNotice({ kind }: { kind: string }) {
  return (
    <div className="notice warn" role="note" data-legal-draft>
      <p style={{ margin: 0 }}><b>English translation draft for review.</b> The Korean version governs.
        If the English and Korean versions differ, the Korean version applies.</p>
      <p style={{ margin: "6px 0 0" }}><Link href={`/legal/${kind}?lang=ko`} lang="ko">한국어 본문 보기 (Korean version)</Link></p>
    </div>
  );
}

const STANDALONE: Record<string, { path: string; ko: string; en: string }> = {
  refund: {
    path: "sites/careermetri/legal/03-refund.md",
    ko: "환불정책", en: "Refund policy",
  },
  /* 정기결제(자동 갱신) 운영 규정(2026-11-03 NHN KCP 정기결제 심사: "정기과금 운영규정 상세내용 확인 가능한 경로") */
  subscription: {
    path: "sites/careermetri/legal/04-subscription.md",
    ko: "MAT 정기결제 운영 규정", en: "MAT subscription (auto-renewal) policy",
  },
};

export default async function LegalPage({
  params, searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { kind } = await params;
  const sp = await searchParams;
  const solo = STANDALONE[kind];
  if (!solo && !KINDS.includes(kind as ConsentKind)) notFound();

  const L = toLang2(await resolveLang(sp.lang));
  const T = txer(L);

  if (solo) {
    /* 영어면 영어 초안을 먼저 읽는다. 없으면 한국어 본문 */
    const draft = L === "en" && draftsOn() && EN_DRAFT[kind] ? await readLegalBody(EN_DRAFT[kind]) : null;
    const got = draft?.ok ? draft : await readLegalBody(solo.path);
    const text = got.ok ? got.text : null;
    return (
      <div className="pub">
        <header className="pubtop">
          <BrandHome />
          <div className="pubtop-r">
            <Link href="/" className="sf-btn ghost sm">{T("navHome")}</Link>
          </div>
        </header>
        <div className="pubwrap lgwrap" style={{ maxWidth: 760 }}>
          <div className="sf-head">
            <div className="sf-head-t">
              <h1 className="sf-h1">{L === "en" ? solo.en : solo.ko}</h1>
            </div>
          </div>
          {draft?.ok ? <DraftNotice kind={kind} /> : null}
          {text ? (
            <LegalMarkdown text={text} dropTitle />
          ) : (
            /* 없는 것을 있는 척하지 않는다 */
            <p className="sf-sub">
              {L === "en"
                ? "The refund policy text is not available yet."
                : "환불정책 본문을 아직 올리지 못했습니다."}
            </p>
          )}
        </div>
        <PublicFooter lang={L} />
      </div>
    );
  }
  const docs = await activeDocs(L);
  const doc = docs.find((d) => d.kind === kind);
  if (!doc) notFound();

  let body: string | null = null;
  /* 영어면 검토용 영어 초안(있는 문서만: 약관 · 처리방침). 판 · 동의 기준은 위 줄 그대로다 */
  const draft = L === "en" && draftsOn() && EN_DRAFT[kind] ? await readLegalBody(EN_DRAFT[kind]) : null;
  if (draft?.ok) body = draft.text;
  else if (doc.body_path) {
    const got = await readLegalBody(doc.body_path);
    body = got.ok ? got.text : null;
  }

  return (
    <div className="pub">
      <header className="pubtop">
        {/* 로고와 브랜드 글자가 한 덩어리로 홈으로 간다. 로그인했으면 그
            역할의 첫 화면, 아니면 공개 홈이다 */}
        <BrandHome />
        <div className="pubtop-r">
          <Link href="/" className="sf-btn ghost sm">{T("navHome")}</Link>
        </div>
      </header>

      <div className="pubwrap lgwrap" style={{ maxWidth: 760 }}>
        <div className="sf-head">
          <div className="sf-head-t">
            <div className="sf-eyebrow">
              {T("cnVersion")} {doc.version}
              {doc.required ? ` · ${T("cnRequired")}` : ` · ${T("cnOptional")}`}
            </div>
            <h1 className="sf-h1">{doc.title}</h1>
          </div>
        </div>

        {draft?.ok ? <DraftNotice kind={kind} /> : doc.translation_status === "pending" ? (
          /* 없는 것을 없다고 적는다. 지어낸 번역을 올리지 않는다 */
          <p className="notice warn" role="status">{T("cnPending")}</p>
        ) : null}

        {body ? (
          <LegalMarkdown text={body} dropTitle />
        ) : (
          <p className="sf-sub">{T("cnNotAgreed")}</p>
        )}
      </div>

      <PublicFooter lang={L} />
    </div>
  );
}
