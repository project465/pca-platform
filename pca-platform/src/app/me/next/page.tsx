import Link from "next/link";
import { requireUser } from "@/lib/session";
import { actionsOf, currentState, latestResult, type ActionRow } from "@/lib/me-v3/platform";
import { domainName } from "@/lib/me-v3/runtime/session";
import { domainArtifacts } from "@/lib/me-v3/runtime/domain-facts";
import { gapKo } from "@/lib/me-v3/result/text.ko";
import { mark } from "@/lib/me-v3/workspace-events";
import { CmShell, CmHead } from "../shell";
import { moveAction, pullActions } from "./actions";

export const metadata = { title: "다음 할 일 · CareerMatri" };

/**
 * 다음 할 일.
 *
 * **긴 조언 문서가 아니라 할 수 있는 일 하나다**(규격 §9). 줄마다 넷이
 * 붙는다: 무엇을 할지 · 왜 필요한지 · 어느 빈자리와 이어지는지 · 어떤
 * 경험으로 메우는지. 앞엣것만 적으면 읽는 사람이 **그래서 이걸 왜
 * 하는가**에 스스로 답해야 하고, 그러면 안 한다.
 *
 * **첫 화면에서는 하나만 든다**(규격 §10). 나머지는 `다음에 할 수 있는
 * 것` 과 `나중에` 로 접어 둔다. 여섯 줄을 같은 무게로 세우면 읽는 사람이
 * 고르는 일부터 해야 하고, 고르는 일은 할 일이 아니다.
 *
 * **세 층을 그대로 둔다.** `30일 안` 은 읽는 사람에게 마감으로 읽히는데
 * 이 값은 마감이 아니라 **할 수 있는 때**다.
 */
const LANES = [
  ["NEXT", "다음에 할 수 있는 것", "맡는 일이 생겨야 합니다"],
  ["LATER", "나중에", "앞의 둘이 끝난 뒤입니다"],
] as const;

const lane = (days: number): "NOW" | "NEXT" | "LATER" =>
  (days <= 30 ? "NOW" : days <= 90 ? "NEXT" : "LATER");

export default async function Next(
  { searchParams }: { searchParams: Promise<{ taken?: string }> },
) {
  const user = await requireUser();
  /* 결과지에서 담고 온 사람인가(규격 §16). **`0` 은 고장이 아니다**:
     담는 함수가 영역과 문장으로 보아 두 번 눌러도 늘지 않으므로, 이미
     담아 둔 사람이 다시 누르면 0 이 맞는 답이다. 그 사실을 적지 않으면
     누른 사람이 담기지 않은 줄 안다 */
  const taken = Number((await searchParams).taken);
  const came = Number.isFinite(taken) && taken >= 0;
  const [st, actions, model] = await Promise.all([
    currentState(user.id), actionsOf(user.id), latestResult(user.id),
  ]);
  await mark("action_opened", user.id, { n: actions.length });

  const open = actions.filter((a) => a.state !== "done");
  const done = actions.filter((a) => a.state === "done");
  /* 지금 바로 할 수 있는 것 가운데 첫 줄. 없으면 열린 것 가운데 첫 줄.
     **빈 자리를 세우지 않는다**: 강조할 것이 없으면 그 칸을 안 그린다 */
  const first = open.find((a) => lane(a.horizon) === "NOW") ?? open[0] ?? null;
  const rest = open.filter((a) => a.id !== first?.id);

  /**
   * 그 할 일이 어느 빈자리에서 왔는가.
   *
   * **짐작하지 않는다.** 담을 때 영역과 축을 함께 적어 두었으므로 그
   * 둘로 굳은 결과의 빈자리를 찾는다. 못 찾으면 그 줄을 적지 않는다:
   * 지어낸 까닭은 그 자리에서 가장 그럴듯하게 읽히고 가장 먼저 거짓이
   * 된다.
   */
  const gapOf = (a: ActionRow) => (st.gaps.find((g) =>
    g.domain === a.td_code && (g.axis ?? "") === (a.axis_code ?? "")) ?? null);

  /** 어떤 경험으로 메우는가. 그 영역의 산출물 목록에서 두 개까지 */
  const howOf = (a: ActionRow) =>
    (a.td_code ? domainArtifacts(a.td_code) : []).slice(0, 2);

  return (
    <CmShell active="/me/next" title="다음 할 일">
      <CmHead
        kicker="다음 할 일"
        title={first ? "지금 할 한 가지" : "무엇부터 할지"}
        lead={st.model
          ? "급한 차례가 아니라 할 수 있는 때로 묶었습니다. 하나를 끝내면 그다음이 섭니다."
          : "검사를 한 번 끝내면 결과가 낸 할 일을 여기에 담을 수 있습니다."}
        actions={st.model ? (
          /* **짙은 단추는 쪽에 하나다**(규격 §10). 담을 것이 이미 담겨
             있으면 그 단추를 세우지 않는다: 눌러도 아무 일이 없다 */
          actions.length === 0 ? (
            <form action={pullActions}>
              <button className="cm-btn is-primary" type="submit">
                결과의 할 일 담기
              </button>
            </form>
          ) : (
            <Link className="cm-btn" href="/me/state#gaps">현재 상태 보기</Link>
          )
        ) : (
          <Link className="cm-btn is-primary" href="/cores">기계공학 검사 시작</Link>
        )}
      />

      {came ? (
        <p className="cm-done" role="status">
          {taken > 0
            ? <>결과에서 할 일 {taken}가지를 담았습니다. 아래 첫 줄부터 하시면 됩니다.</>
            : <>결과의 할 일은 이미 담겨 있습니다 · 같은 일이 두 번 쌓이지 않습니다.</>}
        </p>
      ) : null}

      {!st.model ? (
        <div className="cm-soon">
          <b>아직 완료한 검사가 없습니다.</b> 할 일은 검사 결과의 비어 있는
          자리에서 나옵니다.
          <p style={{ marginTop: 10 }}>
            <Link href="/cores">기계공학 검사 시작</Link>
          </p>
        </div>
      ) : actions.length === 0 ? (
        <div className="cm-soon">
          <b>아직 담아 둔 할 일이 없습니다.</b> 위에서 결과의 할 일을
          담으면 할 수 있는 때로 나뉘어 섭니다.
        </div>
      ) : !first ? (
        <div className="cm-soon">
          <b>담아 둔 일을 다 끝내셨습니다.</b> 새 경험을 적어 현재 상태를
          다시 세우면 그다음 할 일이 나옵니다.
          <p style={{ marginTop: 10 }}>
            <Link href="/me/experience/new">경험 추가</Link>
          </p>
        </div>
      ) : (
        <>
          {/* ── 지금 할 한 가지 ──
              **넷을 한 묶음으로 적는다**(규격 §9). 그리고 이 칸에만 테를
              두른다: 아래 접힌 목록과 같은 생김새면 `하나만 강조한다` 가
              화면에서 지켜지지 않는다 */}
          <article className="cm-gap" style={{ marginBottom: 20 }}>
            <h3>{first.body}</h3>
            {(() => {
              const g = gapOf(first);
              const k = g ? gapKo(g, domainName(g.domain)) : null;
              const how = howOf(first);
              return (
                <>
                  {k ? <p><b>왜 필요한가</b> {k.why}</p> : null}
                  {k ? <p><b>어느 자리</b> {k.title}</p> : null}
                  {how.length ? (
                    <p>
                      <b>어떤 경험으로</b> {how.join(" 또는 ")} 가운데 하나를
                      남기면 그 자리가 메워집니다.
                    </p>
                  ) : null}
                </>
              );
            })()}
            {/* **여기서 루프가 이어진다**(규격 §9). 할 일을 읽은 사람이
                다음에 하는 일은 그것을 해 보고 경험으로 적는 것이다 */}
            <div className="cm-acts" style={{ marginTop: 12 }}>
              <Link className="cm-btn is-primary" href="/me/experience/new">
                경험에 추가
              </Link>
              <form action={moveAction}>
                <input type="hidden" name="id" value={first.id} />
                <input type="hidden" name="state" value="done" />
                <button className="cm-btn" type="submit">끝냈습니다</button>
              </form>
            </div>
          </article>

          {/* ── 나머지 ──
              **파란 단추를 더 세우지 않는다**(규격 §10). 줄과 `끝냈습니다`
              까지다 */}
          {rest.length ? (
            <details className="cm-fold">
              <summary>그 밖에 할 일 {rest.length}가지</summary>
              {LANES.map(([key, title, hint]) => {
                const mine = rest.filter((a) => lane(a.horizon) === key);
                /* `지금` 칸에 남은 줄은 첫 묶음 바로 아래에 둔다 */
                const now = key === "NEXT"
                  ? rest.filter((a) => lane(a.horizon) === "NOW") : [];
                const list = [...now, ...mine];
                if (!list.length) return null;
                return (
                  <section className="cm-zone" key={key}>
                    <h3>{title} <em>{hint}</em></h3>
                    <div className="cm-rows">
                      {list.map((a) => (
                        <p className="cm-row" key={a.id}>
                          <b>{a.body}</b>
                          <span className="cm-when">
                            {a.td_code ? domainName(a.td_code) : ""}
                          </span>
                        </p>
                      ))}
                    </div>
                  </section>
                );
              })}
              <p className="cm-none">
                하나를 끝내면 그다음 줄이 위로 올라옵니다. 지금은 첫 줄만
                하시면 됩니다.
              </p>
            </details>
          ) : null}

          {done.length ? (
            <details className="cm-fold">
              <summary>끝낸 일 {done.length}가지</summary>
              <div className="cm-rows">
                {/*
                  **`p` 안에 `form` 을 두지 않는다.** `p` 는 문장 조각만 받는데
                  `form` 은 덩이라, 브라우저가 그것을 `p` 밖으로 끌어낸다.
                  서버가 보낸 것과 브라우저가 세운 것이 달라지고 React 가
                  `#418` 로 멈춘다(화면은 멀쩡해 보이고 눌리는 것만 안 된다).
                */}
                {done.map((a) => (
                  <div className="cm-row" key={a.id}>
                    <b>{a.body}</b>
                    <form action={moveAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="state" value="open" />
                      <button className="cm-btn" type="submit">되돌리기</button>
                    </form>
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          {/* 굳은 결과가 낸 할 일을 더 담을 수 있는가. **머리에 두지
              않는다**: 지금 할 한 가지보다 큰 자리를 먹으면 안 된다 */}
          {model && model.actions.length > actions.length ? (
            <div className="cm-acts" style={{ marginTop: 20 }}>
              <form action={pullActions}>
                <button className="cm-btn" type="submit">결과의 할 일 더 담기</button>
              </form>
            </div>
          ) : null}
        </>
      )}
    </CmShell>
  );
}
