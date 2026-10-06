import { notFound } from "next/navigation";
import Link from "next/link";
import BrandHome from "@/components/sf/brand-home";
import { readFile } from "node:fs/promises";
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

export default async function LegalPage({
  params, searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { kind } = await params;
  const sp = await searchParams;
  if (!KINDS.includes(kind as ConsentKind)) notFound();

  const L = toLang2(await resolveLang(sp.lang));
  const T = txer(L);
  const docs = await activeDocs(L);
  const doc = docs.find((d) => d.kind === kind);
  if (!doc) notFound();

  let body: string | null = null;
  if (doc.body_path) {
    body = await readFile(doc.body_path, "utf8").catch(() => null);
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

      <div className="pubwrap" style={{ maxWidth: 760 }}>
        <div className="sf-head">
          <div className="sf-head-t">
            <div className="sf-eyebrow">
              {T("cnVersion")} {doc.version}
              {doc.required ? ` · ${T("cnRequired")}` : ` · ${T("cnOptional")}`}
            </div>
            <h1 className="sf-h1">{doc.title}</h1>
          </div>
        </div>

        {doc.translation_status === "pending" ? (
          /* 없는 것을 없다고 적는다. 지어낸 번역을 올리지 않는다 */
          <p className="notice warn" role="status">{T("cnPending")}</p>
        ) : null}

        {body ? (
          <pre className="lgbody">{body}</pre>
        ) : (
          <p className="sf-sub">{T("cnNotAgreed")}</p>
        )}
      </div>
    </div>
  );
}
