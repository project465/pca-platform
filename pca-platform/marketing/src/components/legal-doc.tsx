import Shell from "@/components/shell";
import { PageHead } from "@/components/visuals";
import type { LegalDoc } from "@/content/types";

/**
 * 법적 문서 한 장을 그린다 — 처리방침 · 이용약관 · 환불·취소 정책.
 *
 * 세 장이 같은 틀을 쓰는 이유는 PG 심사가 이 셋을 함께 보기 때문이다.
 * 하나만 다르게 그려 두면 그 한 장이 다른 사이트에서 가져온 것처럼 보인다.
 *
 * **화면에 "검토 전" 표시를 두지 않는다** (R022 와 같은 규칙). 어디까지
 * 검토됐는지는 원고 파일의 주석에 적는다.
 */
export default function LegalDocPage({ doc }: { doc: LegalDoc }) {
  return (
    <Shell>
      <PageHead label={doc.label} title={doc.heading} />
      <section className="divided">
        <div className="wrap">
          <p className="small" style={{ marginBottom: 34 }}>
            {doc.versionLabel} {doc.version}
          </p>

          {doc.sections.map((s) => (
            <div className="policy" key={s.title}>
              <h2>{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {s.table ? (
                <div className="tablescroll">
                  <table className="stdtable">
                    <thead>
                      <tr>
                        {s.table.head.map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((r, i) => (
                        <tr key={i}>
                          {r.map((c, j) => (
                            <td key={j}>{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ))}

          <p className="small policy-foot">{doc.operator}</p>
        </div>
      </section>
    </Shell>
  );
}
