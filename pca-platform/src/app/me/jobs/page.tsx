import Link from "next/link";
import { requireUser } from "@/lib/session";
import { latestResult, postingCount, savedJobCount } from "@/lib/me-v3/platform";
import { domainName } from "@/lib/me-v3/runtime/session";
import { CmShell, CmHead } from "../shell";

export const metadata = { title: "공고 · 내 CareerMatri" };

/**
 * 공고 비교.
 *
 * **1차에서 줄이 없다.** 공고를 모으는 일은 저작권과 이용약관을 따지고
 * 시작해야 하고 그 검토가 끝나지 않았다. 이 쪽이 지금 하는 일은 **흐름과
 * 계약을 적어 두는 것**이다: 들어오는 날 무엇이 어떤 열쇠로 들어오고 내
 * 근거와 어디서 만나는지.
 *
 * **지어낸 숫자를 그리지 않는다.** 자리만 잡아 둔 쪽에 가짜 공고를 세우면
 * 눌러 본 사람이 그것을 진짜로 읽는다.
 */
export default async function Jobs() {
  const user = await requireUser();
  const [postings, saved, result] = await Promise.all([
    postingCount(), savedJobCount(user.id), latestResult(user.id),
  ]);
  const ready = result?.evidence.ready ?? [];
  const gaps = (result?.gaps ?? []).slice(0, 3);

  return (
    <CmShell active="/me/jobs" title="공고">
      {/* **왼쪽 띠에 줄을 두지 않았다.** 이 쪽은 Track 이 켜지는 날의
          자리이고, 지금 혼자 서면 메뉴에 빈 쪽이 하나 늘어난다. 들어오는
          길은 Track 쪽이고 띠에서는 Track 줄이 켜진다 */}
      <CmHead
        kicker="Track · 공고 비교"
        title="내 근거와 공고를 맞춰 보는 자리"
        lead={"공고가 요구하는 일을 기술영역과 판단으로 바꿔 놓고, "
          + "내가 이미 가진 근거와 아직 없는 근거를 가릅니다. Track 이 켜지면 "
          + "이 자리가 혼자 돕니다."}
      />

      <div className="cm-acts" style={{ marginBottom: 18 }}>
        <Link className="cm-btn is-primary" href="/me/track">Track으로 돌아가기</Link>
        <Link className="cm-btn" href="/me/apply">직접 지원한 곳 적기</Link>
      </div>

      {postings === 0 ? (
        <>
          <div className="cm-soon" style={{ marginBottom: 20 }}>
            <b>아직 공고를 모으지 않았습니다.</b> 공고를 모아 쓰는 일은
            저작권과 이용약관을 먼저 따져야 하고, 그 검토가 끝나지 않았습니다.
            가짜 공고를 세워 두지 않는 까닭은 눌러 보신 분이 그것을 진짜로
            읽기 때문입니다.
            <ul>
              <li>직업정보제공사업으로 할 수 있는 것은 공고를 띄우고 직접 지원하는 데까지입니다</li>
              <li>이력서 발송 대행과 취업추천서는 하지 않습니다</li>
              <li>기업 이름을 저장하지 않습니다</li>
            </ul>
          </div>

          <h2 className="cm-h1" style={{ fontSize: 18, margin: "8px 0 12px" }}>
            들어오면 이 차례로 돕니다
          </h2>
          <div className="cm-tablewrap">
            <table className="cm-table">
              <thead><tr><th>걸음</th><th>무엇을 하는가</th><th>지금</th></tr></thead>
              <tbody>
                {[
                  ["1. 수집", "출처와 공고 번호와 올린 날을 함께 받는다", "검토 전"],
                  ["2. 산업 분류", "여덟 산업 가운데 어디인가. 모르면 비운다", "계약 있음"],
                  ["3. 직무 분류", "여덟 역할 가운데 어디인가", "계약 있음"],
                  ["4. 요구 추출", "공고의 문장을 날것으로 남긴다", "계약 있음"],
                  ["5. 옮기기", "기술영역과 판단으로 바꾼다. 근거 등급 없이 담지 않는다", "계약 있음"],
                  ["6. 대조", "내 근거와 견준다", "내 근거는 이미 섰다"],
                  ["7. 자리 변화", "무엇이 메워졌고 무엇이 남았는지", "자동 반영 전"],
                  ["8. 알림", "월간 리포트와 변화 알림", "Track"],
                ].map(([a, b, c]) => (
                  <tr key={a}><td><b>{a}</b></td><td>{b}</td><td>{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="cm-lead">
          견줄 수 있는 공고가 {postings}건 있고 저장하신 것이 {saved}건입니다.
        </p>
      )}

      {ready.length || gaps.length ? (
        <>
          <h2 className="cm-h1" style={{ fontSize: 18, margin: "28px 0 12px" }}>
            공고가 들어오면 이 값과 만납니다
          </h2>
          <div className="cm-grid">
            <div className="cm-card">
              <h2>이미 설명할 수 있는 근거</h2>
              <div className="cm-chips">
                {[...new Set(ready.map((g) => g.domain))].slice(0, 6).map((d) => (
                  <span className="cm-chip is-on" key={d}>{domainName(d)}</span>
                ))}
              </div>
            </div>
            <div className="cm-card">
              <h2>아직 없는 근거</h2>
              <div className="cm-chips">
                {gaps.map((g) => (
                  <span className="cm-chip is-gap" key={g.id}>{domainName(g.domain)}</span>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="cm-acts" style={{ marginTop: 20 }}>
          <Link className="cm-btn is-primary" href="/cores">검사 먼저 하기</Link>
        </div>
      )}
    </CmShell>
  );
}
