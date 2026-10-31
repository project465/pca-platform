/*
 * 잡인더스트리 · AI 취업 도우미 떠 있는 단추 (CareerMatri MAT)
 *
 * 붙이는 법: 잡인더스트리 공통 하단(또는 머리) 코드 칸에 한 줄.
 *   <script src="https://app.careermatri.com/embed/jobindustry.js" defer></script>
 *
 * - 화면 오른쪽 아래에 단추 하나를 띄운다. 누르면 같은 탭에서 지금 보던 화면 주소를
 *   들고 CareerMatri 로 간다(/from/jobindustry?job=…). 공고 화면이면 MAT 이 그 공고를
 *   읽어 내 경험과 비교해 보고, 아니면 소개 쪽이 열린다.
 * - 쿠키를 읽지 않고, 아무것도 보내지 않는다. 단추를 누를 때만 주소 하나가 넘어간다.
 * - 이 파일은 CareerMatri 가 고친다. 잡인더스트리 쪽에서 다시 붙일 일이 없다.
 * - 끄려면: 단추를 붙인 <script> 에 data-off 를 달거나 줄을 지운다.
 *   글자를 바꾸려면: data-label="AI 취업 도우미"
 *   왼쪽에 두려면: data-side="left"
 *
 * **지금은 숨겨 둔다**(2026-10-31 대표 지시: 제휴 화면을 다시 쓸 때까지 내린다).
 * 잡인더스트리 주소 끝에 `?cm_preview=1` 을 붙여 열면 그 탭에서만 단추가 보인다
 * (탭을 닫을 때까지 기억한다. `?cm_preview=0` 으로 끈다). 다시 열 때는 아래 PUBLIC 을 true 로.
 */
(function () {
  var PUBLIC = false;
  var me = document.currentScript;
  if (!me || me.hasAttribute("data-off") || document.getElementById("cm-mat-fab")) return;
  if (!PUBLIC) {
    var preview = false;
    try {
      var q = new URLSearchParams(location.search).get("cm_preview");
      if (q === "1") sessionStorage.setItem("cm_preview", "1");
      if (q === "0") sessionStorage.removeItem("cm_preview");
      preview = sessionStorage.getItem("cm_preview") === "1";
    } catch (e) { preview = /[?&]cm_preview=1(&|$)/.test(location.search); }
    if (!preview) return;
  }
  var base = "https://app.careermatri.com";
  try { base = new URL(me.src).origin; } catch (e) { /* 그대로 */ }
  var label = me.getAttribute("data-label") || "AI 취업 도우미";
  var left = me.getAttribute("data-side") === "left";

  function mount() {
    if (document.getElementById("cm-mat-fab")) return;
    var a = document.createElement("a");
    a.id = "cm-mat-fab";
    a.href = base + "/from/jobindustry?job=" + encodeURIComponent(location.href);
    a.setAttribute("aria-label", label + " 열기");
    a.textContent = label;
    var s = a.style;
    s.position = "fixed"; s.zIndex = "2147483000";
    s.bottom = "calc(20px + env(safe-area-inset-bottom, 0px))";
    s[left ? "left" : "right"] = "20px";
    s.boxSizing = "border-box"; s.height = "48px"; s.padding = "0 18px"; s.borderRadius = "999px";
    s.background = "#2556ea"; s.color = "#fff";
    s.font = "600 15px/1.2 Pretendard, 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";
    s.textDecoration = "none"; s.boxShadow = "0 6px 18px rgba(16, 32, 80, .28)";
    s.whiteSpace = "nowrap"; s.display = "inline-flex"; s.alignItems = "center"; s.margin = "0";
    /* 주소는 누르는 순간의 것을 쓴다: 한 화면 안에서 공고를 바꿔 보는 사이트도 있다 */
    a.addEventListener("click", function () {
      a.href = base + "/from/jobindustry?job=" + encodeURIComponent(location.href);
    });
    document.body.appendChild(a);
  }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
