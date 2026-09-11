import type { SiteContent } from "@/content";

/**
 * 약관·방침 화면의 뼈대.
 *
 * 이 문서들은 법이 게시하라고 정한 것이고(전자상거래법 제10조·제13조,
 * 개인정보보호법 제30조), 내용이 사실과 다르면 게시 안 한 것만 못하다.
 * 그래서 우리가 코드로 확인할 수 있는 것(보유기간·파기 절차·환불 조건)만
 * 적고, 사람이 정해야 하는 칸은 비워 두지 않고 "확인 필요" 로 드러낸다.
 */
export type Clause = { title: string; body: string[]; list?: string[] };

export function Policy({
  site,
  label,
  title,
  lead,
  updated,
  clauses,
  reviewNote,
}: {
  site: SiteContent;
  label: string;
  title: string;
  lead: string;
  updated: string;
  clauses: Clause[];
  reviewNote?: string;
}) {
  return (
    <>
      <section className="pagehead">
        <div className="wrap">
          <span className="label-sm">{label}</span>
          <h1>{title}</h1>
          <p className="lead">{lead}</p>
          <p className="small" style={{ marginTop: 12 }}>
            {updated} · {site.brand}
          </p>
        </div>
      </section>

      {reviewNote && (
        <section className="divided">
          <div className="wrap">
            <p className="reviewnote">{reviewNote}</p>
          </div>
        </section>
      )}

      <section className="divided">
        <div className="wrap policy">
          {clauses.map((c, i) => (
            <article key={c.title}>
              <h2>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {c.title}
              </h2>
              {c.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {c.list && (
                <ul>
                  {c.list.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
