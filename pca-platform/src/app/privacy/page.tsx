import Link from "next/link";
import { PRIVACY, PRIVACY_VERSION, OPERATOR } from "@/content/privacy";

export const metadata = { title: "개인정보 처리방침 — 단체 PCA" };

/** 방침은 데이터라서 화면은 얇다. 문구를 고칠 때는 content/privacy.ts 만 고친다. */
export default function PrivacyPage() {
  const draft = Object.values(OPERATOR).some((v) => v.includes("⟨"));

  return (
    <main style={{ padding: "32px 20px 80px" }}>
      <article className="sheet doc">
        <div className="top">
          <h1>개인정보 처리방침</h1>
          <div className="meta">
            <span>판 {PRIVACY_VERSION}</span>
          </div>
        </div>

        {draft ? (
          <section>
            <p className="notice error">
              아직 검토를 마치지 않은 초안입니다. 사업자 정보와 위탁처가 채워지고
              법률 검토를 받은 뒤에 효력이 생깁니다.
            </p>
          </section>
        ) : null}

        {PRIVACY.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {s.table ? (
              <div className="table-wrap" style={{ marginTop: 18 }}>
                <table>
                  <thead>
                    <tr>
                      {s.table.head.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((r) => (
                      <tr key={r[0]}>
                        {r.map((c, i) => (
                          <td key={i}>{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ))}

        <div className="sheetfoot">
          {OPERATOR.name} · 대표 {OPERATOR.ceo} · {OPERATOR.address} ·
          사업자등록번호 {OPERATOR.bizNo}
          <br />
          <Link href="/login">로그인으로 돌아가기</Link>
        </div>
      </article>
    </main>
  );
}
