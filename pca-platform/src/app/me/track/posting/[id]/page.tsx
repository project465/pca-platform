import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { activeMajorName } from "@/lib/me-v3/major-name";
import { activeCoreOrPick } from "@/lib/me-v3/platform";
import { activeTrack } from "@/lib/track";
import { itemDomainKo, postingOf, type ItemStatus } from "@/lib/assistant/posting";
import { CmShell, CmHead } from "../../../shell";
import { SectionHeader } from "../../../ui";
import { changePostingState } from "../../actions";

export const metadata = { title: "공고 확인 · AI 취업비서" };

/**
 * 붙여 넣은 공고 하나와 내 경험을 맞대 본 결과.
 *
 * **합격 가능성을 적지 않는다.** 요구 항목마다 넷 가운데 하나를 적고 그
 * 수를 더해 점수 하나로 만들지 않는다. 비어 있는 줄에는 그 영역의 경험을
 * 적는 길을 붙인다.
 *
 * **남의 것은 열리지 않는다.** 번호와 로그인한 사람으로 함께 거른다.
 */

const STATUS: Record<ItemStatus, { label: string; why: string }> = {
  ready: { label: "설명할 경험 있음", why: "결과에서 근거가 선 영역입니다." },
  partial: { label: "정리가 덜 됨", why: "해 본 일은 있는데 직접 정한 것이나 남긴 것이 아직 적혀 있지 않습니다." },
  empty: { label: "아직 없음", why: "이 영역의 경험이 아직 기록에 없습니다." },
  unmapped: { label: "전공 밖 조건", why: "학력·연차·어학처럼 경험 기록으로 판단하지 않는 조건입니다." },
};

const ORDER: ItemStatus[] = ["empty", "partial", "ready", "unmapped"];

export default async function Posting({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [p, major, core, state] = await Promise.all([
    postingOf(user.id, id), activeMajorName(user.id), activeCoreOrPick(user.id),
    activeTrack(user.id),
  ]);
  if (!p) notFound();
  const a = p.analysis;
  const items = [...a.items].sort(
    (x, y) => ORDER.indexOf(x.status) - ORDER.indexOf(y.status)
      || (x.kind === y.kind ? 0 : x.kind === "must" ? -1 : 1));
  const firstGap = items.find((it) => it.status === "empty" && it.domain)
    ?? items.find((it) => it.status === "partial" && it.domain);

  return (
    <CmShell active="/me/track" title="공고 확인" major={major}>
      <CmHead
        kicker={p.deadline ? `마감 ${p.deadline}` : "마감 미입력"}
        title={p.label}
        lead={a.role ? `공고가 뽑는 자리: ${a.role}` : "공고의 요구 항목을 내 경험과 맞대 봤습니다."}
      />
      {a.note ? <p className="cm-none" role="status">{a.note}</p> : null}

      <SectionHeader icon="check" title="한눈에"
        sub={`설명할 경험 ${a.counts.ready} · 정리가 덜 됨 ${a.counts.partial} · 아직 없음 ${a.counts.empty} · 전공 밖 조건 ${a.counts.unmapped}`} />
      {firstGap?.domain ? (
        <div className="cm-panel is-one">
          <div className="cm-pane">
            <p className="cm-row">
              <b>먼저 채울 줄: {firstGap.text}</b>
              <span>{itemDomainKo(core, firstGap)} 쪽 경험 하나를 적어 두면 이 줄을 설명할 재료가 생깁니다.</span>
            </p>
            <div className="cm-acts">
              <Link className="cm-btn is-primary"
                href={`/me/experience/new?td=${encodeURIComponent(firstGap.domain)}`}>
                이 영역 경험 적기
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <SectionHeader icon="log" title="요구 항목" />
      {items.length ? (
        <div className="cm-tablewrap">
          <table className="cm-table">
            <thead>
              <tr><th>공고의 요구</th><th>구분</th><th>이어지는 영역</th><th>지금 내 상태</th><th>적어 둔 경험</th></tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{it.text}</td>
                  <td>{it.kind === "must" ? "필수" : "우대"}</td>
                  <td>{itemDomainKo(core, it)}</td>
                  <td><b>{STATUS[it.status].label}</b><br /><small>{STATUS[it.status].why}</small></td>
                  <td>
                    {it.evidence.length ? it.evidence.join(" / ")
                      : it.domain && it.status !== "ready" ? (
                        <Link href={`/me/experience/new?td=${encodeURIComponent(it.domain)}`}>경험 적기</Link>
                      ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cm-none">요구 항목을 찾지 못했습니다. 자격 요건과 하는 일이 적힌 부분을 다시 붙여 넣어 주세요.</p>
      )}

      <SectionHeader icon="clock" title="이 공고 상태" />
      <div className="cm-panel is-one">
        <div className="cm-pane">
          <p className="cm-row">
            <b>{p.state === "applied" ? "지원함" : p.state === "closed" ? "닫음" : "보고 있음"}</b>
            <span>보고 있는 공고는 마감 7일 · 3일 · 1일 전에 알림이 옵니다.</span>
          </p>
          {state.on ? (
            <div className="cm-acts">
              {(["watching", "applied", "closed"] as const).filter((s) => s !== p.state).map((s) => (
                <form action={changePostingState} key={s}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="state" value={s} />
                  <button className="cm-btn" type="submit">
                    {s === "watching" ? "다시 보기" : s === "applied" ? "지원했어요" : "닫기"}
                  </button>
                </form>
              ))}
            </div>
          ) : null}
          <p className="cm-none">
            합격 가능성은 적지 않습니다. 이 표는 공고에 적힌 요구와 내 기록을 나란히 놓은 것입니다.
          </p>
          <div className="cm-acts">
            <Link className="cm-btn" href="/me/track">AI 취업비서로</Link>
          </div>
        </div>
      </div>
    </CmShell>
  );
}
