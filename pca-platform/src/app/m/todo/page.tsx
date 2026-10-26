import { openActions } from "@/lib/me-v3/open-actions";
import { activeCoreOrPick } from "@/lib/me-v3/platform";
import { domainName } from "@/lib/me-v3/runtime/session";
import type { ActionRow } from "@/lib/me-v3/platform";
import { appUser } from "../user";
import { AppHead, Empty, Section } from "../ui";
import { appMoveAction } from "../actions";
import { Icon } from "@/components/sf/icon";

export const metadata = { title: "할 일 · CareerMatri" };

/**
 * 할 일. **할 수 있는 때로 묶는다**(웹 `다음 할 일` 과 같은 기준: 30 · 90 ·
 * 365일). 급한 차례로 세우지 않는 까닭은 `30일 안` 이 마감으로 읽히기
 * 때문이고, 이 값은 마감이 아니다.
 *
 * 왼쪽 동그라미 하나가 끝냄이다. 손가락 하나로 끝내고, 잘못 눌렀으면 끝낸
 * 목록에서 되돌린다.
 */
const GROUPS: { title: string; test: (h: number) => boolean }[] = [
  { title: "이번 달에 할 수 있는 일", test: (h) => h <= 30 },
  { title: "다음 학기 전에", test: (h) => h > 30 && h <= 90 },
  { title: "올해 안에", test: (h) => h > 90 },
];

export default async function Todo() {
  const user = await appUser();
  const [act, core] = await Promise.all([openActions(user.id), activeCoreOrPick(user.id)]);
  const open = act.rows.filter((r) => r.state === "open" || r.state === "doing");
  const done = act.rows.filter((r) => r.state === "done");

  return (
    <>
      <AppHead title="할 일" kicker={act.fromResult ? "결과지가 낸 할 일" : "담아 둔 할 일"} />
      <div className="ma-body">
        {!act.rows.length ? (
          <Empty title="아직 할 일이 없어요"
            cta={{ href: "/cores", label: "검사 시작" }}>
            검사를 마치면 결과에서 나온 할 일이 여기 모입니다.
          </Empty>
        ) : null}

        {GROUPS.map((g) => {
          const rows = open.filter((r) => g.test(r.horizon));
          if (!rows.length) return null;
          return (
            <Section key={g.title} title={g.title}>
              <div className="ma-list">
                {rows.map((r) => <Task key={r.id} r={r} core={core} />)}
              </div>
            </Section>
          );
        })}

        {done.length ? (
          <Section title={`끝낸 일 ${done.length}`}>
            <div className="ma-list">
              {done.slice(0, 8).map((r) => <Task key={r.id} r={r} core={core} />)}
            </div>
          </Section>
        ) : null}
      </div>
    </>
  );
}

function Task({ r, core }: { r: ActionRow; core: string }) {
  const isDone = r.state === "done";
  const hidden = (state: string) => (
    <>
      <input type="hidden" name="id" value={r.id} />
      <input type="hidden" name="state" value={state} />
      <input type="hidden" name="body" value={r.body} />
      <input type="hidden" name="td" value={r.td_code ?? ""} />
    </>
  );
  return (
    <div className={`ma-task${isDone ? " is-done" : ""}`}>
      <form action={appMoveAction}>
        {hidden(isDone ? "open" : "done")}
        <button type="submit" className={`ma-check${isDone ? " is-done" : ""}`}
          aria-label={isDone ? "다시 할 일로 되돌리기" : "끝냈어요"}>
          <Icon name="check" size={16} />
        </button>
      </form>
      <div className="ma-task-body">
        <p>{r.body}</p>
        <div className="ma-meta">
          {r.td_code ? <span className="ma-chip">{domainName(core, r.td_code)}</span> : null}
          {r.state === "doing" ? <span className="ma-chip is-blue">하는 중</span> : null}
          {!isDone && r.state !== "doing" ? (
            <form action={appMoveAction}>
              {hidden("doing")}
              <button type="submit" className="ma-link-btn">시작했어요</button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
