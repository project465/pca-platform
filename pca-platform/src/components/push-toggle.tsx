"use client";

import { useEffect, useState } from "react";

/**
 * MAT 설정의 `이 기기로 알림 받기`. 메일과 따로 켜고 끈다.
 *
 * **기기마다 따로다.** 휴대전화에서 켜도 노트북에는 뜨지 않는다: 구독은
 * 브라우저 하나에 붙는다. 그래서 상태를 서버 값이 아니라 **이 브라우저의
 * 구독**으로 읽는다.
 *
 * 아이폰은 홈 화면에 설치한 뒤에만 알림을 받을 수 있다(iOS 16.4 이상).
 * 사파리 탭에서는 켤 수 없으므로 그 사실과 설치하는 길을 적는다.
 */
type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "busy" | "error";

const toKey = (b64u: string): Uint8Array => {
  const pad = "=".repeat((4 - (b64u.length % 4)) % 4);
  const raw = atob((b64u + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export function PushToggle({ publicKey }: { publicKey: string }) {
  const [s, setS] = useState<State>("loading");

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches
        || (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setS(ios && !standalone ? "ios-install" : "unsupported"); return;
      }
      if (Notification.permission === "denied") { setS("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setS(sub ? "on" : "off");
    })().catch(() => setS("unsupported"));
  }, []);

  async function turnOn() {
    setS("busy");
    try {
      const p = await Notification.requestPermission();
      if (p !== "granted") { setS(p === "denied" ? "denied" : "off"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) as BufferSource });
      const j = sub.toJSON();
      const r = await fetch("/api/push", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys }),
      });
      if (!r.ok) { await sub.unsubscribe().catch(() => undefined); setS("error"); return; }
      setS("on");
    } catch { setS("error"); }
  }

  async function turnOff() {
    setS("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => undefined);
        await sub.unsubscribe().catch(() => undefined);
      }
      setS("off");
    } catch { setS("error"); }
  }

  const title = s === "on" ? "이 기기 알림 받음" : "이 기기 알림 받지 않음";
  const say: Record<State, string> = {
    loading: "이 기기의 알림 상태를 확인하고 있습니다.",
    unsupported: "이 브라우저는 웹 알림을 지원하지 않습니다. 메일 알림을 쓰시면 됩니다.",
    "ios-install": "아이폰은 홈 화면에 설치한 CareerMatri 에서만 알림을 켤 수 있습니다. 사파리 아래쪽 공유 단추를 누르고 '홈 화면에 추가'를 고른 뒤, 홈 화면 아이콘으로 열어 여기서 켜 주세요.",
    denied: "이 브라우저에서 알림이 막혀 있습니다. 주소창 왼쪽 자물쇠 아이콘에서 알림을 허용하면 켤 수 있습니다.",
    off: "주에 한 번 할 일 하나와, 붙여 둔 공고의 마감이 가까울 때 알려 드립니다. 이 기기에만 해당합니다.",
    on: "할 일과 마감 알림이 이 기기에 뜹니다. 알림에는 이름이나 결과를 적지 않습니다.",
    busy: "잠시만 기다려 주세요.",
    error: "알림을 켜지 못했습니다. 잠시 뒤 다시 눌러 주세요.",
  };
  const canAct = s === "on" || s === "off" || s === "error";

  return (
    <>
      <p className="cm-row" style={{ marginTop: 12 }}>
        <b>{title}</b>
        <span>{say[s]}</span>
      </p>
      {canAct ? (
        <div className="cm-acts">
          <button className="cm-btn" type="button" onClick={s === "on" ? turnOff : turnOn}>
            {s === "on" ? "이 기기 알림 끄기" : "이 기기로 알림 받기"}
          </button>
        </div>
      ) : null}
    </>
  );
}
