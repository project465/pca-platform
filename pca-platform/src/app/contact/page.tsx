import Link from "next/link";
import BrandHome from "@/components/sf/brand-home";
import LangSelect from "@/components/sf/lang-select";
import PublicFooter from "@/components/sf/public-footer";
import { resolveLang } from "@/lib/locale-server";
import { toLang2 } from "@/lib/surface-text";
import { supportConfig } from "@/lib/support";
import { sayOf } from "@/lib/mat/copy";
import { CONTACT_TEXT as C } from "./contact-text";
import { contactAction } from "./actions";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const L = toLang2(await resolveLang((await searchParams).lang));
  return { title: `${L === "en" ? "Contact us" : "문의하기"} · CareerMatri` };
}

const ERR = { email: C.errEmail, consent: C.errConsent, required: C.errRequired, too_long: C.errLong } as const;

/**
 * 문의하기(영어 공개 전 필수 목록의 **영어 문의 창구**, 2026-11-03). 로그인하지 않아도 쓴다.
 *
 * - 메일 칸이 있다: 답은 그 메일로 간다. 받은 문의는 `inquiries` 표(기한을 박아 지운다)
 * - 주문 · 환불 · 계정처럼 본인 확인이 필요한 일은 고객지원(`/support`)으로 보낸다
 * - 언어는 화면 언어(`?lang=en` · 쿠키 · 계정 · 브라우저)
 */
export default async function ContactPage({ searchParams }: { searchParams: Promise<{ lang?: string; sent?: string; e?: string }> }) {
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));
  const t = sayOf(L);
  const sup = await supportConfig();
  const err = sp.e && sp.e in ERR ? t(ERR[sp.e as keyof typeof ERR]) : null;
  const legal = L === "en" ? "/legal/privacy?lang=en" : "/legal/privacy";
  return (
    <div className="pub" lang={L}>
      <header className="pubtop">
        <BrandHome />
        <div className="pubtop-r"><LangSelect current={L} /></div>
      </header>
      <div className="pubwrap spwrap" style={{ maxWidth: 640 }}>
        <div className="sf-head">
          <div className="sf-head-t">
            <h1 className="sf-h1">{t(C.title)}</h1>
            <p className="sf-sub">{t(C.lead)}{L === "en" ? ` ${t(C.langNote)}` : ""}</p>
          </div>
        </div>
        {sp.sent ? <p className="notice ok" role="status">{t(C.ok)}</p> : null}
        {err ? <p className="notice error" role="alert">{err}</p> : null}
        <form action={contactAction} className="sf-form" style={{ display: "grid", gap: 12 }}>
          <input type="hidden" name="lang" value={L} />
          <input type="hidden" name="t" value={Date.now()} />
          {/* 사람 눈에는 보이지 않는 칸(채우면 봇) */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" hidden aria-hidden="true" />
          <label className="sf-field">
            <span>{t(C.topic)}</span>
            <select name="topic" required defaultValue="personal" className="sf-select">
              <option value="personal">{t(C.tPersonal)}</option>
              <option value="mat">{t(C.tMat)}</option>
              <option value="univ">{t(C.tUniv)}</option>
              <option value="partner">{t(C.tPartner)}</option>
            </select>
          </label>
          <label className="sf-field"><span>{t(C.name)}</span><input name="name" required maxLength={80} autoComplete="name" /></label>
          <label className="sf-field"><span>{t(C.email)}</span><input name="email" type="email" required maxLength={200} autoComplete="email" /></label>
          <label className="sf-field"><span>{t(C.message)}</span>
            <textarea name="message" rows={6} maxLength={4000} placeholder={t(C.messageHolder)} /></label>
          <label className="sf-check">
            <input type="checkbox" name="consent" value="1" required />{" "}
            <span>{t(C.consent)} <Link href={legal}>{t(C.privacy)}</Link></span>
          </label>
          <button type="submit" className="sf-btn">{t(C.send)}</button>
        </form>
        {sup.email ? (
          <p className="sf-sub" style={{ marginTop: 16 }}>{t(C.mailDirect)}: <a href={`mailto:${sup.email}`}>{sup.email}</a></p>
        ) : null}
        <p className="sf-sub"><Link href={L === "en" ? "/support?lang=en" : "/support"}>{t(C.support)}</Link></p>
      </div>
      <PublicFooter lang={L} />
    </div>
  );
}
