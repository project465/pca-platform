import Link from "next/link";
import { requireUser } from "@/lib/session";
import { matAccess } from "@/lib/mat-access";
import { postingsForMe } from "@/lib/assistant/match";
import { CmShell, CmHead } from "../../shell";
import { SectionHeader } from "../../ui";
import { addPosting } from "../actions";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: "내 자료로 공고 찾기 · MAT · CareerMatri" };
}

/** 기간권 없이 보이는 줄 수. 나머지는 몇 건 더 있는지만 적는다 */
const FREE_SHOW = 3;

const REGION_KO: Record<string, string> = {
  "KR-CAPITAL": "수도권", "KR-CHUNGCHEONG": "충청권", "KR-YEONGNAM": "영남권", "KR-HONAM": "호남권", "KR-ETC": "그 밖",
};
const SOURCE_KO: Record<string, string> = { work24: "고용24", jobindustry: "잡인더스트리" };

/**
 * 내 자료로 공고 찾기(2026-10-31). 올린 자료와 적어 둔 경험이 모아 둔 공고의
 * 요구와 얼마나 겹치는지 보여 준다(`match.ts`). **추천하지 않고 합격 가능성을
 * 내지 않는다**: 무엇이 겹쳤는지를 낱말 그대로 적고, 지원은 원문에서 직접 한다.
 */
export default async function JobsForMe() {
  const user = await requireUser();
  const [acc, m] = await Promise.all([matAccess(user.id), postingsForMe(user.id)]);
  const shown = acc.paid ? m.rows : m.rows.slice(0, FREE_SHOW);
  const hidden = m.rows.length - shown.length;
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const leftDays = (d: string) => Math.round((new Date(`${d}T00:00:00+09:00`).getTime() - today.getTime()) / 86_400_000);

  return (
    <CmShell active="/me/track" title="MAT">
      <CmHead kicker="AI 취업비서 · MAT" title="내 자료로 공고 찾기"
        lead="올린 자료와 적어 둔 경험에서 뽑은 낱말이 공고의 요구와 겹치는 차례로 세웠습니다. 겹친 낱말을 그대로 적어 두었고, 지원은 공고 원문에서 직접 하시면 됩니다." />

      {!m.terms.length ? (
        <div className="cm-panel is-one">
          <div className="cm-pane">
            <p className="cm-row">
              <b>먼저 자료를 올려 주세요</b>
              <span>논문·발표 자료·이력서·자기소개서를 하나 올리면 그 안의 분야·방법·장비 낱말로 공고를 찾습니다.</span>
            </p>
            <div className="cm-acts"><Link className="cm-btn is-primary" href="/me/track/research">내 자료 올리기</Link></div>
          </div>
        </div>
      ) : (
        <p className="cm-none">찾는 낱말: {m.terms.slice(0, 24).join(" · ")}</p>
      )}

      <SectionHeader icon="log" title="겹치는 공고"
        sub={m.pool ? `마감 전 공고 ${m.pool}건 가운데 ${m.rows.length}건이 겹칩니다` : "아직 모아 둔 공고가 없습니다"} />
      {!m.pool ? (
        <p className="cm-none">공고를 모으는 중입니다. 잡인더스트리 공고가 이어지면 이 자리가 채워집니다. 그 전에는 직접 찾은 공고를 MAT 첫 화면에 붙여 비교해 보실 수 있습니다.</p>
      ) : null}
      {shown.map((p) => {
        const left = p.closes_on ? leftDays(p.closes_on) : null;
        return (
          <div className="cm-panel is-one" key={p.id} style={{ marginBottom: 12 }}>
            <div className="cm-pane">
              <p className="cm-kicker">
                {SOURCE_KO[p.source] ?? p.source}
                {p.region_code ? ` · ${REGION_KO[p.region_code] ?? "그 밖"}` : ""}
                {left === null ? " · 마감 미기재" : left === 0 ? " · 오늘 마감" : ` · 마감 ${left}일 전`}
              </p>
              <p className="cm-row"><b>겹친 낱말 {p.hits.length}개{p.tdHits.length ? ` · 겹친 기술영역 ${p.tdHits.length}개` : ""}</b>
                <span>{p.hits.join(" · ")}</span></p>
              {p.requirements.length ? (
                <dl className="cm-dl">
                  <div><dt>공고의 요구</dt><dd>{p.requirements.map((r, i) => <span key={i} style={{ display: "block" }}>· {r}</span>)}</dd></div>
                </dl>
              ) : null}
              <div className="cm-acts" style={{ marginTop: 10 }}>
                {p.source_url ? <a className="cm-btn" href={p.source_url} target="_blank" rel="noopener noreferrer">공고 원문 보기</a> : null}
                <form action={addPosting}>
                  <input type="hidden" name="label" value={`${SOURCE_KO[p.source] ?? p.source} 공고 ${p.id}`} />
                  <input type="hidden" name="deadline" value={p.closes_on ?? ""} />
                  <input type="hidden" name="text" value={p.requirements.join("\n")} />
                  <button className="cm-btn is-primary" type="submit">내 경험과 비교하기</button>
                </form>
              </div>
            </div>
          </div>
        );
      })}
      {hidden > 0 ? (
        <div className="cm-panel is-one">
          <div className="cm-pane">
            <p className="cm-row">
              <b>겹치는 공고가 {hidden}건 더 있습니다</b>
              <span>기간권을 고르시면 전부 보이고, 새로 겹치는 공고가 올라오면 알려 드립니다.</span>
            </p>
            <div className="cm-acts"><Link className="cm-btn is-primary" href="/me/track#plans">기간권 보기</Link></div>
          </div>
        </div>
      ) : null}
    </CmShell>
  );
}
