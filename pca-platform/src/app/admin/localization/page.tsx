import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import { localizationReport } from "@/lib/localization";
import {
  missingTranslations, missingScaleTranslations, missingFamilyTranslations,
} from "@/lib/me-v2/bank";

export const metadata = { title: "지역화 덮임 · 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

/**
 * 지역화 덮임 진단.
 *
 * 터미널의 `npm run i18n:coverage` 와 **같은 함수**를 부른다
 * (`src/lib/localization.ts`). 두 곳에서 따로 세면 숫자가 갈린다.
 *
 * **화면 하나를 그려 보는 것으로는 덮임을 알 수 없다.** 직무군이 열여섯이고
 * 조직 유형이 일곱이라, 응시자 하나를 그리면 데이터 파일의 일부만 지나간다.
 * 나머지는 다른 응시자가 왔을 때 처음 한국어로 샌다 — 그러면 그 사람이 첫
 * 발견자가 된다. 그래서 여기서는 그리지 않고 **데이터 파일에서 사람이 읽는
 * 칸만** 뽑아 사전과 대조한다.
 *
 * **두 표를 섞지 않는다.** 위는 화면에 나가는 글자이고, 아래는 응시자가
 * 적은 글에서 **무엇을 찾을지**다. 아래가 비면 화면에 한국어가 보이지
 * 않으면서 영어로 적어 주신 분만 공백을 더 받는다 — 눈에 띄지 않는 쪽이
 * 더 위험하다.
 */
export default async function LocalizationPage() {
  const user = await requireRole(["superadmin"]);
  const r = localizationReport();
  const items = missingTranslations("en");
  const scales = missingScaleTranslations("en");
  const fams = missingFamilyTranslations("en");

  const sum = (rows: typeof r.screen) => ({
    total: rows.reduce((a, x) => a + x.total, 0),
    covered: rows.reduce((a, x) => a + x.covered, 0),
  });
  const s = sum(r.screen);
  const m = sum(r.matchers);

  const Rows = ({ rows }: { rows: typeof r.screen }) => (
    <tbody>
      {rows.map((x) => (
        <tr key={`${x.file}-${x.where}`}>
          <td>{x.where}</td>
          <td><code>{x.file}</code></td>
          <td style={{ textAlign: "right" }}>
            {x.covered.toLocaleString()} / {x.total.toLocaleString()}
          </td>
          <td>
            {x.missing.length === 0
              ? "다 덮였습니다"
              : x.missing.slice(0, 3).join(" · ")
                + (x.missing.length > 3 ? ` … 그 밖에 ${x.missing.length - 3}가지` : "")}
          </td>
        </tr>
      ))}
    </tbody>
  );

  return (
    <AdminShell user={user} current="/admin/localization">
      <h1>지역화 덮임</h1>
      <p className="sub">
        터미널의 <code>npm run i18n:coverage</code> 와 같은 값을 읽습니다.
        {r.ok ? " 지금은 다 덮였습니다." : " 아직 빈 자리가 있습니다."}
      </p>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>문항 은행</h2>
        <div className="sf-tw"><table className="sf-table">
          <thead><tr><th>무엇</th><th>영어판이 빠진 것</th></tr></thead>
          <tbody>
            <tr><td>ME_V2 92문항</td><td>{items.length}개</td></tr>
            <tr><td>척도 보기</td><td>{scales.length}개</td></tr>
            <tr><td>직무군 이름 열여섯</td><td>{fams.length}개</td></tr>
          </tbody>
        </table></div>
        {items.length ? (
          <p className="sub">빠진 문항: {items.slice(0, 8).join(" · ")}</p>
        ) : null}
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>화면에 나가는 글자 — {s.covered.toLocaleString()} / {s.total.toLocaleString()}</h2>
        <div className="sf-tw"><table className="sf-table">
          <thead>
            <tr><th>무엇</th><th>파일</th><th style={{ textAlign: "right" }}>덮임</th>
              <th>빠진 것</th></tr>
          </thead>
          <Rows rows={r.screen} />
        </table></div>
        <p className="sub">사전 {r.dictEntries.toLocaleString()}가지.</p>
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>
          경험에서 찾는 말 — {m.covered.toLocaleString()} / {m.total.toLocaleString()}
        </h2>
        <div className="sf-tw"><table className="sf-table">
          <thead>
            <tr><th>무엇</th><th>파일</th><th style={{ textAlign: "right" }}>덮임</th>
              <th>빠진 것</th></tr>
          </thead>
          <Rows rows={r.matchers} />
        </table></div>
        <p className="sub">
          맞추기 어휘 {r.glossaryTerms.toLocaleString()}가지 ·
          영어 낱말 {r.glossaryWords.toLocaleString()}개.
          <b> 사전과 다른 물건입니다</b> — 사전은 화면에 나갈 글자를 바꾸고,
          이쪽은 응시자가 적은 글에서 찾을 말을 늘립니다. 섞으면 검색어가
          번역되어 한국어로 적어 주신 분의 경험이 걸리지 않습니다.
        </p>
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>직무군 영어 이름 — {r.families.covered} / {r.families.total}</h2>
        <p className="sub">
          {r.families.missing.length
            ? `빠진 것: ${r.families.missing.join(" · ")}`
            : "열여섯 전부 짝이 있습니다. 이 표만 사전을 거치지 않습니다 — "
              + "`names-en` 이 짝으로 들어 있어 엔진이 그쪽을 직접 읽습니다."}
        </p>
      </section>
    </AdminShell>
  );
}
