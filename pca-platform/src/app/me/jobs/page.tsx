import { wsLang } from "@/lib/me-v3/ws-lang";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { activeMajorName } from "@/lib/me-v3/major-name";
import { latestResult, savedJobCount, activeCoreOrPick } from "@/lib/me-v3/platform";
import { demandOf, MIN_CELL } from "@/lib/jobs/stats";
import { domainName } from "@/lib/me-v3/runtime/session";
import { CmShell, CmHead } from "../shell";

export const metadata = { title: "공고 · 내 CareerMatri" };

const REGION_KO: Record<string, string> = {
  "KR-CAPITAL": "수도권", "KR-CHUNGCHEONG": "충청권", "KR-YEONGNAM": "영남권",
  "KR-HONAM": "호남권", "KR-ETC": "그 밖", "": "근무지 모름",
};

/**
 * 공고 통계.
 *
 * **공고를 우리가 고르지 않는다.** 이 쪽이 보여 주는 것은 공고 한 건이
 * 아니라 **집계**다: 이 전공으로 분류된 공고 가운데 각 기술영역의 일을
 * 묻는 공고가 몇 건인가. 기업 이름은 저장하지 않고 공고를 대신 지원하지도
 * 않는다(직업정보제공사업 범위).
 *
 * **지어낸 숫자를 그리지 않는다.** 공고가 모자라면 표를 세우지 않고 몇 건이
 * 더 모여야 하는지 적는다(`demandOf` 의 `MIN_TOTAL` · `MIN_CELL`). 출처와
 * 기준일 없이 숫자만 서지 않는다.
 */
export default async function Jobs() {
  const user = await requireUser();
  /* **영어 작업공간에는 이 자리가 없다**(`WS_KR_ONLY`). 한국 자료에 서
     있는 쪽이라, 번역해 세우면 해외 손님이 한국 자료를 자기 것으로 읽는다 */
  if ((await wsLang(user.id)) === "en") redirect("/me");
  const major = await activeMajorName(user.id);
  /* 어느 전공의 사전을 읽을지는 **그 사람의 자료**가 정한다 */
  const core = await activeCoreOrPick(user.id);
  const [demand, saved, result] = await Promise.all([
    demandOf(core), savedJobCount(user.id), latestResult(user.id),
  ]);
  const ready = new Set((result?.evidence.ready ?? []).map((g) => g.domain));
  const gapSet = new Set((result?.gaps ?? []).map((g) => g.domain));
  const mine = (d: string) => ready.has(d) ? "설명할 수 있는 경험 있음"
    : gapSet.has(d) ? "더 채울 부분" : result ? "아직 확인 전" : "검사 전";

  return (
    <CmShell active="/me/jobs" title="공고" major={major}>
      <CmHead
        kicker="Track · 공고 통계"
        title="요즘 공고가 묻는 일을 셉니다"
        lead={"이 전공으로 분류된 채용 공고가 어느 기술영역의 일을 묻는지 세고, "
          + "그 옆에 내 현재 상태를 놓습니다. 공고 한 건이 여러 영역을 물으면 "
          + "영역마다 한 번씩 셉니다."}
      />

      <div className="cm-acts" style={{ marginBottom: 18 }}>
        <Link className="cm-btn is-primary" href="/me/track">Track으로 돌아가기</Link>
        <Link className="cm-btn" href="/me/apply">직접 지원한 곳 적기</Link>
      </div>

      {demand.ready ? (
        <>
          <p className="cm-lead">
            {demand.from}부터 {demand.asOf}까지 {demand.sources.join(" · ")}에서 받은
            공고 가운데 이 전공으로 분류된 <b>{demand.total.toLocaleString("ko-KR")}건</b>을
            셌습니다. 저장하신 공고는 {saved}건입니다.
          </p>
          <div className="cm-tablewrap">
            <table className="cm-table">
              <thead>
                <tr><th>기술영역</th><th>이 일을 묻는 공고</th><th>비율</th><th>나</th></tr>
              </thead>
              <tbody>
                {demand.domains.map((d) => (
                  <tr key={d.domain}>
                    <td><b>{domainName(core, d.domain)}</b></td>
                    <td>{d.postings === null ? `${MIN_CELL}건 미만` : `${d.postings.toLocaleString("ko-KR")}건`}</td>
                    <td>{d.share === null ? "" : `${d.share}%`}</td>
                    <td>{mine(d.domain)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cm-chips" style={{ marginTop: 14 }}>
            {demand.regions.map((r) => (
              <span className="cm-chip" key={r.region || "none"}>
                {REGION_KO[r.region] ?? r.region} {r.postings === null ? `${MIN_CELL}건 미만` : `${r.postings}건`}
              </span>
            ))}
          </div>
          <p className="cm-note" style={{ marginTop: 14 }}>
            분류는 공고 제목과 본문의 낱말로 한 것이라 틀릴 수 있습니다. 합격 가능성이나
            인기 순위를 뜻하지 않습니다. 기업 이름은 저장하지 않으며, 지원은 공고를 낸
            곳에 직접 하시면 됩니다. 자료: {demand.sources.join(" · ")}.
          </p>
        </>
      ) : (
        <div className="cm-soon" style={{ marginBottom: 20 }}>
          {demand.total > 0 ? (
            <b>
              이 전공으로 분류된 공고가 {demand.total}건 모였습니다.
              {" "}{demand.min}건이 모이면 통계를 보여 드립니다.
            </b>
          ) : (
            <b>아직 이 전공의 공고를 모으지 않았습니다.</b>
          )}
          {" "}적은 공고로 비율을 내면 한두 건에 크게 흔들려서, 모일 때까지 숫자를
          그리지 않습니다.
          <ul>
            <li>공고는 고용24 오픈 API 에서 하루 한 번 받아 옵니다</li>
            <li>기업 이름은 저장하지 않고, 지원은 공고를 낸 곳에 직접 합니다</li>
            <li>합격 가능성이나 순위는 계산하지 않습니다</li>
          </ul>
        </div>
      )}

      {ready.size || gapSet.size ? null : (
        <div className="cm-acts" style={{ marginTop: 20 }}>
          {/* 쪽 머리에 이미 짙은 단추가 있다(규격 §26) */}
          <Link className="cm-btn" href="/cores">검사 먼저 하기</Link>
        </div>
      )}
    </CmShell>
  );
}
