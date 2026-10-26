import { nudgesOf } from "@/lib/assistant/nudges";
import { appUser } from "../user";
import { AppHead, Empty, Row } from "../ui";
import { appReadAll } from "../actions";

export const metadata = { title: "알림 · CareerMatri" };

/**
 * 알림. MAT 밤 당번이 쌓은 줄(`assistant_nudges`)을 그대로 읽는다. 기기
 * 알림은 잠긴 화면에 뜨므로 수도 이름도 적지 않고, 자세한 것은 여기서 본다.
 *
 * **열기만 해서 읽음으로 바꾸지 않는다.** GET 이 표를 고치면 미리 불러오기만
 * 해도 읽은 것이 된다. `모두 읽음` 을 눌렀을 때만 바꾼다.
 */
const when = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));

export default async function Alerts() {
  const user = await appUser();
  const rows = await nudgesOf(user.id, 30);
  const unread = rows.filter((n) => !n.read_at).length;

  return (
    <>
      <AppHead title="알림" back="/m"
        right={unread ? (
          <form action={appReadAll}>
            <button className="ma-link-btn" type="submit">모두 읽음</button>
          </form>
        ) : undefined} />
      <div className="ma-body">
        {!rows.length ? (
          <Empty title="아직 알림이 없어요">
            MAT를 쓰는 동안 이번 주 브리핑과 공고 마감 소식이 여기 모입니다.
          </Empty>
        ) : (
          <div className="ma-list">
            {rows.map((n) => (
              <Row key={n.id} href={n.href ?? "/m/mat"} icon={n.kind.includes("deadline") ? "clock" : "bell"}
                title={n.title} unread={!n.read_at}
                sub={`${n.body} · ${when(n.created_at)}`} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
