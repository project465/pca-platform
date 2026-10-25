import { wsLang } from "@/lib/me-v3/ws-lang";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { activeMajorName } from "@/lib/me-v3/major-name";
import { activeCoreOrPick, experiencesOf } from "@/lib/me-v3/platform";
import { activeTrack } from "@/lib/track";
import { itemDomainKo, postingOf, type ItemStatus, type PostingItem } from "@/lib/assistant/posting";
import { interviewPrep, smallTasks } from "@/lib/assistant/prep";
import { domainName } from "@/lib/me-v3/runtime/session";
import { AXIS_KO } from "@/lib/me-v3/result/text.ko";
import { CmShell, CmHead } from "../../../shell";
import { SectionHeader } from "../../../ui";
import { changePostingState, takePostingTasks } from "../../actions";

export const metadata = { title: "공고 확인 · MAT" };

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
  unmapped: { label: "전공 밖 조건", why: "학력·자격·근무 여건·태도처럼 경험 기록으로 판단하지 않는 조건입니다." },
};

/**
 * 영역에 잇지 못한 줄은 조건과 따로 적는다. `Git 협업 경험` 같은 줄을 `전공 밖
 * 조건` 으로 적으면 읽는 사람이 그것을 준비하지 않아도 되는 줄로 읽는다.
 */
const UNMATCHED = { label: "영역 확인 필요", why: "이 전공의 업무 영역에 바로 잇지 못한 줄입니다. 어느 경험으로 설명할지 직접 정해 주세요." };
const statusOf = (it: PostingItem) =>
  it.status === "unmapped" && it.reason === "unmatched" ? UNMATCHED : STATUS[it.status];

const ORDER: ItemStatus[] = ["empty", "partial", "ready", "unmapped"];

export default async function Posting({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ taken?: string }>;
}) {
  const { id } = await params;
  const takenRaw = (await searchParams).taken;
  const user = await requireUser();
  /* **영어 작업공간에는 이 자리가 없다**(`WS_KR_ONLY`). 한국 자료에 서
     있는 쪽이라, 번역해 세우면 해외 손님이 한국 자료를 자기 것으로 읽는다 */
  if ((await wsLang(user.id)) === "en") redirect("/me");
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
  const unmatched = items.filter((it) => it.status === "unmapped" && it.reason === "unmatched").length;
  /* 면접 준비와 작은 일은 **분석 순서(공고에 적힌 차례)** 로 만든다. 표의 정렬은
     상태 차례라, 그것으로 고르면 필수 항목 여섯이 늘 `아직 없음` 쪽에서만 나온다 */
  const exps = await experiencesOf(user.id, core);
  const prep = interviewPrep(core, a.items, exps);
  const tasks = smallTasks(core, a.items, exps);
  const taken = takenRaw === undefined ? null : takenRaw === "x" ? -1 : Number(takenRaw);

  return (
    <CmShell active="/me/track" title="공고 확인" major={major}>
      <CmHead
        kicker={p.deadline ? `마감 ${p.deadline}` : "마감 미입력"}
        title={p.label}
        lead={a.role ? `공고가 뽑는 자리: ${a.role}` : "공고의 요구 항목을 내 경험과 맞대 봤습니다."}
      />
      {a.note ? <p className="cm-none" role="status">{a.note}</p> : null}

      <SectionHeader icon="check" title="한눈에"
        sub={`설명할 경험 ${a.counts.ready} · 정리가 덜 됨 ${a.counts.partial} · 아직 없음 ${a.counts.empty} · 전공 밖 조건 ${a.counts.unmapped - unmatched}${unmatched ? ` · 영역 확인 필요 ${unmatched}` : ""}`} />
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
                  <td><b>{statusOf(it).label}</b><br /><small>{statusOf(it).why}</small></td>
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

      <SectionHeader icon="users" title="이 공고로 면접을 본다면"
        sub="필수 항목에서 나올 법한 질문과, 내 기록 가운데 가져갈 경험입니다. 소리 내어 한 번 답해 보세요." />
      {prep.length ? (
        <div className="cm-panel">
          {prep.map((x, i) => (
            <div className="cm-pane" key={i}>
              <h3>{x.question}<em>{x.kind === "must" ? "필수" : "우대"} · {domainName(core, x.domain)} · {AXIS_KO[x.axis]}</em></h3>
              <dl className="cm-dl">
                <div><dt>공고의 요구</dt><dd>{x.text}</dd></div>
                {x.experience ? (
                  <div><dt>가져갈 경험</dt><dd>
                    <Link href={`/me/experience/${encodeURIComponent(x.experience.id)}/edit`}>{x.experience.title}</Link>
                  </dd></div>
                ) : null}
                {x.frame ? <div><dt>답의 뼈대</dt><dd>{x.frame}</dd></div> : null}
                {x.honest ? (
                  <div>
                    <dt>{x.status === "empty" ? "아직 이 영역 경험이 없다면 이렇게 답할 수 있어요" : "적어 둔 경험이 없어요"}</dt>
                    <dd>{x.honest}</dd>
                  </div>
                ) : null}
              </dl>
              {!x.experience ? (
                <div className="cm-acts">
                  <Link className="cm-btn" href={`/me/experience/new?td=${encodeURIComponent(x.domain)}`}>이 영역 경험 적기</Link>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="cm-none">이 공고에서는 경험으로 답할 요구 항목을 찾지 못했습니다. 학력·자격 같은 조건만 적힌 공고일 수 있어요.</p>
      )}
      <p className="cm-note">질문은 공고 문장과 이 전공의 업무 영역으로 만든 예시입니다. 실제 면접에서 이대로 나온다는 뜻은 아니에요.</p>

      <SectionHeader icon="target" title="이번 주에 할 수 있는 작은 일"
        sub="필수 항목 가운데 아직 없음 · 정리가 덜 됨인 줄마다 결과물 하나와 비교할 것 하나를 골랐습니다." />
      <div id="tasks" />
      {taken !== null ? (
        <p className="cm-none" role="status">
          {taken < 0 ? "지금 전공과 다른 전공으로 읽은 공고라 할 일로 담지 않았어요."
            : taken > 0 ? `할 일 ${taken}개를 담았어요. 지금 할 일 쪽에서 이어서 볼 수 있어요.`
              : "이미 담아 둔 할 일이라 새로 늘지 않았어요."}
        </p>
      ) : null}
      {tasks.length ? (
        <div className="cm-panel is-one">
          <div className="cm-pane">
            <dl className="cm-dl">
              {tasks.map((t, i) => (
                <div key={i}><dt>{t.text}</dt><dd>{t.task}</dd></div>
              ))}
            </dl>
            <div className="cm-acts">
              {state.on ? (
                <form action={takePostingTasks}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="cm-btn is-primary" type="submit">할 일 목록에 담기</button>
                </form>
              ) : null}
              <Link className="cm-btn" href="/me/next">지금 할 일 보기</Link>
            </div>
          </div>
        </div>
      ) : (
        <p className="cm-none">필수 항목 가운데 아직 없음이나 정리가 덜 된 줄이 없습니다.</p>
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
            <Link className="cm-btn" href="/me/track">MAT으로</Link>
          </div>
        </div>
      </div>
    </CmShell>
  );
}
