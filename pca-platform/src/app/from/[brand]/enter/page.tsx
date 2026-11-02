import { notFound } from "next/navigation";
import { currentUser } from "@/lib/session";
import { activeDocs } from "@/lib/consent";
import { txer } from "@/lib/surface-text";
import { isPartner, PARTNERS } from "@/lib/brand";
import { FIELD_KO, openHandoff } from "@/lib/partner/link";
import AuthBrand from "@/components/auth-brand";
import EnterForm from "./enter-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "MAT 시작하기 · CareerMatri", robots: { index: false, follow: false } };

/**
 * 제휴 사이트의 MAT 단추로 온 사람의 첫 화면(`/from/{partner}/enter?t=…`).
 *
 * **넘겨받은 항목을 그대로 보인다.** 무엇을 받았는지 보고 동의하게 한다. 받지 않는 것(연락처 · 주소 ·
 * 사진 · 생년월일 · 회사 이름)도 한 줄로 적는다. 링크를 연 것만으로는 아무 일도 일어나지 않는다:
 * 단추를 눌러야 계정이 만들어지거나 이어지고, 그때 링크를 한 번 쓴다(`actions.ts`).
 */
/** 넘겨받은 칸을 사람이 읽는 차례로(표에 담기면 칸 차례가 바뀌므로 꼴마다 정해 둔다) */
const ORDER: Record<string, string[]> = {
  education: ["school", "major", "grad_year"], certificates: ["name", "acquired"], career_summary: ["period", "role"],
};
function show(k: string, v: unknown): string {
  if (Array.isArray(v)) {
    return v.map((x) => (x && typeof x === "object"
      ? (ORDER[k] ?? Object.keys(x)).map((f) => (x as Record<string, unknown>)[f]).filter(Boolean).join(" · ")
      : String(x))).join(" / ");
  }
  return String(v ?? "");
}

export default async function Enter({ params, searchParams }: {
  params: Promise<{ brand: string }>; searchParams: Promise<{ t?: string; e?: string }>;
}) {
  const { brand } = await params;
  const sp = await searchParams;
  if (!isPartner(brand)) notFound();
  const P = PARTNERS[brand];
  const h = sp.t ? await openHandoff(brand, sp.t) : null;
  const me = await currentUser().catch(() => null);

  if (!h) {
    return (
      <div className="center-wrap"><div className="authwrap">
        <AuthBrand name="CareerMatri" />
        <div className="panel narrow">
          <h1>링크가 끝났습니다</h1>
          <p className="sub">이 링크는 5분 동안 한 번만 쓸 수 있습니다. {P.name}에서 MAT 단추를 다시 눌러 주세요.</p>
          <p className="sub"><a href={P.home}>{P.name}로 돌아가기</a></p>
        </div>
      </div></div>
    );
  }

  const T = txer("ko");
  const docs = await activeDocs("ko");
  const items = docs.map((d) => ({
    id: d.id, title: d.title, required: d.required,
    href: d.body_path ? `/legal/${d.kind}?lang=ko` : null, pending: d.translation_status === "pending",
  }));
  const labels = {
    title: T("cnTitle"), required: T("cnRequired"), optional: T("cnOptional"),
    view: T("cnView"), agreeAll: T("cnAgreeAll"), pending: T("cnPending"), pendingShort: T("cnPendingShort"),
  };
  const got = Object.keys(FIELD_KO).filter((k) => h.profile[k] !== undefined).map((k) => [k, h.profile[k]] as const);

  return (
    <div className="center-wrap"><div className="authwrap">
      <AuthBrand name="CareerMatri" />
      <div className="panel narrow">
        <h1>{h.linked_user ? "MAT으로 이어 갑니다" : `${P.name} 계정과 연결`}</h1>
        <p className="sub">
          {h.linked_user
            ? `${P.name} 계정과 이미 이어진 CareerMatri 계정으로 들어갑니다.`
            : `${P.name}에서 넘겨받은 내용으로 MAT을 시작합니다. 다시 가입하거나 다시 적지 않아도 됩니다.`}
        </p>
        {!h.linked_user ? (
          <>
            <dl className="sf-defs" style={{ marginTop: 18 }}>
              {got.length ? got.map(([k, v]) => (
                <div key={k} className="sf-def"><dt>{FIELD_KO[k]}</dt><dd>{show(k, v)}</dd></div>
              )) : <div className="sf-def"><dt>넘겨받은 항목</dt><dd>없음(회원 번호만)</dd></div>}
            </dl>
            <p className="sub" style={{ marginTop: 10 }}>
              연락처 · 주소 · 사진 · 생년월일 · 회사 이름은 받지 않습니다. 넘겨받은 내용은 연결을 마치면
              이 화면에서 지우고, 계정에는 {P.name} 회원 번호와 연결한 날만 남습니다.
            </p>
          </>
        ) : null}
        <EnterForm partner={brand} token={sp.t!} linked={Boolean(h.linked_user)} me={me ? me.name : null}
          items={items} labels={labels} />
      </div>
    </div></div>
  );
}
