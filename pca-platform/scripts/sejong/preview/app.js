/* 세종 시연 화면 미리보기. src/app/sejong/** 의 화면을 그대로 옮겨 브라우저 안에서만 돈다.
 * 서버·DB·PDF 가 없고, 모든 값은 이 페이지 메모리에만 있다(새로고침하면 처음으로). */
(function () {
  "use strict";
  var instrument = D.instrument, axisInfo = D.axisInfo, levels = D.levels;
  var orgs = D.orgs.orgs, orgsMeta = D.orgs, links = D.links, region = D.region;
  var BASE = new Date("2026-10-20T09:00:00+09:00").getTime();
  var DAY = 86400000;
  var MIN_CELL = 5;
  var TOTAL = instrument.sections.reduce(function (n, s) { return n + s.items.length; }, 0);
  var ITEMS = instrument.sections.reduce(function (a, s) { return a.concat(s.items); }, []);

  var VERIFY_LABEL = {
    OFFICIAL_CROSSCHECKED: "공식 출처 2곳 이상 일치", OFFICIAL_SINGLE: "공식 출처 1곳",
    SECONDARY_ONLY: "보도 등 2차 출처만", CONFLICTING: "출처 간 불일치", UNREACHABLE: "출처 확인 불가",
  };
  var LOCATION_LABEL = {
    HQ_IN_SEJONG: "본사 세종", SITE_IN_SEJONG_HQ_ELSEWHERE: "사업장 세종 · 본사 다른 지역", UNCONFIRMED: "소재 확인 필요",
  };
  var ORG_TYPE_LABEL = {
    PRIVATE: "민간 기업", PUBLIC_INSTITUTION: "공공기관", RESEARCH_INSTITUTE: "국책연구기관", LOCAL_PUBLIC_CORP: "지방 공기업·출연기관",
  };
  var PROGRAMS = [
    { code: "SJ-DEMO-A", name: "시연 사업 A · 구직 역량 진단 (가상)", region_rule: "NONE" },
    { code: "SJ-DEMO-B", name: "시연 사업 B · 세종 지역 취업 연계 (가상, 세종 한정)", region_rule: "SEJONG_ONLY" },
  ];
  var COUNSELORS = [{ id: "c1", name: "시연 상담사 1", login: "sj-counsel1" }, { id: "c2", name: "시연 상담사 2", login: "sj-counsel2" }];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function iso(t) { return new Date(t + 9 * 3600000).toISOString().replace("T", " "); }
  function day(t) { return t == null ? "-" : iso(t).slice(0, 10); }
  function minute(t) { return t == null ? "-" : iso(t).slice(0, 16); }
  function areaName(code) { var j = instrument.job_areas.find(function (x) { return x.code === code; }); return j ? j.name : code; }
  function reportable(o) {
    return (o.verify === "OFFICIAL_CROSSCHECKED" || o.verify === "OFFICIAL_SINGLE") && o.location_basis !== "UNCONFIRMED" && o.sejong_sites.length > 0;
  }
  function orgsForAreas(codes, reportableOnly) {
    return orgs.filter(function (o) {
      if (reportableOnly && !reportable(o)) return false;
      var l = links.links[o.id] || [];
      return codes.length === 0 || l.some(function (c) { return codes.indexOf(c) >= 0; });
    });
  }
  function auxAllowed(programCode, profile) {
    var p = PROGRAMS.find(function (x) { return x.code === programCode; });
    if (p && p.region_rule === "SEJONG_ONLY") return false;
    return profile.region_range !== "HOME_ONLY";
  }

  /* ── 가상 참여자 20명: scripts/sejong/seed-demo.mjs 와 같은 씨앗·같은 분포·같은 분석 함수 ── */
  var seed = 20261020;
  function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  var SEED_AREAS = ["JA01", "JA01", "JA02", "JA03", "JA03", "JA04", "JA05", "JA06", "JA06", "JA07", "JA08", "JA08", "JA09", "JA10", "JA11"];
  var AUD = instrument.audiences.options.map(function (o) { return o.code; });
  var RANGE = ["HOME_ONLY", "ADJACENT", "ADJACENT", "ANYWHERE", "UNDECIDED"];
  var KINDS = ["work", "parttime", "intern", "project", "training", "credential", "volunteer"];
  var CHECKS = instrument.experience_checks.map(function (c) { return c.code; });
  var EXP_TITLES = ["물류센터 출고 검수", "카페 매장 운영", "공공기관 행정 인턴", "직업훈련 데이터 분석 과정",
    "제조 현장 생산 보조", "지역 축제 운영 봉사", "사무 보조 계약직", "품질 검사 아르바이트"];
  var plan = [];
  for (var k = 0; k < 4; k++) plan.push("issued");
  for (k = 0; k < 2; k++) plan.push("login");
  for (k = 0; k < 4; k++) plan.push("progress");
  for (k = 0; k < 10; k++) plan.push("scored");

  var people = [];
  plan.forEach(function (state, i) {
    var n = String(i + 1).padStart(2, "0");
    var prog = i < 14 ? "SJ-DEMO-A" : "SJ-DEMO-B";
    var p = {
      id: "v" + n, no: (prog === "SJ-DEMO-A" ? "SJ-A" : "SJ-B") + "-" + String(i + 1).padStart(3, "0"),
      name: "가상 참여자 " + n, program: prog, status: "active", virtual: true,
      counselor: COUNSELORS[i % 2].id, lastLogin: null, consent: null, att: null, exps: [], pdf: 0, views: 0,
    };
    people.push(p);
    if (state === "issued") return;
    p.lastLogin = BASE - (i % 7) * DAY - 3600000;
    if (i % 3 !== 0) p.consent = true;
    if (i === 13) p.consent = false;
    if (state === "login") return;
    var areas = Array.from(new Set([pick(SEED_AREAS), pick(SEED_AREAS)]));
    var profile = { audience: pick(AUD), job_areas: areas, region_range: pick(RANGE), skills: [] };
    var base = Math.floor(rnd() * 3);
    var responses = {};
    ITEMS.forEach(function (it) {
      if (state === "progress" && rnd() < 0.5) return;
      responses[it.code] = Math.max(0, Math.min(3, base + Math.floor(rnd() * 3) - 1));
    });
    var nExp = state === "scored" ? 1 + Math.floor(rnd() * 3) : 0;
    for (var q = 0; q < nExp; q++) {
      var checks = CHECKS.filter(function () { return rnd() < 0.5; });
      p.exps.push({ id: i + "-" + q, kind: pick(KINDS), title: pick(EXP_TITLES), checks: checks, skills: [], job_area: pick(areas), org_name: "", period_text: "", role_text: "" });
    }
    var started = BASE - ((i % 7) + 1) * DAY;
    p.att = { status: state === "progress" ? "in_progress" : "scored", profile: profile, startedAt: started, responses: responses };
    if (state === "scored") {
      p.att.scoredAt = started + 25 * 60000;
      p.att.result = analyze({ instrument: instrument, axisInfo: axisInfo, responses: responses, experiences: p.exps, profile: profile, now: new Date("2026-10-20T00:00:00Z") });
    }
  });

  /* 직접 눌러 볼 구직자 (seed 의 sj-demo01 · SJ-A-000) */
  var me = {
    id: "me", no: "SJ-A-000", name: "시연 구직자", program: "SJ-DEMO-A", status: "active", virtual: false,
    counselor: "c1", lastLogin: null, consent: null, consentAt: null, att: null, attempts: [], exps: [], pdf: 0, views: 0, done: {},
  };
  people.unshift(me);

  var S = { role: "anon", access: [], expSeq: 1, issuedNote: null, saved: {} };

  function latestScored(p) {
    if (p === me) { for (var i = me.attempts.length - 1; i >= 0; i--) if (me.attempts[i].status === "scored") return me.attempts[i]; return null; }
    return p.att && p.att.status === "scored" ? p.att : null;
  }
  function logAccess(actorKind, actorName, target, what, reason) {
    S.access.unshift({ at: Date.now(), actor: actorName, actor_kind: actorKind, target_no: target ? target.no : null, what: what, reason: reason || null });
    if (target && (what === "result_web" || what === "report_web")) target.views++;
  }
  function mask(n) { return n > 0 && n < MIN_CELL ? { n: 0, masked: true } : { n: n, masked: false }; }
  function N(c) { return c.masked ? '<span class="muted" title="5명 미만은 가립니다">5명 미만</span>' : String(c.n); }
  function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) + "%" : "-"; }

  /* ── 화면 조각 ── */
  var STATE_CLS = { CONFIRMED: "ok", PARTIAL: "part", CLAIMED: "brand", EXPOSED: "", NONE: "" };
  function stateBadge(st) { return '<span class="sj-badge ' + STATE_CLS[st] + '">' + esc(STATE_LABEL[st]) + "</span>"; }
  function steps(level, confirmed) {
    var h = '<span class="sj-steps" aria-hidden="true">';
    for (var k = 1; k <= 3; k++) h += "<i" + (k <= level ? ' class="' + (confirmed ? "ev" : "on") + '"' : "") + "></i>";
    return h + "</span>";
  }
  function badge(cls, t) { return '<span class="sj-badge ' + cls + '">' + esc(t) + "</span>"; }
  function A(token, text, cls) { return '<a href="#' + token + '"' + (cls ? ' class="' + cls + '"' : "") + ">" + text + "</a>"; }

  function resultView(r) {
    var regionLabel = (instrument.region_ranges.options.find(function (o) { return o.code === r.profile.region_range; }) || {}).label;
    var h = '<section class="sj-card"><h2>희망 직무에서 본 지금의 나</h2><p class="small muted">총점이나 적합도 숫자는 없습니다. 고른 직무에서 자주 쓰는 판단마다 지금 어디까지 확인됐는지를 적습니다.' +
      (regionLabel ? " 희망 지역 범위: " + esc(regionLabel) + "." : "") + '</p><div class="sj-grid c2">';
    r.areas.forEach(function (ar) {
      h += '<div class="sj-card" style="background:#fbfcfd"><h3>' + esc(ar.name) + '</h3><p class="small muted">' + esc(ar.one_line) + "</p>" +
        '<p class="small">' + badge("ok", "확인 " + ar.counts.confirmed) + " " + badge("brand", "응답만 " + ar.counts.claimed) + " " + badge("", "채울 것 " + ar.counts.to_fill) + "</p>" +
        '<ul class="small" style="margin:6px 0 0;padding-left:18px">' +
        ar.key.map(function (k) { return "<li>" + esc(k.name) + " — " + stateBadge(k.state) + "</li>"; }).join("") + "</ul></div>";
    });
    h += "</div></section>";
    h += '<section class="sj-card"><h2>판단 여덟 갈래</h2><p class="small muted">막대는 진단에서 고른 단계(두 문항 이상이 닿은 단계)이고, 초록은 경험 기록이 받친 칸입니다. 단계 뜻: L1 ' +
      esc(levels.L1) + " · L2 " + esc(levels.L2) + " · L3 " + esc(levels.L3) + "</p>";
    r.axes.forEach(function (a) {
      var ev = a.evidence.length ? '<div class="small muted" style="margin-top:4px">근거: ' + esc(a.evidence.map(function (e) { return e.title; }).join(" · ")) + "</div>"
        : !a.evidence_possible ? '<div class="small muted" style="margin-top:4px">경험 기록으로 확인하는 칸이 없는 판단입니다</div>' : "";
      h += '<div class="sj-axis"><div><b>' + esc(a.name) + '</b><div class="small muted">' + esc(a.question) + "</div></div><div>" +
        steps(a.level, a.state === "CONFIRMED" || a.state === "PARTIAL") + ev + "</div><div>" + stateBadge(a.state) + "</div></div>";
    });
    h += "</section>";
    if (r.quality.flat) h += '<p class="sj-note warn">응답이 한 값에 몰려 있습니다. 결과를 해석하기 전에 상담사와 함께 다시 보기를 권합니다.</p>';
    return h;
  }

  function verifyClass(v) { return v === "OFFICIAL_CROSSCHECKED" ? "ok" : v === "OFFICIAL_SINGLE" ? "brand" : v === "CONFLICTING" ? "warn" : "part"; }
  function orgCard(o) {
    var areas = links.links[o.id] || [];
    var site = o.sejong_sites[0];
    var h = '<div class="sj-card sj-org"><div class="meta">' + badge("", ORG_TYPE_LABEL[o.org_type]) + badge("", LOCATION_LABEL[o.location_basis]) +
      badge(verifyClass(o.verify), VERIFY_LABEL[o.verify]) + badge("warn", "채용 여부 미확인") + (!reportable(o) ? badge("part", "결과지 제외") : "") + "</div>" +
      '<h3 style="margin-top:4px">' + esc(o.name) + '</h3><div class="addr">' +
      (site ? "사업장: " + esc(site.address) + (site.label ? " (" + esc(site.label) + ")" : "") : "세종 사업장 주소 확인 안 됨") +
      (o.hq.address && o.location_basis !== "HQ_IN_SEJONG" ? "<br>본사: " + esc(o.hq.address) : "") + "</div>" +
      '<div class="small">업종·사업: ' + esc(o.industry_text) + "</div>" +
      (areas.length ? '<div class="small muted">이어 볼 직무(시연용 해석): ' + esc(areas.map(areaName).join(" · ")) + "</div>" : "") +
      (o.location_note ? '<div class="small muted">' + esc(o.location_note) + "</div>" : "") +
      "<details><summary>출처 " + o.sources.length + "건 · 확인일 " + esc((o.sources[0] || {}).checked_on || "") + '</summary><ul style="margin:6px 0 0;padding-left:18px">' +
      o.sources.map(function (s) {
        return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title) + "</a> (" + esc(s.kind) + ") — " + esc(s.confirms) + "</li>";
      }).join("") + "</ul>" + (o.notes ? '<p class="small muted" style="margin-top:6px">' + esc(o.notes) + "</p>" : "") + "</details></div>";
    return h;
  }

  /* ── 화면 ── */
  function pageHome() {
    var seen = orgs.filter(function (o) { return o.region_scope === "SEJONG"; });
    var ready = seen.filter(reportable);
    var h = '<section class="sj-hero"><div>' + badge("demo", "시연판 · DEMO") +
      '<h1 style="margin-top:12px">해 온 일로 다음 일을 찾습니다</h1><p class="lead">학과가 아니라 <b>직무와 경험</b>에서 시작하는 세종 구직자용 진단입니다. 일하면서 해 본 것과 남긴 기록을 함께 보고, 세종의 사업장과 직무를 이어 30·60·90일 실행 계획과 개인별 취업 전략 결과지를 드립니다.</p>' +
      '<div class="sj-actions">' + A("login", "참여자 로그인", "sj-btn") + A("explore", "세종 기업·기관 둘러보기", "sj-btn ghost") + "</div></div>" +
      '<div class="sj-hero-side"><b>이렇게 진행합니다</b><ol><li>진흥원이 발급한 계정으로 로그인</li><li>희망 직무와 근무 지역 범위 고르기</li><li>직무 경험 진단 24문항 (약 10분, 바로 저장)</li><li>경력·아르바이트·훈련·자격을 경험으로 기록</li><li>결과 확인 → 세종 사업장 탐색 → 실행 계획</li><li>취업 전략 결과지 PDF 내려받기</li></ol></div></section>';
    h += '<section class="sj-section sj-grid c3"><div class="sj-card"><h3>직무·경험 중심 진단</h3><p class="small muted">판단 여덟 갈래(문제 정의·기준 해석·직접 판단·도구·결과물·검증·수정·조직 활용)를 경력과 실무 장면으로 묻습니다. 높은 단계는 <b>응답과 경험 기록이 함께 있을 때만</b> 섭니다.</p></div>' +
      '<div class="sj-card"><h3>세종 사업장 기준</h3><p class="small muted">본사와 실제 사업장을 구분합니다. 세종 ' + seen.length + "곳을 조사했고 공식 출처로 소재를 확인한 곳은 " + ready.length + "곳입니다. 대전·충남·충북은 통근권으로만 보조 표시합니다.</p></div>" +
      '<div class="sj-card"><h3>점수·순위를 만들지 않습니다</h3><p class="small muted">총점이나 적합도 숫자 대신, 무엇이 확인됐고 무엇을 채우면 되는지를 적습니다. 채용 여부는 확인하지 않으며 지원은 원 공고에서 직접 합니다.</p></div></section>';
    h += '<section class="sj-section sj-card"><h2>세종의 일자리 지형 (시연 자료)</h2><div class="sj-grid c2">';
    links.clusters.forEach(function (c) {
      var names = c.orgs.map(function (id) { return orgs.find(function (o) { return o.id === id; }); }).filter(Boolean).slice(0, 5)
        .map(function (o) { return o.name + " (" + ORG_TYPE_LABEL[o.org_type] + ")"; }).join(" · ");
      h += "<div><h3>" + esc(c.name) + '</h3><p class="small muted">' + esc(c.where) + " · " + c.orgs.length + '곳</p><p class="small">' + esc(names) + (c.orgs.length > 5 ? " 외" : "") + "</p></div>";
    });
    h += '</div><p class="sj-note warn" style="margin-top:12px">' + esc(region.notices.preview + " " + region.notices.hiring) + "</p></section>";
    h += '<section class="sj-section sj-card"><h2>진단 대상</h2><p class="small">' + esc(instrument.audiences.note) + '</p><div class="sj-choices">' +
      instrument.audiences.options.filter(function (o) { return o.code !== "none"; }).map(function (o) { return badge("", o.label); }).join("") +
      '</div><p class="small muted" style="margin-top:10px">진단판 ' + esc(instrument.instrument_version) + " · " + esc(instrument.status_note) + "</p></section>";
    return h;
  }

  function pageLogin(denied) {
    return '<div class="sj-grid c2" style="align-items:start"><div class="sj-card"><h1>로그인</h1><p class="muted small">진흥원이 발급한 아이디로 들어옵니다. 셀프 가입은 없습니다.</p>' +
      (denied ? '<p class="sj-note warn">이 화면을 볼 수 있는 권한이 없는 계정입니다. 다른 계정으로 로그인해 주세요.</p>' : "") +
      '<form class="sj-form" data-act="nologin"><div class="sj-field"><label for="identifier">아이디</label><input id="identifier" type="text" disabled placeholder="미리보기에서는 입력하지 않습니다"></div>' +
      '<div class="sj-field"><label for="password">비밀번호</label><input id="password" type="password" disabled placeholder="미리보기에서는 입력하지 않습니다"></div>' +
      '<div><button class="sj-btn" type="submit" disabled>로그인</button></div></form>' +
      '<div class="pv-inline"><b>미리보기 안내</b> 이 페이지에는 서버가 없어 실제 로그인을 하지 않습니다. 아래에서 역할을 골라 들어가세요.' +
      '<div class="sj-actions" style="margin-top:10px"><button class="sj-btn small" data-role="participant">구직자로 보기</button><button class="sj-btn small ghost" data-role="counselor">상담사로 보기</button><button class="sj-btn small ghost" data-role="admin">관리자로 보기</button></div></div></div>' +
      '<div class="sj-card"><h2>시연 계정</h2><p class="small muted">시연 계정과 비밀번호는 진흥원 시연 담당자에게 따로 받습니다. 화면과 저장소에는 적지 않습니다. 시연 DB 에는 가상 참여자와 합성 자료만 들어 있습니다.</p></div></div>';
  }

  function pageMe() {
    var att = me.att;
    var scored = att && att.status === "scored";
    var answered = att ? Object.keys(att.responses).length : 0;
    var stepsArr = [
      { n: 1, title: "희망 직무와 지역 고르기", done: !!att, href: "diagnosis", cta: att ? "다시 보기" : "시작" },
      { n: 2, title: "직무 경험 진단 (" + answered + "/" + TOTAL + ")", done: scored, href: att && !scored ? "run" : "diagnosis", cta: scored ? "완료" : att ? "이어하기" : "시작" },
      { n: 3, title: "경험 기록 (" + me.exps.length + "건)", done: me.exps.length > 0, href: "experience", cta: "기록하기" },
      { n: 4, title: "결과와 역량 분석", done: scored, href: "result", cta: "보기" },
      { n: 5, title: "세종 사업장 탐색", done: false, href: "explore", cta: "탐색" },
      { n: 6, title: "실행 계획과 결과지 PDF", done: me.pdf > 0, href: "plan", cta: "열기" },
    ];
    var now = (stepsArr.find(function (s) { return !s.done; }) || { n: 6 }).n;
    var prog = PROGRAMS.find(function (p) { return p.code === me.program; });
    var h = "<h1>" + esc(me.name) + '님의 대시보드</h1><p class="lead">' + esc(prog.name) + " · 참여번호 " + esc(me.no) + " · 담당 상담사 " + esc(COUNSELORS[0].name) + "</p>" +
      '<div class="sj-grid c3 sj-section"><div class="sj-card sj-kpi"><b>' + (scored ? "완료" : att ? "진행 중" : "시작 전") + '</b><span>진단 상태</span></div>' +
      '<div class="sj-card sj-kpi"><b>' + me.exps.length + '건</b><span>기록한 경험</span></div><div class="sj-card sj-kpi"><b>' + (me.pdf ? me.pdf + "회" : "아직") + "</b><span>결과지 PDF 생성</span></div></div>" +
      '<section class="sj-section"><h2>다음 할 일</h2><div class="sj-step-list">';
    stepsArr.forEach(function (s) {
      h += '<div class="sj-step' + (s.done ? " done" : "") + (s.n === now ? " now" : "") + '"><span class="n">' + (s.done ? "✓" : s.n) + "</span><span>" + esc(s.title) + "</span>" +
        A(s.href, s.cta, "sj-btn small" + (s.n === now ? "" : " ghost")) + "</div>";
    });
    h += "</div></section>";
    if (att && att.profile.job_areas.length) {
      h += '<section class="sj-section sj-card"><h3>고른 희망 직무</h3><div class="sj-choices">' + att.profile.job_areas.map(function (c) { return badge("brand", areaName(c)); }).join("") + "</div></section>";
    }
    h += '<section class="sj-section sj-card"><h2>상담사 결과 열람 동의</h2><p class="small">동의하면 배정된 상담사가 내 진단 결과와 결과지를 볼 수 있습니다. 경험 기록의 메모 원문은 보지 않습니다. 언제든 철회할 수 있고, 철회하면 바로 닫힙니다. 누가 언제 열었는지는 기록됩니다.</p>' +
      '<p class="small">지금 상태: ' + (me.consent ? badge("ok", "동의함") : badge("", "동의하지 않음")) + (me.consentAt ? '<span class="muted small"> · ' + minute(me.consentAt) + "</span>" : "") + "</p>" +
      '<div class="sj-actions"><button class="sj-btn small' + (me.consent ? " ghost" : "") + '" data-do="consent">' + (me.consent ? "동의 철회" : "상담사 열람에 동의") + "</button></div></section>";
    return h;
  }

  function pageDiagnosis(err) {
    var att = me.att, prev = att ? att.profile : null;
    var h = badge("demo", "DEMO · " + instrument.instrument_version) + '<h1 style="margin-top:10px">직무 경험 진단 시작</h1><p class="lead">학과나 전공을 묻지 않습니다. 희망하는 일과, 일하며 실제로 해 본 것을 묻습니다. ' + TOTAL + "문항이고 고른 즉시 저장됩니다.</p>";
    if (att && att.status === "in_progress") h += '<p class="sj-note">진행 중인 진단이 있습니다. ' + A("run", "이어하기") + " · 아래를 바꾸면 시작 정보만 고칩니다.</p>";
    if (att && att.status === "scored") h += '<p class="sj-note">제출한 진단이 있습니다. 새로 시작하면 이전 결과는 그대로 남고 새 결과가 하나 더 생깁니다.</p>';
    h += '<form class="sj-form sj-card sj-section" data-act="start"><div class="sj-field"><span class="lab">희망 직무 (1~3개)</span>' + (err ? '<p class="sj-error">희망 직무를 하나 이상 골라 주세요.</p>' : "") + '<div class="sj-choices">';
    instrument.job_areas.forEach(function (j) {
      var on = prev && prev.job_areas.indexOf(j.code) >= 0 && att.status !== "scored";
      h += '<label class="sj-choice" title="' + esc(j.one_line) + '"><input type="checkbox" name="job_areas" value="' + j.code + '"' + (on ? " checked" : "") + ">" + esc(j.name) + "</label>";
    });
    h += '</div><p class="small muted">세 개를 넘게 고르면 앞의 세 개만 씁니다.</p></div><div class="sj-field"><span class="lab">일하고 싶은 지역 범위</span><div class="sj-choices">';
    var rr = prev ? prev.region_range : "ADJACENT";
    instrument.region_ranges.options.forEach(function (o) {
      h += '<label class="sj-choice"><input type="radio" name="region_range" value="' + o.code + '"' + (rr === o.code ? " checked" : "") + ">" + esc(o.label) + "</label>";
    });
    h += '</div></div><div class="sj-field"><span class="lab">해당하는 구분 (선택)</span><p class="small muted">' + esc(instrument.audiences.note) + '</p><div class="sj-choices">';
    var au = prev && prev.audience ? prev.audience : "none";
    instrument.audiences.options.forEach(function (o) {
      h += '<label class="sj-choice"><input type="radio" name="audience" value="' + o.code + '"' + (au === o.code ? " checked" : "") + ">" + esc(o.label) + "</label>";
    });
    h += '</div></div><div class="sj-field"><label for="skills">보유 기술·도구 (선택, 쉼표로 구분)</label><input id="skills" name="skills" type="text" placeholder="예: 엑셀, 지게차, ERP, 고객 응대" value="' + esc(prev ? prev.skills.join(", ") : "") + '"></div>' +
      '<p class="sj-note">시작 정보는 결과에서 보여 줄 직무와 기업 범위만 정합니다. <b>판정에는 들어가지 않습니다.</b></p><div><button class="sj-btn" type="submit">진단 ' + (att && att.status === "in_progress" ? "이어하기" : "시작") + "</button></div></form>";
    return h;
  }

  function pageRun(err) {
    var att = me.att;
    if (!att || att.status !== "in_progress") { location.hash = att ? "result" : "diagnosis"; return ""; }
    var done = Object.keys(att.responses).length;
    var h = badge("demo", "DEMO · " + instrument.instrument_version) + '<h1 style="margin-top:10px">직무 경험 진단</h1><p class="lead">일·아르바이트·인턴·훈련·봉사 어디서든 <b>실제로 해 본 것</b>을 기준으로 고르세요. 잘 보이려고 높게 고르면 결과가 쓸모없어집니다. 근거가 있어야 높은 칸이 섭니다.</p>';
    if (err) h += '<p class="sj-error">아직 고르지 않은 문항이 있습니다.</p>';
    h += '<div class="pv-inline">미리보기 도구 · <button class="pv-link" data-do="fill">예시 응답으로 남은 문항 채우기</button> (화면에는 없는 단추입니다)</div>';
    h += '<div class="sj-section"><div class="sj-card" style="position:sticky;top:0;z-index:2"><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px"><span>진행</span><b id="pv-prog">' + done + " / " + TOTAL + '</b></div><div class="sj-progress"><i id="pv-bar" style="width:' + Math.round((done / TOTAL) * 100) + '%"></i></div></div>';
    instrument.sections.forEach(function (s) {
      h += '<section class="sj-card sj-section"><h2>' + esc(s.title) + '</h2><p class="small muted">' + esc(s.axes.map(function (x) { return (axisInfo[x] || {}).name || x; }).join(" · ")) + "</p>";
      s.items.forEach(function (it) {
        h += '<div class="sj-item" data-item="' + it.code + '"><div class="q">' + esc(it.text) + "</div>" + (it.example ? '<div class="ex">예: ' + esc(it.example) + "</div>" : "") +
          '<div class="sj-scale" role="group" aria-label="' + esc(it.text) + '">';
        instrument.scale.forEach(function (o) {
          h += '<button type="button" data-ans="' + it.code + '" data-v="' + o.value + '" aria-pressed="' + (att.responses[it.code] === o.value) + '">' + esc(o.label) + "</button>";
        });
        h += '</div><div class="sj-saved" aria-live="polite" id="sv-' + it.code + '">' + (att.responses[it.code] !== undefined ? "저장됨" : "") + "</div></div>";
      });
      h += "</section>";
    });
    h += '</div><form class="sj-card sj-section" data-act="submit"><h3>제출</h3><p class="small muted">제출하면 결과가 굳습니다. 제출 뒤에 고친 경험 기록은 다음 진단에 반영됩니다.</p><button class="sj-btn" type="submit">제출하고 결과 보기</button></form>';
    return h;
  }

  function pageExperience(err) {
    var kindLabel = {}; instrument.experience_kinds.forEach(function (k) { kindLabel[k.code] = k.label; });
    var checkLabel = {}; instrument.experience_checks.forEach(function (c) { checkLabel[c.code] = c; });
    var h = '<h1>경험 기록 (Evidence)</h1><p class="lead">경력·아르바이트·인턴·훈련·자격·봉사를 적습니다. 진단에서 \'직접 해 봤다\'고 고른 판단은<b> 여기 적은 경험이 둘 이상 받쳐 줄 때</b> \'경험으로 확인됨\'이 됩니다. 경험은 점수를 만들지 않고, 이미 고른 단계를 올리지도 않습니다. 근거만 붙입니다.</p>';
    if (S.saved.exp) { h += '<p class="sj-note">저장했습니다.</p>'; S.saved.exp = false; }
    if (err) h += '<p class="sj-error">경험 종류와 제목을 적어 주세요.</p>';
    h += '<div class="sj-grid c2 sj-section" style="align-items:start"><form class="sj-card sj-form" data-act="exp"><h2>경험 하나 더하기</h2>' +
      '<div class="sj-field"><label for="kind">종류</label><select id="kind" name="kind">' + instrument.experience_kinds.map(function (k) { return '<option value="' + k.code + '">' + esc(k.label) + "</option>"; }).join("") + "</select></div>" +
      '<div class="sj-field"><label for="title">무슨 일이었나요</label><input id="title" name="title" type="text" placeholder="예: 물류센터 출고 검수"></div>' +
      '<div class="sj-grid c2"><div class="sj-field"><label for="org_name">어디서 (선택)</label><input id="org_name" name="org_name" type="text" placeholder="회사·기관·과정 이름"></div>' +
      '<div class="sj-field"><label for="period_text">언제·얼마나 (선택)</label><input id="period_text" name="period_text" type="text" placeholder="예: 2025.3~2025.12"></div></div>' +
      '<div class="sj-field"><label for="job_area">가까운 직무 (선택)</label><select id="job_area" name="job_area"><option value="">고르지 않음</option>' + instrument.job_areas.map(function (j) { return '<option value="' + j.code + '">' + esc(j.name) + "</option>"; }).join("") + "</select></div>" +
      '<div class="sj-field"><label for="role_text">내가 맡은 일 (선택)</label><textarea id="role_text" name="role_text" placeholder="무엇을 했고, 무엇이 남았는지 한두 줄"></textarea></div>' +
      '<div class="sj-field"><span class="lab">이 경험에서 말할 수 있는 것</span><div class="sj-choices" style="flex-direction:column;align-items:stretch">' +
      instrument.experience_checks.map(function (c) { return '<label class="sj-choice"><input type="checkbox" name="checks" value="' + c.code + '">' + esc(c.label) + ' <span class="muted small">(' + esc((axisInfo[c.axis] || {}).name || c.axis) + ")</span></label>"; }).join("") +
      '</div></div><div class="sj-field"><label for="skills">쓴 기술·도구 (선택, 쉼표로 구분)</label><input id="skills" name="skills" type="text" placeholder="예: 엑셀, 바코드 스캐너"></div><div><button class="sj-btn" type="submit">기록하기</button></div></form>';
    h += "<div><h2>기록한 경험 " + me.exps.length + "건</h2>" + (me.exps.length === 0 ? '<p class="muted">아직 없습니다. 아르바이트 하나도 좋은 근거입니다.</p>' : "");
    me.exps.forEach(function (r) {
      h += '<div class="sj-card"><div style="display:flex;justify-content:space-between;gap:8px"><div>' + badge("", kindLabel[r.kind] || r.kind) + " " + (r.job_area ? badge("brand", areaName(r.job_area)) : "") +
        '<h3 style="margin-top:6px">' + esc(r.title) + '</h3><p class="small muted">' + esc([r.org_name, r.period_text].filter(Boolean).join(" · ")) + '</p></div><div><button class="sj-btn ghost small" data-rm="' + r.id + '">지우기</button></div></div>' +
        (r.role_text ? '<p class="small">' + esc(r.role_text) + "</p>" : "") + '<div class="sj-choices">' +
        r.checks.map(function (c) { return badge("ok", (checkLabel[c] || {}).label || c); }).join("") + (r.checks.length === 0 ? '<span class="small muted">고른 근거 칸 없음</span>' : "") + "</div></div>";
    });
    return h + "</div></div>";
  }

  function pageResult(isNew) {
    var att = latestScored(me);
    if (!att) return '<div class="sj-card"><h1>결과</h1><p>아직 제출한 진단이 없습니다.</p>' + A("diagnosis", "진단 시작", "sj-btn") + "</div>";
    logAccess("self", me.name, me, "result_web");
    var r = att.result;
    var aux = auxAllowed(me.program, r.profile);
    var os = orgsForAreas(r.profile.job_areas).filter(function (o) { return aux || o.region_scope === "SEJONG"; });
    var ready = os.filter(reportable);
    var gapAxes = new Set(r.gaps.map(function (g) { return g.axis; })).size;
    return badge("demo", "DEMO · " + r.instrument_version + " · " + r.analysis_version) + '<h1 style="margin-top:10px">진단 결과와 역량 분석</h1>' +
      (isNew ? '<p class="sj-note">제출했습니다. 결과가 굳었고, 아래 내용이 결과지 PDF 와 같습니다.</p>' : "") +
      '<p class="lead">' + (r.strengths.length ? "경험으로 받쳐진 판단이 " + r.strengths.length + "갈래 있습니다. 지원서에서는 이 근거부터 쓰세요."
        : "아직 경험 기록이 받쳐 준 판단이 없습니다. 해 본 일을 경험 기록에 적으면 '응답만' 칸이 확인으로 바뀔 수 있습니다.") +
      " 희망 직무에서 채울 판단은 " + gapAxes + "갈래입니다.</p>" +
      '<div class="sj-section">' + resultView(r) + "</div>" +
      '<section class="sj-section sj-card"><h2>이어 볼 세종 사업장</h2><p class="small muted">고른 직무와 이어지는 곳 ' + os.length + "곳 중 공식 출처로 소재를 확인한 곳 " + ready.length + "곳. 추천이 아니며 채용 여부는 확인하지 않았습니다.</p>" +
      '<div class="sj-actions"><button class="sj-btn" data-do="mine">세종 기업·기관 탐색</button>' + A("plan", "실행 계획", "sj-btn ghost") + A("report", "결과지 미리보기", "sj-btn ghost") + "</div></section>";
  }

  var EX = { area: "", type: "", v: "", mine: false };
  function pageExplore() {
    var mine = S.role === "participant" ? latestScored(me) : null;
    var myAreas = EX.mine && mine ? mine.result.profile.job_areas : [];
    function filtered(scope) {
      return orgs.filter(function (o) {
        if (scope.indexOf(o.region_scope) < 0) return false;
        var l = links.links[o.id] || [];
        if (EX.area && l.indexOf(EX.area) < 0) return false;
        if (myAreas.length && !l.some(function (c) { return myAreas.indexOf(c) >= 0; })) return false;
        if (EX.type && o.org_type !== EX.type) return false;
        if (EX.v === "ready" && !reportable(o)) return false;
        return true;
      });
    }
    var sejong = filtered(["SEJONG"]), aux = filtered(["DAEJEON", "CHUNGNAM", "CHUNGBUK"]);
    var all = orgs.filter(function (o) { return o.region_scope === "SEJONG"; });
    var h = '<h1>세종 산업·기업 탐색</h1><p class="lead">세종에 <b>실제 사업장</b>이 있는 기업·기관입니다. 본사만 세종인지, 사업장만 세종인지 구분하고 주소·업종·확인 상태·출처를 함께 적었습니다.</p>' +
      '<div class="sj-note warn">' + esc(region.notices.info_only + " " + region.notices.hiring) + "<br>" + esc(orgsMeta.access_note) + "</div>" +
      '<section class="sj-section sj-grid c4"><div class="sj-card sj-kpi"><b>' + all.length + '곳</b><span>세종 조사 대상</span></div><div class="sj-card sj-kpi"><b>' + all.filter(reportable).length +
      '곳</b><span>공식 출처로 소재 확인</span></div><div class="sj-card sj-kpi"><b>0곳</b><span>채용 중으로 표시한 곳 (확인 안 함)</span></div><div class="sj-card sj-kpi"><b>' + esc(orgsMeta.checked_on) + "</b><span>자료 확인일</span></div></section>" +
      '<section class="sj-section sj-card"><h2>산업 묶음</h2><div class="sj-grid c3">' +
      links.clusters.map(function (c) { return "<div><b>" + esc(c.name) + '</b><div class="small muted">' + esc(c.where) + " · " + c.orgs.length + "곳</div></div>"; }).join("") +
      '</div><h3 style="margin-top:14px">지역 사실 (출처 표기)</h3><ul class="small" style="padding-left:18px">' +
      region.facts.map(function (f) {
        return "<li>" + esc(f.text) + " " + badge("part", VERIFY_LABEL[f.verify]) + " " + f.sources.map(function (s) { return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title) + "</a>"; }).join("") + "</li>";
      }).join("") + "</ul></section>";
    h += '<form class="sj-section sj-card sj-form" data-act="filter"><div class="sj-grid c4"><div class="sj-field"><label for="area">직무 영역</label><select id="area" name="area"><option value="">전체</option>' +
      instrument.job_areas.map(function (j) { return '<option value="' + j.code + '"' + (EX.area === j.code ? " selected" : "") + ">" + esc(j.name) + "</option>"; }).join("") +
      '</select></div><div class="sj-field"><label for="type">기관 유형</label><select id="type" name="type">' +
      [["", "전체"], ["PRIVATE", "민간 기업"], ["RESEARCH_INSTITUTE", "국책연구기관"], ["LOCAL_PUBLIC_CORP", "지방 공기업·출연기관"], ["PUBLIC_INSTITUTION", "공공기관"]]
        .map(function (x) { return '<option value="' + x[0] + '"' + (EX.type === x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") +
      '</select></div><div class="sj-field"><label for="v">확인 상태</label><select id="v" name="v"><option value="">전체</option><option value="ready"' + (EX.v === "ready" ? " selected" : "") + '>공식 출처로 소재 확인된 곳만</option></select></div>' +
      '<div class="sj-field"><span class="lab">&nbsp;</span><div style="display:flex;gap:8px">' +
      (mine ? '<label class="sj-choice"><input type="checkbox" name="mine" value="1"' + (EX.mine ? " checked" : "") + "> 내 희망 직무</label>" : "") +
      '<button class="sj-btn small" type="submit">적용</button></div></div></div></form>';
    h += '<section class="sj-section"><h2>세종 · ' + sejong.length + '곳</h2><div class="sj-grid c2">' + sejong.map(orgCard).join("") + "</div>" +
      (sejong.length === 0 ? '<p class="muted">조건에 맞는 곳이 없습니다. <button class="pv-link" data-do="clearfilter">조건 지우기</button></p>' : "") + "</section>";
    h += '<section class="sj-section"><h2>보조 권역 (대전·충남·충북) · ' + aux.length + '곳</h2><p class="small muted">' + esc(region.aux_rule + " " + region.aux_status) + "</p>" +
      (mine && mine.result.profile.region_range === "HOME_ONLY" ? "<p class=\"sj-note\">희망 지역을 '세종 안에서만'으로 고르셔서 결과지에는 보조 권역을 넣지 않습니다.</p>" : "") +
      '<div class="sj-grid c2">' + aux.map(orgCard).join("") + "</div></section>";
    return h;
  }

  var HORIZON = { D30: "30일 안에", D60: "60일 안에", D90: "90일 안에" };
  var KIND = { evidence: "근거 남기기", growth: "채우기", region: "세종 탐색", apply: "지원" };
  function pagePlan() {
    var att = latestScored(me);
    if (!att) return '<div class="sj-card"><h1>실행 계획</h1><p>진단을 제출하면 결과에 맞춘 30·60·90일 계획이 만들어집니다.</p>' + A("diagnosis", "진단 시작", "sj-btn") + "</div>";
    var acts = att.result.actions;
    var h = '<h1>개인별 취업 실행 계획</h1><p class="lead">결과에서 바로 이어지는 할 일입니다. 먼저 이미 한 일을 근거로 남기고(30일), 희망 직무에서 비어 있는 판단을 채우고(60일), 원 공고에 직접 지원합니다(90일). 플랫폼이 대신 지원하지 않습니다.</p>' +
      '<p class="small muted">완료 ' + acts.filter(function (x) { return me.done[x.code]; }).length + " / " + acts.length + "</p>";
    ["D30", "D60", "D90"].forEach(function (hz) {
      h += '<section class="sj-section sj-card"><h2>' + HORIZON[hz] + "</h2>";
      acts.filter(function (x) { return x.horizon === hz; }).forEach(function (x) {
        var d = !!me.done[x.code];
        h += '<div class="sj-step" style="margin-bottom:8px"><span class="n">' + (d ? "✓" : "·") + "</span><span>" + badge("", KIND[x.kind]) + " " + esc(x.text) + "</span>" +
          '<button class="sj-btn small' + (d ? " ghost" : "") + '" data-toggle="' + x.code + '">' + (d ? "되돌리기" : "했어요") + "</button></div>";
      });
      h += "</section>";
    });
    h += '<section class="sj-section sj-card"><h2>취업 전략 결과지</h2><p class="small muted">진단 결과·경험 근거·세종 사업장·실행 계획을 한 문서로 묶습니다.</p><div class="sj-actions">' +
      A("report", "미리보기", "sj-btn ghost") + '<button class="sj-btn" data-do="pdf">PDF 내려받기</button></div><div id="pv-pdf"></div></section>';
    return h;
  }

  /* src/sejong/ui/report-doc.tsx 의 편집 짜임을 옮겨 적은 것. 거기를 고치면 여기도 고친다 */
  function coverArt(small) {
    var g = small ? "rpg2" : "rpg1", d = small ? "rpd2" : "rpd1";
    return '<svg class="rp-art' + (small ? " small" : "") + '" viewBox="0 0 600 600" aria-hidden="true"><defs><radialGradient id="' + g + '" cx="35%" cy="35%" r="70%">' +
      '<stop offset="0" stop-color="#8a7fe0" stop-opacity="0.95"/><stop offset="1" stop-color="#2f2b86" stop-opacity="0"/></radialGradient>' +
      '<pattern id="' + d + '" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#ffffff" fill-opacity="0.35"/></pattern></defs>' +
      '<circle cx="380" cy="300" r="190" fill="url(#' + g + ')"/><circle cx="380" cy="300" r="240" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>' +
      '<path d="M150 420 C 230 330, 330 300, 450 330" fill="none" stroke="#d81b72" stroke-width="10" stroke-linecap="round"/>' +
      '<path d="M420 150 C 470 175, 505 215, 520 265" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M110 200 C 140 160, 180 140, 225 135" fill="none" stroke="#d81b72" stroke-width="7" stroke-linecap="round"/>' +
      '<rect x="40" y="440" width="160" height="112" fill="url(#' + d + ')"/></svg>';
  }
  function band(part, title) { return '<header class="rp-band"><span>' + esc(part) + "</span><h2>" + esc(title) + "</h2></header>"; }
  function tocPart(no, title, items) {
    return '<div class="rp-toc-part"><b>' + esc(no) + "</b><div><h3>" + esc(title) + "</h3><ul>" + items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul></div></div>";
  }
  function divider(no, title, msg, items) {
    return '<section class="rp-divider"><div class="rp-div-top"><span>Part</span><b>' + no + '</b></div><div class="rp-div-bottom">' + coverArt(true) +
      "<h2>" + esc(title) + '</h2><p class="rp-div-msg">' + esc(msg) + "</p><ul>" + items.map(function (i, k) { return "<li>" + no + "." + (k + 1) + " " + esc(i) + "</li>"; }).join("") + "</ul></div></section>";
  }
  function rh(no, t) { return '<h2 class="rp-h"><i>' + esc(no) + "</i>" + esc(t) + "</h2>"; }

  function reportDoc(p, att) {
    var r = att.result;
    var allowAux = auxAllowed(p.program, r.profile);
    var os = orgsForAreas(r.profile.job_areas, true);
    var sejong = os.filter(function (o) { return o.region_scope === "SEJONG"; });
    var aux = allowAux ? os.filter(function (o) { return o.region_scope !== "SEJONG"; }) : [];
    var kindLabel = {}; instrument.experience_kinds.forEach(function (k) { kindLabel[k.code] = k.label; });
    var checkLabel = {}; instrument.experience_checks.forEach(function (c) { checkLabel[c.code] = c.label; });
    var prog = PROGRAMS.find(function (x) { return x.code === p.program; });
    var regionLabel = (instrument.region_ranges.options.find(function (o) { return o.code === r.profile.region_range; }) || {}).label || "-";
    var audienceLabel = (instrument.audiences.options.find(function (o) { return o.code === r.profile.audience; }) || {}).label || "선택하지 않음";
    var strong = r.axes.filter(function (a) { return a.state === "CONFIRMED" || a.state === "PARTIAL"; });
    var claimed = r.axes.filter(function (a) { return a.state === "CLAIMED"; });
    var toFill = r.axes.filter(function (a) { return a.state === "NONE" || a.state === "EXPOSED"; });
    var gapAxes = Array.from(new Set(r.gaps.map(function (g) { return g.axis; }))).map(function (x) { return r.axes.find(function (a) { return a.axis === x; }); }).filter(Boolean);
    function byH(h) { return r.actions.filter(function (x) { return x.horizon === h; }); }
    var areas = r.profile.job_areas.map(areaName).join(" · ");

    var h = '<article class="sj-paper sj-rp" id="sj-report">';
    h += '<section class="rp-cover"><div class="rp-cover-top"><span class="rp-kicker">SEJONG · CAREER STRATEGY REPORT</span>' + badge("demo", "시연판 · DEMO 진단 결과지") + "</div>" +
      '<div class="rp-cover-title"><h1>개인별 취업 전략 결과지</h1><p>해 온 일로 다음 일을 찾습니다</p></div>' +
      '<dl class="rp-cover-meta"><div><dt>이름</dt><dd>' + esc(p.name) + "</dd></div><div><dt>참여번호</dt><dd>" + esc(p.no) + "</dd></div><div><dt>참여 사업</dt><dd>" + esc(prog.name) +
      "</dd></div><div><dt>진단 제출</dt><dd>" + day(att.scoredAt) + '</dd></div><div class="wide"><dt>희망 직무</dt><dd>' + esc(areas) + "</dd></div></dl>" +
      '<div class="rp-cover-foot"><b>세종일자리경제진흥원 × CareerMatri</b><span>진단 ' + esc(r.instrument_version) + " · 분석 " + esc(r.analysis_version) +
      "</span><span>검증 전 시연판 진단으로 만든 문서입니다. 총점·순위·적합도 숫자를 담지 않으며 선발·평가에 쓰지 않습니다.</span></div></section>";

    h += '<section class="rp-page">' + band("CONTENTS", "차례와 읽는 법") + '<div class="rp-toc">' +
      tocPart("01", "지금의 나", ["1.1 한눈에 보기", "1.2 희망 직무별 분석", "1.3 판단 여덟 갈래", "1.4 경험과 경력 근거"]) +
      tocPart("02", "세종에서 찾기", ["2.1 세종 산업 환경", "2.2 이어 볼 사업장", "2.3 보조 권역"]) +
      tocPart("03", "다음 90일", ["3.1 30·60·90일 실행 계획", "3.2 진흥원 지원사업 안내"]) +
      tocPart("부록", "근거·출처·한계", ["진단과 분석 규칙", "자료의 확인 상태"]) + "</div>" + rh("i", "이 결과지를 읽는 법") +
      '<p class="small">점수는 없습니다. 판단 여덟 갈래마다 <b>진단에서 고른 단계</b>와 <b>경험 기록이 받쳐 주는지</b>를 함께 보고 다섯 상태 가운데 하나를 적습니다.</p>' +
      '<table class="sj-table rp-legend"><tbody>' +
      "<tr><td>" + stateBadge("CONFIRMED") + "</td><td>두 문항 이상에서 ‘직접 해 봤다’ 이상을 골랐고, 그 판단을 받치는 경험 기록이 둘 이상입니다.</td></tr>" +
      "<tr><td>" + stateBadge("PARTIAL") + "</td><td>같은 조건에서 경험 근거가 하나입니다. 다른 경험에서 하나 더 찾으면 ‘확인됨’이 됩니다.</td></tr>" +
      "<tr><td>" + stateBadge("CLAIMED") + "</td><td>직접 해 봤다고 답했지만 아직 경험 기록이 없습니다.</td></tr>" +
      "<tr><td>" + stateBadge("EXPOSED") + "</td><td>옆에서 보거나 정해진 대로 따라 해 본 단계입니다.</td></tr>" +
      "<tr><td>" + stateBadge("NONE") + "</td><td>아직 해 보지 않았다고 답했습니다.</td></tr></tbody></table>" +
      '<p class="small muted">단계 뜻 — L1 ' + esc(levels.L1) + " · L2 " + esc(levels.L2) + " · L3 " + esc(levels.L3) + "</p></section>";

    h += divider("01", "지금의 나", "경험으로 받쳐진 판단 " + strong.length + "갈래 · 희망 직무에서 채울 판단 " + gapAxes.length + "갈래", ["한눈에 보기", "희망 직무별 분석", "판단 여덟 갈래", "경험과 경력 근거"]);

    h += '<section class="rp-page">' + band("Part 01 · 지금의 나", "1.1 한눈에 보기") +
      '<div class="rp-kpis"><div class="ok"><b>' + strong.length + '<small> / 8</small></b><span>경험으로 받쳐진 판단</span></div><div class="brand"><b>' + claimed.length +
      '<small> / 8</small></b><span>응답으로만 확인</span></div><div><b>' + toFill.length + '<small> / 8</small></b><span>접해 봤거나 아직인 판단</span></div><div><b>' + p.exps.length +
      "<small>건</small></b><span>기록한 경험 (제출 당시 " + r.evidence_count + "건)</span></div></div>" +
      '<table class="sj-table rp-kv"><tbody><tr><th>희망 직무</th><td>' + esc(areas) + "</td></tr><tr><th>희망 지역 범위</th><td>" + esc(regionLabel) + "</td></tr><tr><th>해당 구분</th><td>" + esc(audienceLabel) +
      "</td></tr><tr><th>보유 기술·도구</th><td>" + esc(r.profile.skills.length ? r.profile.skills.join(", ") : "-") + "</td></tr></tbody></table>" +
      '<div class="rp-two"><div class="rp-box ok"><h3>지원서에 먼저 쓸 판단</h3>' +
      (strong.length ? "<ul>" + strong.map(function (a) { return "<li><b>" + esc(a.name) + "</b> — 근거: " + esc(a.evidence.map(function (e) { return e.title; }).join(" · ")) + "</li>"; }).join("") + "</ul>"
        : '<p class="small muted">아직 없습니다. 해 본 일을 경험 기록에 적으면 ‘응답만’ 판단이 확인으로 바뀔 수 있습니다.</p>') +
      '</div><div class="rp-box"><h3>희망 직무에서 먼저 채울 판단</h3>' +
      (gapAxes.length ? "<ul>" + gapAxes.map(function (a) { return "<li><b>" + esc(a.name) + "</b> — " + esc(a.question) + "</li>"; }).join("") + "</ul>"
        : '<p class="small muted">고른 직무의 핵심 판단에 비어 있는 칸이 없습니다.</p>') + "</div></div>" +
      rh("1.2", "희망 직무별 분석") + '<div class="rp-two">' +
      r.areas.map(function (ar) {
        return '<div class="rp-box"><h3>' + esc(ar.name) + '</h3><p class="small muted">' + esc(ar.one_line) + '</p><p class="small">' + badge("ok", "확인 " + ar.counts.confirmed) + " " +
          badge("brand", "응답만 " + ar.counts.claimed) + " " + badge("", "채울 것 " + ar.counts.to_fill) + '</p><ul class="small">' +
          ar.key.map(function (k) { return "<li>" + esc(k.name) + " — " + stateBadge(k.state) + "</li>"; }).join("") + "</ul></div>";
      }).join("") + "</div></section>";

    h += '<section class="rp-page">' + band("Part 01 · 지금의 나", "1.3 판단 여덟 갈래") +
      '<p class="small muted">막대는 진단에서 고른 단계(두 문항 이상이 닿은 단계), 초록은 경험 기록이 받친 칸입니다.</p>' +
      '<table class="sj-table rp-axes"><thead><tr><th>판단</th><th>고른 단계</th><th>상태</th><th>근거 경험</th></tr></thead><tbody>' +
      r.axes.map(function (a) {
        return "<tr><td><b>" + esc(a.name) + '</b><div class="small muted">' + esc(a.question) + "</div></td><td>" + steps(a.level, a.state === "CONFIRMED" || a.state === "PARTIAL") + "</td><td>" + stateBadge(a.state) +
          '</td><td class="small">' + (a.evidence.length ? esc(a.evidence.map(function (e) { return e.title; }).join(" · ")) : a.evidence_possible ? "-" : '<span class="muted">경험 기록으로 확인하는 칸이 없는 판단</span>') + "</td></tr>";
      }).join("") + "</tbody></table>" +
      (r.quality.flat ? '<p class="sj-note warn">응답이 한 값에 몰려 있습니다. 결과를 해석하기 전에 상담사와 함께 다시 보기를 권합니다.</p>' : "") +
      "</section>" + '<section class="rp-page">' + band("Part 01 · 지금의 나", "1.4 경험과 경력 근거") +
      (p.exps.length === 0 ? '<p class="muted">기록한 경험이 없습니다.</p>' :
        '<table class="sj-table"><thead><tr><th>종류</th><th>경험</th><th>말할 수 있는 것</th></tr></thead><tbody>' +
        p.exps.map(function (e) {
          return '<tr><td class="small">' + esc(kindLabel[e.kind] || e.kind) + "</td><td><b>" + esc(e.title) + '</b><div class="small muted">' + esc([e.org_name, e.period_text].filter(Boolean).join(" · ")) +
            '</div></td><td class="small">' + esc(e.checks.map(function (c) { return checkLabel[c] || c; }).join(" / ") || "-") + "</td></tr>";
        }).join("") + "</tbody></table>") +
      '<div class="rp-box rp-tip"><h3>지원서·면접에서 이렇게 씁니다</h3>' +
      (strong.length ? '<ol class="small">' + strong.map(function (a) {
        return "<li><b>" + esc(a.name) + "</b>: ‘" + esc((a.evidence[0] || {}).title) + "’에서 “" + esc(a.question) + "”에 답하는 문장</li>";
      }).join("") + '</ol><p class="small muted">문장에 들어갈 숫자·기간·결과는 본인이 직접 채웁니다. 이 문서는 문장을 대신 지어 주지 않습니다.</p>' : '<p class="small">‘응답만’ 판단부터 경험 하나씩 기록해 근거를 만듭니다. 이 문서는 문장을 대신 지어 주지 않습니다.</p>') + "</div></section>";

    h += divider("02", "세종에서 찾기", "고른 직무와 이어지는 세종 사업장 " + sejong.length + "곳 (공식 출처로 소재 확인) · 채용 여부는 확인하지 않았습니다", ["세종 산업 환경", "이어 볼 사업장", "보조 권역"]);

    h += '<section class="rp-page">' + band("Part 02 · 세종에서 찾기", "2.1 세종 산업 환경") + '<div class="rp-clusters">' +
      links.clusters.map(function (c) { return "<div><b>" + esc(c.name) + "</b><span>" + esc(c.where) + "</span><em>" + c.orgs.length + "곳 조사</em></div>"; }).join("") +
      '</div><ul class="small rp-facts">' + region.facts.map(function (f) {
        return "<li>" + esc(f.text) + " " + badge("part", VERIFY_LABEL[f.verify]) + ' <span class="muted">' + esc(f.sources.map(function (s) { return s.title; }).join(", ")) + "</span></li>";
      }).join("") + "</ul>" + rh("2.2", "이어 볼 사업장") +
      '<p class="small">' + esc(region.notices.info_only + " " + region.notices.hiring) + '</p><p class="small muted">공식 출처로 세종 사업장 소재를 확인한 곳만 싣습니다. 순서는 자료 순서이고 점수로 줄 세우지 않았습니다.</p>' +
      '<table class="sj-table rp-orgs"><thead><tr><th>기업·기관</th><th>세종 사업장</th><th>업종·사업</th><th>확인 상태</th><th>채용</th></tr></thead><tbody>' +
      sejong.map(function (o) {
        return "<tr><td><b>" + esc(o.name) + '</b><div class="small muted">' + esc(ORG_TYPE_LABEL[o.org_type] + " · " + LOCATION_LABEL[o.location_basis]) + '</div></td><td class="small">' + esc((o.sejong_sites[0] || {}).address) +
          '</td><td class="small">' + esc(o.industry_text) + '</td><td class="small">' + esc(VERIFY_LABEL[o.verify]) + '<div class="muted">' + esc((o.sources[0] || {}).checked_on) + '</div></td><td class="small">미확인</td></tr>';
      }).join("") + "</tbody></table>" + (sejong.length === 0 ? '<p class="muted">고른 직무와 이어지는 확인된 곳이 아직 없습니다.</p>' : "") +
      rh("2.3", "보조 권역 (대전·충남·충북)") +
      (allowAux ? (aux.length ? '<p class="small">' + esc(aux.map(function (o) { return o.name; }).join(", ")) + "</p>" : '<p class="small muted">' + esc(region.aux_status) + "</p>")
        : '<p class="small muted">희망 지역 범위 또는 참여 사업의 지역 조건에 따라 싣지 않습니다.</p>') + "</section>";

    h += divider("03", "다음 90일", "할 일 " + r.actions.length + "가지 · 30일 " + byH("D30").length + " · 60일 " + byH("D60").length + " · 90일 " + byH("D90").length, ["30·60·90일 실행 계획", "진흥원 지원사업 안내"]);

    h += '<section class="rp-page">' + band("Part 03 · 다음 90일", "3.1 30·60·90일 실행 계획") +
      '<p class="small">먼저 이미 한 일을 근거로 남기고, 희망 직무에서 비어 있는 판단을 채우고, 원 공고에 직접 지원합니다. 플랫폼이 대신 지원하지 않습니다.</p><div class="rp-timeline">' +
      ["D30", "D60", "D90"].map(function (hz) {
        return "<div><h3>" + HORIZON[hz] + "</h3><ol>" + byH(hz).map(function (x) { return "<li>" + badge("", KIND[x.kind]) + " " + esc(x.text) + "</li>"; }).join("") + "</ol></div>";
      }).join("") + "</div>" + rh("3.2", "진흥원 지원사업 안내") +
      '<p class="small muted">진흥원과 사업 목록이 확정되면 이 자리에 연결합니다. 시연판에서는 비워 둡니다.</p>' + rh("부록", "근거·출처·한계") +
      '<ul class="small"><li>진단 ' + esc(r.instrument_version) + " 은 검증 전 시연판입니다. 문항 24개, 판단 여덟 갈래(CareerMatri ME_V3 의 판단 축 이름을 그대로 씀).</li>" +
      "<li>상태 규칙(" + esc(r.analysis_version) + "): 두 문항 이상이 ‘직접 해 봤다’ 이상이고 경험 근거가 둘이면 ‘" + STATE_LABEL.CONFIRMED + "’, 하나면 ‘" + STATE_LABEL.PARTIAL + "’, 없으면 ‘" + STATE_LABEL.CLAIMED + "’.</li>" +
      "<li>기업·기관 자료는 공식 출처의 검색 발췌로 확인했고 원문 재확인 전입니다(확인일 " + esc(orgsMeta.checked_on) + "). 직무 연결은 시연용 해석입니다.</li><li>채용 여부, 취업 가능성, 지역 정주 결과를 이 문서가 산출하지 않습니다.</li></ul></section>";
    return h + "</article>";
  }

  function pageReport() {
    var att = latestScored(me);
    if (!att) return '<div class="sj-card"><h1>결과지</h1><p>진단을 제출하면 결과지를 만들 수 있습니다.</p>' + A("diagnosis", "진단 시작", "sj-btn") + "</div>";
    logAccess("self", me.name, me, "report_web");
    return '<div class="sj-actions sj-noprint" style="margin-bottom:16px"><button class="sj-btn" data-do="pdf">PDF 내려받기</button>' + A("plan", "실행 계획으로", "sj-btn ghost") + '</div><div id="pv-pdf"></div>' + reportDoc(me, att);
  }

  /* ── 관리자 ── */
  function funnel() {
    return PROGRAMS.map(function (g) {
      var ps = people.filter(function (p) { return p.program === g.code; });
      return {
        program: g.code, name: g.name, issued: ps.length,
        logged_in: ps.filter(function (p) { return p.lastLogin != null; }).length,
        started: ps.filter(function (p) { return p.att; }).length,
        scored: ps.filter(function (p) { return p.att && p.att.status === "scored"; }).length,
        pdf: ps.filter(function (p) { return p.pdf > 0; }).length,
        consented: ps.filter(function (p) { return p.consent === true; }).length,
      };
    });
  }
  function pageAdmin() {
    var rows = funnel();
    var tot = rows.reduce(function (s, r) { Object.keys(s).forEach(function (k) { s[k] += r[k]; }); return s; }, { issued: 0, logged_in: 0, started: 0, scored: 0, pdf: 0, consented: 0 });
    var scoredPeople = people.filter(function (p) { return latestScored(p); });
    var areas = {}; var ranges = {};
    scoredPeople.forEach(function (p) {
      var r = latestScored(p).result;
      Array.from(new Set(r.profile.job_areas)).forEach(function (c) { areas[c] = (areas[c] || 0) + 1; });
      ranges[r.profile.region_range || "UNDECIDED"] = (ranges[r.profile.region_range || "UNDECIDED"] || 0) + 1;
    });
    var maxArea = Math.max.apply(null, [1].concat(Object.keys(areas).map(function (k) { return areas[k]; })));
    var virt = people.filter(function (p) { return p.virtual; }).length;
    var rangeLabel = {}; instrument.region_ranges.options.forEach(function (o) { rangeLabel[o.code] = o.label; });
    var h = '<h1>관리자 대시보드</h1><p class="lead">세종일자리경제진흥원 (시연) · 사업 ' + rows.length + "개 · 참여자 " + tot.issued + "명</p>" +
      '<p class="sj-note warn">시연 자료입니다. 참여자 ' + tot.issued + "명 중 " + virt + "명은 시드로 만든 <b>가상 참여자</b>이고 응답도 가짜입니다. PDF 생성 수는 실제로 뽑은 것만 셉니다. 5명 미만 칸은 가립니다(기준 " + MIN_CELL + "명).</p>" +
      '<section class="sj-section sj-grid c4"><div class="sj-card sj-kpi"><b>' + tot.issued + '</b><span>계정 발급</span></div><div class="sj-card sj-kpi"><b>' + tot.started + "</b><span>진단 시작 (" + pct(tot.started, tot.issued) +
      ')</span></div><div class="sj-card sj-kpi"><b>' + tot.scored + "</b><span>진단 완료 (" + pct(tot.scored, tot.issued) + ')</span></div><div class="sj-card sj-kpi"><b>' + tot.pdf + "</b><span>결과지 PDF 생성 인원</span></div></section>" +
      '<section class="sj-section sj-card"><h2>사업 단위 참여 현황</h2><div class="sj-scroll"><table class="sj-table"><thead><tr><th>사업</th><th class="num">발급</th><th class="num">첫 로그인</th><th class="num">진단 시작</th><th class="num">진단 완료</th><th class="num">PDF 생성</th><th class="num">상담 열람 동의</th><th class="num">완료율</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return "<tr><td><b>" + esc(r.name) + '</b><div class="small muted">' + r.program + '</div></td><td class="num">' + N(mask(r.issued)) + '</td><td class="num">' + N(mask(r.logged_in)) + '</td><td class="num">' + N(mask(r.started)) +
          '</td><td class="num">' + N(mask(r.scored)) + '</td><td class="num">' + N(mask(r.pdf)) + '</td><td class="num">' + N(mask(r.consented)) + '</td><td class="num">' + (r.issued >= MIN_CELL ? pct(r.scored, r.issued) : "-") + "</td></tr>";
      }).join("") + '</tbody></table></div><p class="small muted" style="margin-top:8px">취업 여부·지역 정주 같은 결과 성과는 이 플랫폼이 산출하지 않습니다. 진흥원 행정 자료로 확정합니다.</p></section>';
    h += '<div class="sj-grid c2 sj-section"><section class="sj-card"><h2>희망 직무 관심 분야 (완료자)</h2>' + (scoredPeople.length === 0 ? '<p class="muted">아직 완료한 사람이 없습니다.</p>' : "") +
      instrument.job_areas.map(function (j) {
        var n = areas[j.code] || 0, c = mask(n);
        return '<div class="sj-bar"><span>' + esc(j.name) + '</span><span class="track"><i style="width:' + (c.masked ? 0 : (n / maxArea) * 100) + '%"></i></span><span class="small" style="text-align:right">' + N(c) + "</span></div>";
      }).join("") + '</section><section class="sj-card"><h2>희망 근무 지역 범위 (완료자)</h2>' +
      Object.keys(ranges).sort().map(function (code) {
        var n = ranges[code], c = mask(n);
        return '<div class="sj-bar"><span>' + esc(rangeLabel[code] || code) + '</span><span class="track"><i style="width:' + (c.masked ? 0 : (n / Math.max(1, tot.scored)) * 100) + '%"></i></span><span class="small" style="text-align:right">' + N(c) + "</span></div>";
      }).join("") + '<h2 style="margin-top:18px">판단별 \'경험으로 확인\' 인원</h2>' +
      AXES.map(function (ax) {
        var n = scoredPeople.filter(function (p) { var a = latestScored(p).result.axes.find(function (x) { return x.axis === ax; }); return a && (a.state === "CONFIRMED" || a.state === "PARTIAL"); }).length;
        var of = scoredPeople.length, c = mask(n);
        return '<div class="sj-bar"><span>' + esc((axisInfo[ax] || {}).name || ax) + '</span><span class="track"><i style="width:' + (c.masked ? 0 : (n / Math.max(1, of)) * 100) + '%"></i></span><span class="small" style="text-align:right">' + N(c) + "</span></div>";
      }).join("") + "</section></div>";
    var acc = S.access.filter(function (x) { return x.actor_kind !== "self"; }).slice(0, 8);
    h += '<section class="sj-section sj-card"><h2>최근 결과 열람 기록 (상담사·관리자)</h2>' + (acc.length === 0 ? '<p class="muted small">아직 없습니다. 상담사로 들어가 결과를 열거나 막혀 보면 여기에 남습니다.</p>' :
      '<div class="sj-scroll"><table class="sj-table"><thead><tr><th>시각</th><th>누가</th><th>대상</th><th>무엇</th><th>비고</th></tr></thead><tbody>' +
      acc.map(function (x) {
        return '<tr><td class="small">' + minute(x.at) + "</td><td>" + esc(x.actor) + " (" + x.actor_kind + ")</td><td>" + esc(x.target_no || "-") + "</td><td>" + (x.what === "denied" ? badge("warn", "거절") : esc(x.what)) + '</td><td class="small muted">' + esc(x.reason || "") + "</td></tr>";
      }).join("") + "</tbody></table></div>") +
      '<div class="sj-actions">' + A("participants", "참여자 현황", "sj-btn ghost") + A("counselors", "상담사 권한·동의", "sj-btn ghost") + "</div></section>";
    return h;
  }

  var PF = { p: "", s: "" };
  var ST = { none: { t: "시작 전", c: "" }, in_progress: { t: "진행 중", c: "part" }, scored: { t: "완료", c: "ok" } };
  function attStatus(p) { var a = p === me ? me.att : p.att; return a ? a.status : "none"; }
  function pageParticipants() {
    var rows = people.slice().sort(function (a, b) { return a.no < b.no ? -1 : 1; })
      .filter(function (r) { return (!PF.p || r.program === PF.p) && (!PF.s || attStatus(r) === PF.s); });
    var h = '<h1>참여자 현황</h1><p class="lead">진단 상태·PDF·열람·동의만 보여 줍니다. <b>개인 결과 내용은 이 화면에 없습니다.</b> 결과는 본인이 동의한 경우 배정된 상담사만 엽니다.</p>' +
      '<section class="sj-card sj-section"><h2>참여자 계정 발급</h2><form class="sj-form" data-act="issue"><div class="sj-grid c3"><div class="sj-field"><label for="name">이름</label><input id="name" name="name" type="text"></div>' +
      '<div class="sj-field"><label for="participant_no">참여번호</label><input id="participant_no" name="participant_no" type="text" placeholder="예: SJ-A-021"></div><div class="sj-field"><label for="program">사업</label><select id="program" name="program">' +
      PROGRAMS.map(function (p) { return '<option value="' + p.code + '">' + esc(p.name) + "</option>"; }).join("") + "</select></div></div>" +
      (S.issuedNote ? S.issuedNote : "") + '<div><button class="sj-btn" type="submit">계정 발급</button></div></form></section>';
    S.issuedNote = null;
    h += '<form class="sj-card sj-section sj-form" data-act="pfilter"><div class="sj-grid c3"><div class="sj-field"><label for="p">사업</label><select id="p" name="p"><option value="">전체</option>' +
      PROGRAMS.map(function (p) { return '<option value="' + p.code + '"' + (PF.p === p.code ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") +
      '</select></div><div class="sj-field"><label for="s">진단 상태</label><select id="s" name="s">' +
      [["", "전체"], ["none", "시작 전"], ["in_progress", "진행 중"], ["scored", "완료"]].map(function (x) { return '<option value="' + x[0] + '"' + (PF.s === x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") +
      '</select></div><div class="sj-field"><span class="lab">&nbsp;</span><button class="sj-btn small" type="submit">적용</button></div></div></form>';
    h += '<section class="sj-card sj-section"><h2>' + rows.length + '명</h2><div class="sj-scroll"><table class="sj-table"><thead><tr><th>참여번호</th><th>이름</th><th>사업</th><th>첫 로그인</th><th>진단</th><th>시작</th><th>완료</th><th class="num">PDF</th><th>최근 PDF</th><th class="num">열람</th><th>상담 동의</th><th>상담사</th><th>계정</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var a = r === me ? me.att : r.att;
        var st = ST[a ? a.status : "none"];
        var c = COUNSELORS.find(function (x) { return x.id === r.counselor; });
        return "<tr><td>" + esc(r.no) + "</td><td>" + esc(r.name) + '</td><td class="small">' + r.program + '</td><td class="small">' + day(r.lastLogin) + "</td><td>" + badge(st.c, st.t) +
          '</td><td class="small">' + (a ? day(a.startedAt) : "-") + '</td><td class="small">' + (a && a.scoredAt ? day(a.scoredAt) : "-") + '</td><td class="num">' + r.pdf + '</td><td class="small">-</td><td class="num">' + r.views + "</td><td>" +
          (r.consent === true ? badge("ok", "동의") : r.consent === false ? badge("warn", "철회") : badge("", "없음")) + '</td><td class="small">' + esc(c ? c.name : "-") + "</td><td>" +
          '<button class="sj-btn ghost small" data-pstat="' + r.id + '">' + (r.status === "active" ? "중지" : "다시 열기") + "</button></td></tr>";
      }).join("") + "</tbody></table></div></section>";
    return h;
  }

  function pageCounselors() {
    var cn = { granted: 0, withdrawn: 0, none: 0 };
    people.forEach(function (p) { cn[p.consent === true ? "granted" : p.consent === false ? "withdrawn" : "none"]++; });
    var h = '<h1>상담사 권한과 동의</h1><p class="lead">상담사는 <b>배정된 참여자</b>가 <b>본인 동의</b>를 했고 <b>기관 설정이 허용</b>할 때만 그 사람의 결과를 엽니다. 열 때마다, 그리고 거절될 때마다 기록이 남습니다. 관리자는 결과 내용을 보지 않습니다.</p>' +
      '<section class="sj-section sj-grid c3"><div class="sj-card sj-kpi"><b>' + cn.granted + '</b><span>열람 동의</span></div><div class="sj-card sj-kpi"><b>' + cn.withdrawn + '</b><span>동의 철회</span></div><div class="sj-card sj-kpi"><b>' + cn.none + "</b><span>응답 없음</span></div></section>" +
      '<section class="sj-section sj-card"><h2>상담사</h2><div class="sj-scroll"><table class="sj-table"><thead><tr><th>상담사</th><th>아이디</th><th class="num">배정</th><th class="num">그중 동의</th><th>열람 가능 조건</th></tr></thead><tbody>' +
      COUNSELORS.map(function (c) {
        var as = people.filter(function (p) { return p.counselor === c.id; });
        return "<tr><td>" + esc(c.name) + '</td><td class="small">' + c.login + '</td><td class="num">' + as.length + '</td><td class="num">' + as.filter(function (p) { return p.consent === true; }).length +
          '</td><td class="small">같은 기관 · 배정 · 본인 동의(SJ-DEMO-COUNSELOR-1) · 기관 허용</td></tr>';
      }).join("") + "</tbody></table></div></section>" +
      '<form class="sj-section sj-card sj-form" data-act="assign"><h2>배정 바꾸기</h2><div class="sj-grid c3"><div class="sj-field"><label for="participant">참여자</label><select id="participant" name="participant">' +
      people.slice().sort(function (a, b) { return a.no < b.no ? -1 : 1; }).map(function (p) { return '<option value="' + p.id + '">' + esc(p.no + " · " + p.name) + "</option>"; }).join("") +
      '</select></div><div class="sj-field"><label for="counselor">상담사</label><select id="counselor" name="counselor">' + COUNSELORS.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + "</option>"; }).join("") +
      '</select></div><div class="sj-field"><span class="lab">&nbsp;</span><button class="sj-btn small" type="submit">배정</button></div></div><p class="small muted">배정은 동의를 대신하지 않습니다. 동의는 참여자 본인만 하고, 언제든 철회합니다.</p></form>';
    return h;
  }

  /* ── 상담사 (시연 상담사 1 로 본다) ── */
  function pageCounselor() {
    var rows = people.filter(function (p) { return p.counselor === "c1"; }).sort(function (a, b) { return a.no < b.no ? -1 : 1; });
    return '<h1>상담사 · 내 담당 참여자</h1><p class="lead">결과는 참여자 본인이 동의한 경우에만 열립니다. 동의가 없으면 진행 상태만 보입니다. 여는 기록은 참여자 본인과 기관 관리자가 확인할 수 있습니다.</p>' +
      '<section class="sj-card sj-section"><div class="sj-scroll"><table class="sj-table"><thead><tr><th>참여번호</th><th>이름</th><th>사업</th><th>진단</th><th>열람 동의</th><th></th></tr></thead><tbody>' +
      rows.map(function (r) {
        var st = attStatus(r);
        return "<tr><td>" + esc(r.no) + "</td><td>" + esc(r.name) + '</td><td class="small">' + r.program + "</td><td>" +
          (st === "scored" ? badge("ok", "완료") : st === "in_progress" ? badge("part", "진행 중") : badge("", "시작 전")) + "</td><td>" +
          (r.consent ? badge("ok", "동의") : r.consent === false ? badge("warn", "철회") : badge("", "없음")) + "</td><td>" +
          (r.consent && st === "scored" ? A("cv-" + r.id, "결과 열기", "sj-btn small") : A("cv-" + r.id, "상태 보기", "sj-btn ghost small")) + "</td></tr>";
      }).join("") + "</tbody></table></div>" + (rows.length === 0 ? '<p class="muted">배정된 참여자가 없습니다.</p>' : "") + "</section>";
  }
  function pageCounselorView(id) {
    var p = people.find(function (x) { return x.id === id; });
    var reason = !p ? "이 기관의 참여자가 아닙니다." : p.counselor !== "c1" ? "배정된 참여자가 아닙니다." : !p.consent ? "참여자가 결과 열람에 동의하지 않았습니다." : null;
    if (reason) {
      logAccess("counselor", COUNSELORS[0].name, p, "denied", reason);
      return '<div class="sj-card" style="max-width:640px"><h1>결과를 열 수 없습니다</h1><p>' + (p ? esc(p.no + " · " + p.name) : "참여자") + '</p><p class="sj-note warn">' + esc(reason) +
        '</p><p class="small muted">이 시도도 기록에 남았습니다. 동의는 참여자 본인만 할 수 있습니다.</p>' + A("counselor", "담당 목록", "sj-btn ghost") + "</div>";
    }
    var att = latestScored(p);
    if (!att) return '<div class="sj-card"><h1>' + esc(p.name) + "</h1><p>아직 제출한 진단이 없습니다.</p>" + A("counselor", "담당 목록", "sj-btn ghost") + "</div>";
    logAccess("counselor", COUNSELORS[0].name, p, "report_web");
    return '<div class="sj-note" style="margin-bottom:16px">상담사 열람 · 본인 동의 확인됨 · 이 열람은 기록됩니다. 경험 메모 원문은 상담 범위에 따라 본인과 함께 확인하세요. ' + A("counselor", "담당 목록") + "</div>" + reportDoc(p, att);
  }

  /* ── 틀 ── */
  function navFor(role) {
    if (role === "participant") return [["me", "내 대시보드"], ["diagnosis", "진단"], ["experience", "경험 기록"], ["result", "결과"], ["explore", "세종 기업 탐색"], ["plan", "실행 계획"]];
    if (role === "counselor") return [["counselor", "상담사"]];
    if (role === "admin") return [["admin", "관리자 대시보드"], ["participants", "참여자"], ["counselors", "상담사·동의"]];
    return [["explore", "세종 기업 탐색"]];
  }
  var WHO = { participant: me.name, counselor: COUNSELORS[0].name, admin: "시연 관리자" };
  var NEED = { me: "participant", diagnosis: "participant", run: "participant", experience: "participant", result: "participant", plan: "participant", report: "participant",
    admin: "admin", participants: "admin", counselors: "admin", counselor: "counselor" };
  var HOMEOF = { participant: "me", counselor: "counselor", admin: "admin", anon: "home" };

  var app = document.getElementById("app");
  var FLAG = {};
  function render() {
    var token = (location.hash || "#home").slice(1) || "home";
    var need = token.indexOf("cv-") === 0 ? "counselor" : NEED[token];
    var body;
    if (need && S.role !== need) body = pageLogin(S.role !== "anon");
    else if (token === "home") body = pageHome();
    else if (token === "login") body = pageLogin(false);
    else if (token === "me") body = pageMe();
    else if (token === "diagnosis") body = pageDiagnosis(FLAG.areaErr);
    else if (token === "run") body = pageRun(FLAG.incomplete);
    else if (token === "experience") body = pageExperience(FLAG.expErr);
    else if (token === "result") body = pageResult(FLAG.isNew);
    else if (token === "explore") body = pageExplore();
    else if (token === "plan") body = pagePlan();
    else if (token === "report") body = pageReport();
    else if (token === "admin") body = pageAdmin();
    else if (token === "participants") body = pageParticipants();
    else if (token === "counselors") body = pageCounselors();
    else if (token === "counselor") body = pageCounselor();
    else if (token.indexOf("cv-") === 0) body = pageCounselorView(token.slice(3));
    else body = pageHome();
    FLAG = {};
    var nav = navFor(S.role).map(function (n) { return A(n[0], n[1], token === n[0] ? "on" : ""); }).join("") +
      (S.role !== "anon" ? '<span class="sj-who">' + esc(WHO[S.role]) + '</span><a href="#home" data-logout="1">로그아웃</a>' : A("login", "로그인"));
    var roles = [["anon", "로그인 전"], ["participant", "구직자"], ["counselor", "상담사"], ["admin", "관리자"]];
    app.innerHTML =
      '<div class="pv-bar"><div class="pv-in"><span class="pv-tag">화면 미리보기</span><span class="pv-txt">CareerMatri 세종 시연판의 실제 화면 코드·문구·진단 규칙을 브라우저 안에서 그대로 돌립니다. 서버·DB·PDF 는 없고 가상 자료만 씁니다. 진흥원 공식 서비스가 아닙니다.</span>' +
      '<span class="pv-roles" role="group" aria-label="보는 역할">' + roles.map(function (r) { return '<button data-role="' + r[0] + '" aria-pressed="' + (S.role === r[0]) + '">' + r[1] + "</button>"; }).join("") +
      '</span><button class="pv-reset" data-do="reset">처음부터</button></div></div>' +
      '<div class="sj"><div class="sj-demo-band">시연판입니다 · 진단 ' + esc(instrument.instrument_version) + '(검증 전 DEMO) · 기업 자료는 원문 재확인 전 · 가상 참여자 포함</div>' +
      '<header class="sj-head"><div class="sj-head-in"><a href="#' + HOMEOF.anon + '" class="sj-brand"><b>세종 일자리 역량 진단</b><small>세종일자리경제진흥원 × CareerMatri · 시연</small></a><nav class="sj-nav" aria-label="세종 메뉴">' + nav + "</nav></div></header>" +
      '<main class="sj-main">' + body + "</main>" +
      '<footer class="sj-foot"><div class="sj-foot-in"><span>이 서비스는 직업정보 제공입니다. 취업 알선·추천이 아니며, 기업에 개인 정보를 보내지 않습니다.</span><span>채용 여부는 확인하지 않습니다. 지원 전에 기업 누리집이나 고용24의 원 공고를 직접 확인하세요.</span><span>진단 결과는 총점이나 순위를 만들지 않습니다. 선발·평가에 쓰지 않습니다.</span></div></footer></div>';
  }
  function go(token) { if (location.hash.slice(1) === token) render(); else location.hash = token; window.scrollTo(0, 0); }
  window.addEventListener("hashchange", function () { render(); window.scrollTo(0, 0); });

  function formData(f) {
    var o = {};
    Array.prototype.forEach.call(f.elements, function (el) {
      if (!el.name || el.disabled) return;
      if (el.type === "checkbox") { if (el.checked) (o[el.name] = o[el.name] || []).push(el.value); }
      else if (el.type === "radio") { if (el.checked) o[el.name] = el.value; }
      else o[el.name] = el.value;
    });
    return o;
  }
  var EXAMPLE = [2, 2, 1, 1, 2, 1, 3, 2, 2, 2, 1, 1, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1, 1];

  app.addEventListener("click", function (e) {
    var t = e.target.closest("button, a"); if (!t) return;
    if (t.dataset.role) { S.role = t.dataset.role; if (S.role === "participant" && me.lastLogin == null) me.lastLogin = Date.now(); go(HOMEOF[S.role]); return; }
    if (t.dataset.logout) { e.preventDefault(); S.role = "anon"; go("home"); return; }
    if (t.dataset.ans) {
      var code = t.dataset.ans, v = Number(t.dataset.v), att = me.att;
      att.responses[code] = v;
      t.parentNode.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b === t)); });
      var sv = document.getElementById("sv-" + code); sv.textContent = "저장 중…";
      setTimeout(function () { sv.textContent = "저장됨"; }, 220);
      var done = Object.keys(att.responses).length;
      document.getElementById("pv-prog").textContent = done + " / " + TOTAL;
      document.getElementById("pv-bar").style.width = Math.round((done / TOTAL) * 100) + "%";
      return;
    }
    if (t.dataset.rm) { me.exps = me.exps.filter(function (x) { return x.id !== t.dataset.rm; }); render(); return; }
    if (t.dataset.toggle) { me.done[t.dataset.toggle] = !me.done[t.dataset.toggle]; render(); return; }
    if (t.dataset.pstat) { var p = people.find(function (x) { return x.id === t.dataset.pstat; }); p.status = p.status === "active" ? "disabled" : "active"; render(); return; }
    var d = t.dataset.do;
    if (d === "consent") { me.consent = !me.consent; me.consentAt = Date.now(); render(); return; }
    if (d === "fill") { ITEMS.forEach(function (it, i) { if (me.att.responses[it.code] === undefined) me.att.responses[it.code] = EXAMPLE[i % EXAMPLE.length]; }); render(); return; }
    if (d === "mine") { EX = { area: "", type: "", v: "", mine: true }; go("explore"); return; }
    if (d === "clearfilter") { EX = { area: "", type: "", v: "", mine: false }; render(); return; }
    if (d === "pdf") {
      var box = document.getElementById("pv-pdf");
      if (box) box.innerHTML = '<p class="pv-inline" style="margin-top:12px">미리보기에는 PDF 를 그리는 서버(Chromium)가 없어 파일을 만들지 않습니다. 실제 화면에서는 이 결과지 쪽을 그대로 인쇄한 11쪽 PDF 가 내려받아지고, 생성 기록이 관리자 집계에 들어갑니다.</p>';
      return;
    }
    if (d === "reset") { location.hash = "home"; location.reload(); }
  });

  app.addEventListener("submit", function (e) {
    var f = e.target; e.preventDefault();
    var o = formData(f), act = f.dataset.act;
    if (act === "start") {
      var areas = (o.job_areas || []).slice(0, 3);
      if (!areas.length) { FLAG.areaErr = true; render(); window.scrollTo(0, 0); return; }
      var profile = { audience: o.audience && o.audience !== "none" ? o.audience : null, job_areas: areas, region_range: o.region_range || "ADJACENT",
        skills: (o.skills || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 20) };
      if (me.att && me.att.status === "in_progress") me.att.profile = profile;
      else { me.att = { status: "in_progress", profile: profile, responses: {}, startedAt: Date.now() }; me.attempts.push(me.att); }
      go("run"); return;
    }
    if (act === "submit") {
      if (Object.keys(me.att.responses).length < TOTAL) { FLAG.incomplete = true; render(); window.scrollTo(0, 0); return; }
      me.att.result = analyze({ instrument: instrument, axisInfo: axisInfo, responses: me.att.responses, experiences: me.exps, profile: me.att.profile });
      me.att.status = "scored"; me.att.scoredAt = Date.now(); me.done = {};
      FLAG.isNew = true; go("result"); return;
    }
    if (act === "exp") {
      if (!o.kind || !(o.title || "").trim()) { FLAG.expErr = true; render(); return; }
      me.exps.unshift({ id: "e" + (S.expSeq++), kind: o.kind, title: o.title.trim().slice(0, 120), org_name: (o.org_name || "").trim(), period_text: (o.period_text || "").trim(),
        job_area: o.job_area || null, role_text: (o.role_text || "").trim(), checks: o.checks || [],
        skills: (o.skills || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean) });
      S.saved.exp = true; render(); window.scrollTo(0, 0); return;
    }
    if (act === "filter") { EX = { area: o.area || "", type: o.type || "", v: o.v || "", mine: !!(o.mine && o.mine.length) }; render(); return; }
    if (act === "pfilter") { PF = { p: o.p || "", s: o.s || "" }; render(); return; }
    if (act === "issue") {
      var name = (o.name || "").trim().slice(0, 40), no = (o.participant_no || "").trim().toUpperCase().slice(0, 20);
      if (!name || !/^[A-Z0-9-]{3,20}$/.test(no)) S.issuedNote = '<p class="sj-error" role="alert">이름과 참여번호(영문·숫자·-, 3~20자)를 적어 주세요.</p>';
      else if (people.some(function (p) { return p.no === no; })) S.issuedNote = '<p class="sj-error" role="alert">이미 쓰는 참여번호입니다.</p>';
      else {
        people.push({ id: "n" + no, no: no, name: name, program: o.program, status: "active", virtual: true, counselor: null, lastLogin: null, consent: null, att: null, exps: [], pdf: 0, views: 0 });
        S.issuedNote = '<div class="sj-note" role="status"><b>' + esc(name) + "</b> 계정을 만들었습니다. 아이디 <code>" + esc(no.toLowerCase()) + "</code> · 임시 비밀번호는 실제 화면에서 이 자리에 한 번만 보입니다(미리보기에서는 만들지 않습니다).</div>";
      }
      render(); return;
    }
    if (act === "assign") {
      var pp = people.find(function (x) { return x.id === o.participant; }); if (pp) pp.counselor = o.counselor; render(); return;
    }
  });

  render();
})();
