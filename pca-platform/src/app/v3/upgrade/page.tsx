import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { attemptOf, newScreensAfterUpgrade } from "@/lib/me-v3/runtime/session";
import { upgradeTarget } from "@/lib/me-v3/upgrade";
import { core as coreEntry } from "@/lib/me-v3/core-registry";
import BrandHome from "@/components/sf/brand-home";
import { upgradeAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * 산 등급으로 지난 검사를 넓히기 전에 **무엇이 달라지는지 먼저 적는다.**
 *
 * 결제를 마치고 전공 고르기를 지나 여기로 온다(`/v3/start` 가 넓힐 응시가
 * 있으면 이리로 보낸다). 눌러야 넓어진다: 들어오기만 해도 등급이 바뀌면
 * 링크 미리보기 한 번이 응시를 다시 연다.
 */
export default async function UpgradePage() {
  const user = await requireUser();
  const t = await upgradeTarget(user.id);
  if (!t) redirect("/cores");
  const a = await attemptOf(t.attemptId, user.id);
  if (!a) redirect("/cores");
  /* 새로 묻는 화면 수는 **넓힌 뒤의 계획을 실제로 세워** 센다. 심화 영역은
     넓힐 때 다시 고르므로 여기 수는 많게는 한두 화면 달라질 수 있다 */
  const { added, answered } = await newScreensAfterUpgrade({ ...a, tier: t.to }, t.from)
    .catch(() => ({ added: [], answered: 0 }));
  let major = "전공";
  try { major = coreEntry(t.coreCode).name_ko; } catch { /* 등록부에 없으면 일반 말 */ }

  return (
    <div className="pub">
      <header className="pubtop"><BrandHome /></header>
      <div className="pubwrap">
        <section className="asdone">
          <div className="sf-eyebrow">{major} · {t.from} → {t.to}</div>
          <h1 className="sf-h1" style={{ marginTop: 10 }}>지난 검사를 {t.to}로 넓힙니다</h1>
          <p className="sf-sub">
            처음부터 다시 풀지 않아도 돼요. 앞에서 답한 {answered}개는 그대로 두고,
            {added.length ? ` 새로 묻는 화면 ${added.length}개만` : " 새로 묻는 화면만"} 이어서
            풀면 됩니다.
          </p>
          <ul className="sf-sub" style={{ marginTop: 14, paddingLeft: 20 }}>
            <li>{t.from} 결과지는 그날 받은 그대로 남아 있습니다.</li>
            <li>다 풀면 {t.to} 결과지가 새로 만들어지고,{t.to === "PRO" ? " 70쪽 안팎의 PDF 책도 함께 받을 수 있습니다." : " 웹 결과와 A4 PDF 로 받습니다."}</li>
            <li>중간에 닫아도 답한 것은 저장되어 이어서 풀 수 있어요.</li>
          </ul>
          <form action={upgradeAction} style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="sf-btn accent">{t.to}로 이어서 풀기</button>
            <Link href={`/v3/${t.attemptId}/result`} className="sf-btn ghost">지난 결과 먼저 보기</Link>
          </form>
        </section>
      </div>
    </div>
  );
}
