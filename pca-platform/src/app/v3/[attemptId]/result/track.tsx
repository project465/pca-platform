"use client";

import { useEffect } from "react";

/**
 * 파일럿에서 **어디를 보고 어디를 안 봤는지**를 적는다.
 *
 * 파일럿이 답해야 하는 물음 가운데 설문으로 못 받는 것이 둘이다. `가장
 * 먼저 본 부분` 과 `끝내 읽지 않은 부분`. 사람은 자기가 안 읽은 자리를
 * 기억하지 못한다. 그래서 절이 화면에 올라온 적이 있는지만 적는다.
 *
 * 적는 것은 **절 이름뿐**이다. 머문 시간도 스크롤 깊이도 마우스 자취도
 * 적지 않는다. 그 셋은 이 파일럿이 고칠 수 있는 것을 알려주지 않으면서
 * 사람의 하루를 적는다.
 *
 * 참가자가 아니면 서버가 받고 버린다. 화면은 그것을 모른 채로 둔다 —
 * 참가자인지 아닌지가 화면 코드에 들어가면 그 판단이 두 군데가 된다.
 */
export default function Track({ attemptId }: { attemptId: string }) {
  useEffect(() => {
    const send = (kind: string, refs: string[]) => {
      if (!refs.length && kind !== "result_open") return;
      void fetch("/api/v3/pilot/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attemptId, kind, refs }),
      })
        /* **답을 읽지 않으면 요청이 안 끝난다.** 본문을 그냥 두면 브라우저가
           그 줄을 연 채로 들고 있어서, 쪽이 영영 `다 읽었다` 가 되지 않는다.
           캡처 도구가 그 자리에서 멈춰 서서 알았다 */
        .then((r) => r.body?.cancel())
        .catch(() => {});
    };

    send("result_open", []);

    /**
     * 본 절을 **모아서 한 번에** 보낸다.
     *
     * 절마다 따로 보냈더니 쪽을 한 번 굴리는 동안 아홉 벌이 한꺼번에
     * 날아가 서로 줄을 섰다. 재는 일이 읽는 일을 느리게 만들면 그
     * 파일럿은 읽는 속도를 재고 있는 것이 아니다.
     */
    const seen = new Set<string>();
    let waiting: string[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      timer = null;
      const refs = waiting;
      waiting = [];
      send("section_view", refs);
    };

    const io = new IntersectionObserver((rows) => {
      for (const r of rows) {
        const id = r.target.id;
        if (!r.isIntersecting || !id || seen.has(id)) continue;
        seen.add(id);
        waiting.push(id);
      }
      if (waiting.length && !timer) timer = setTimeout(flush, 1500);
    }, { threshold: 0.3 });
    for (const el of document.querySelectorAll("section[id]")) io.observe(el);

    /* 창을 닫기 전에 남은 것을 보낸다. 마지막 절이 늘 빠지면 `끝까지
       읽지 않는다` 로 읽히고, 그것은 사실이 아니다 */
    const onHide = () => {
      if (!waiting.length) return;
      const body = JSON.stringify({ attemptId, kind: "section_view", refs: waiting });
      waiting = [];
      navigator.sendBeacon?.("/api/v3/pilot/track", new Blob([body], { type: "application/json" }));
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest("[data-action-id]");
      const id = el?.getAttribute("data-action-id");
      if (id) send("action_click", [id]);
    };
    document.addEventListener("click", onClick);

    return () => {
      if (timer) clearTimeout(timer);
      io.disconnect();
      document.removeEventListener("click", onClick);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [attemptId]);

  return null;
}
