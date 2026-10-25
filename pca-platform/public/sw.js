/* CareerMatri 서비스 워커 (PWA 1단계).

   하는 일은 셋뿐이다.
   1. 연결이 끊겼을 때 쪽 대신 `/offline.html` 을 보여 준다
   2. 웹 알림(MAT 할 일 · 공고 마감)을 띄운다
   3. 알림을 누르면 그 자리를 연다

   **로그인한 뒤의 쪽을 저장해 두지 않는다.** 결과지 · 경험 · 할 일을 기기에
   쌓아 두면 공용 PC 나 남이 빌린 휴대전화에서 다음 사람이 연결을 끊고 열어
   볼 수 있다. 저장하는 것은 연결 끊김 안내 한 장과 아이콘뿐이다.

   판본을 올리면(`VERSION`) 옛 저장분을 지운다. */
const VERSION = "cm-sw-1";
const KEEP = ["/offline.html", "/brand/careermatri/mark.svg", "/brand/careermatri/app-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(KEEP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* 쪽을 여는 요청만 본다. 연결이 되면 늘 서버에서 받고(저장하지 않는다),
   끊겼을 때만 안내 한 장을 내준다 */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  event.respondWith(
    fetch(req).catch(() => caches.match("/offline.html", { cacheName: VERSION })
      .then((r) => r || new Response("연결이 끊겼습니다.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }))),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  const title = typeof data.title === "string" && data.title ? data.title : "CareerMatri";
  const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/me";
  event.waitUntil(self.registration.showNotification(title, {
    body: typeof data.body === "string" ? data.body : "",
    icon: "/brand/careermatri/app-192.png",
    badge: "/brand/careermatri/app-192.png",
    tag: typeof data.tag === "string" ? data.tag : "careermatri",
    data: { url },
  }));
});

/* 알림을 누르면 이미 열린 창이 있으면 그 창으로, 없으면 새로 연다.
   **우리 주소만 연다**: 알림 안의 주소가 바깥을 가리키면 `/me` 로 간다 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || "/me";
  const target = new URL(path.startsWith("/") ? path : "/me", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
    for (const w of wins) {
      if (new URL(w.url).origin === self.location.origin && "focus" in w) {
        w.navigate(target).catch(() => undefined);
        return w.focus();
      }
    }
    return self.clients.openWindow(target);
  }));
});
