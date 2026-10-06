import Link from "next/link";
import { businessInfo, jobInfoLicense } from "@/lib/business";
import { supportConfig } from "@/lib/support";
import type { Lang2 } from "@/lib/surface-text";
import { BRAND } from "@/lib/surface-text";

/**
 * 공개 판매 표면의 꼬리말.
 *
 * **장식이 아니라 전자상거래법 제10조 표시다.** 상호 · 대표자 · 주소 ·
 * 전화 · 이메일 · 사업자등록번호 · 통신판매업 신고번호를 사이버몰에
 * 적어야 결제를 받을 수 있는데, 그 표시가 상품 쪽 한 곳에만 있었다.
 * 사는 사람이 가격표에서 바로 결제로 가면 그 표시를 한 번도 안 보고
 * 지나간다.
 *
 * **값을 여기 적지 않는다.** 전부 `businessInfo()` 한 곳에서 오고, 그
 * 함수는 `settings.get` 으로 표 → 환경변수 차례로 본다. 그래서
 * `/admin/business` 에서 한 글자 고치면 공개 쪽 전부가 같이 바뀐다.
 * 꼬리말에 상호를 적어 두면 법인이 바뀌는 날 고칠 자리가 둘이 된다.
 *
 * **빈칸을 숨기지 않는다.** 안 적힌 칸은 `확인 필요` 로 그린다. 줄을
 * 지우면 화면은 멀쩡해 보이고 가게는 여전히 상호가 없다. 운영에서는
 * 그 상태로 판매 자체가 안 열린다(`public-gate.ts`).
 *
 * 로그인한 뒤의 제품 화면(`/my` · Campus · Admin)에는 붙이지 않는다.
 * 저기는 파는 자리가 아니고 이미 산 사람이 쓰는 자리다.
 */
export default async function PublicFooter({
  lang, compact = false,
}: {
  lang: Lang2;
  /** 가입·로그인처럼 한 가지만 하는 쪽. 법적 표시 대신 링크만 둔다 */
  compact?: boolean;
}) {
  const L = lang;
  const biz = await businessInfo();
  const license = await jobInfoLicense();
  const sup = await supportConfig();
  const year = new Date().getFullYear();

  const legal = (
    <nav className="pfoot-links">
      <Link href="/legal/terms">{L === "en" ? "Terms of service" : "이용약관"}</Link>
      <Link href="/legal/privacy">{L === "en" ? "Privacy policy" : "개인정보처리방침"}</Link>
      <Link href="/legal/refund">{L === "en" ? "Refund policy" : "환불정책"}</Link>
      <Link href="/support">{L === "en" ? "Support" : "고객지원"}</Link>
    </nav>
  );
  const copy = <p className="pfoot-c">© {year} {BRAND.root}</p>;

  if (compact) {
    return (
      <footer className="pfoot is-compact">
        <div className="pfoot-in">{legal}{copy}</div>
      </footer>
    );
  }

  const MISSING = L === "en" ? "not set" : "확인 필요";
  /** 값이 있으면 그 값을, 없으면 눈에 띄게 '확인 필요' 를 적는다 */
  const val = (v: string | null, node?: React.ReactNode) =>
    v ? (node ?? v) : <b className="is-missing">{MISSING}</b>;

  const by = Object.fromEntries(biz.fields.map((f) => [f.key, f]));
  const mail = by.email?.value ?? null;
  const tel = by.phone?.value ?? null;
  const lab = (k: string, ko: string) => by[k]?.label[L] ?? (L === "en" ? k : ko);
  /* 차례가 법이 적어 둔 차례다. `businessInfo()` 가 돌려주는 순서를 그대로
     쓰면 코드 쪽 사정이 화면 차례가 된다 */
  const PLAIN = [
    ["name", "상호"], ["ceo", "대표자"], ["address", "주소"],
  ] as const;
  const PLAIN2 = [
    ["reg", "사업자등록번호"], ["mailorder", "통신판매업 신고번호"],
  ] as const;

  return (
    <footer className="pfoot">
      <div className="pfoot-in">
        <div className="pfoot-name">{BRAND.root}</div>

        <dl className="pfoot-biz">
          {PLAIN.map(([k, ko]) => (
            <div key={k}>
              <dt>{lab(k, ko)}</dt>
              <dd>{val(by[k]?.value ?? null)}</dd>
            </div>
          ))}
          <div>
            <dt>{lab("phone", "전화")}</dt>
            {/* 손전화에서 눌러 걸 수 있게 한다. 공백과 괄호가 들어가면
                다이얼러가 못 읽으므로 숫자와 + 만 남겨 건넨다 */}
            <dd>{val(tel, <a href={`tel:${(tel ?? "").replace(/[^\d+]/g, "")}`}>{tel}</a>)}</dd>
          </div>
          <div>
            <dt>{lab("email", "이메일")}</dt>
            <dd>{val(mail, <a href={`mailto:${mail}`}>{mail}</a>)}</dd>
          </div>
          {PLAIN2.map(([k, ko]) => (
            <div key={k}>
              <dt>{lab(k, ko)}</dt>
              <dd>{val(by[k]?.value ?? null)}</dd>
            </div>
          ))}
          <div>
            <dt>{L === "en" ? "Career information filing" : "직업정보제공사업 신고번호"}</dt>
            <dd>{val(license)}</dd>
          </div>
        </dl>

        {/* **지원 주소가 사업자 표시의 이메일과 같은 칸에서 온다.** 둘을
            따로 받으면 손님이 본 주소와 우리가 보는 주소가 갈린다 */}
        {sup.email && sup.hours ? (
          <p className="pfoot-sup">
            {L === "en" ? "Support" : "고객지원"} · {sup.hours}
          </p>
        ) : null}

        {legal}
        {copy}
      </div>
    </footer>
  );
}
