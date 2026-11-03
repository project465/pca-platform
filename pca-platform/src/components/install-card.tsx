"use client";

import { useEffect, useState } from "react";

/**
 * `홈 화면에 설치` 안내 한 칸(PWA 1단계).
 *
 * **설치할 수 있을 때만 선다.** 이미 설치한 창에서 열었거나, 브라우저가
 * 설치를 받지 않으면 아무것도 그리지 않는다: 누를 수 없는 안내를 세우면
 * 화면에 할 일이 하나 늘 뿐이다. 아이폰 사파리는 설치 단추를 주지 않아
 * 공유 단추로 가는 길을 글로 적는다.
 */
type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const T = {
  ko: {
    title: "홈 화면에 CareerMatri 설치",
    body: "앱처럼 아이콘으로 열고, MAT 할 일 알림을 휴대전화로 받을 수 있습니다. 스토어를 거치지 않고 저장 공간도 거의 쓰지 않습니다.",
    ios: "사파리 아래쪽 공유 단추를 누르고 '홈 화면에 추가'를 고르세요.",
    btn: "설치하기",
    done: "설치했습니다. 홈 화면 아이콘으로 열어 주세요.",
  },
  en: {
    title: "Install CareerMatri on your home screen",
    body: "Open it from an icon like an app. No app store, and it takes almost no storage.",
    ios: "In Safari, tap the Share button and choose 'Add to Home Screen'.",
    btn: "Install",
    done: "Installed. Open it from your home screen.",
  },
};

export function InstallCard({ lang = "ko" }: { lang?: "ko" | "en" }) {
  const t = T[lang];
  const [mode, setMode] = useState<"none" | "prompt" | "ios" | "done">("none");
  const [ev, setEv] = useState<Prompt | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) setMode("ios");
    const on = (e: Event) => { e.preventDefault(); setEv(e as Prompt); setMode("prompt"); };
    const installed = () => setMode("done");
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", on);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (mode === "none") return null;
  return (
    <div className="cm-panel is-one" data-install={mode}>
      <div className="cm-pane">
        <p className="cm-row">
          <b>{t.title}</b>
          <span>{mode === "done" ? t.done : mode === "ios" ? `${t.body} ${t.ios}` : t.body}</span>
        </p>
        {mode === "prompt" && ev ? (
          <div className="cm-acts">
            <button className="cm-btn" type="button" onClick={async () => {
              await ev.prompt().catch(() => undefined);
              const c = await ev.userChoice.catch(() => ({ outcome: "dismissed" }));
              setEv(null);
              setMode(c.outcome === "accepted" ? "done" : "none");
            }}>{t.btn}</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
