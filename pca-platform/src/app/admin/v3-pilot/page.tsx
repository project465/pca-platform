import Link from "next/link";
import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import {
  MIN_CELL, pilotRows, purgeDue, type RowFilter,
} from "@/lib/me-v3/pilot/store";
import { WAVE_KO, WAVES } from "@/lib/me-v3/pilot/enroll";
import { FUNNEL, funnelByWave } from "@/lib/me-v3/pilot/funnel";
import {
  blockTimes, ISSUE_KO, issues, metrics, mixedVersions, ownershipSpread,
  slowItems, VERSION_DECIDES, type IssueKind,
} from "@/lib/me-v3/pilot/analyze";
import InviteForm from "./invite";
import SyncButton from "./sync";

export const metadata = { title: "V3 파일럿 · CareerMatri" };
export const dynamic = "force-dynamic";

const STAGE_KO: Record<string, string> = {
  bachelor: "학부", master: "석사", phd: "박사", postdoc: "포닥",
};
const FIELD_KO: Record<string, string> = {
  STEM: "이공계", HUMANITIES_SOCIAL: "인문·사회",
  BUSINESS: "경영·상경", OTHER_INTERDISCIPLINARY: "그 밖·융합",
};
/** 묶음 코드를 운영 화면에서도 사람 말로. **코드를 눈에 띄게 두지 않는다** */
const ZONE_KO: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: "근거 섬",
  Z2_EVIDENCE_INCOMPLETE: "근거 덜 섬",
  Z3_EVIDENCE_LOW_INTEREST: "관심 낮음",
  Z4_INSUFFICIENT_EVIDENCE: "판단 어려움",
  NOT_EXPLORED: "안 물음",
};
const QUALITY_KO: Record<string, string> = {
  OK: "정상", REVIEW: "다시 볼 것", LOW_VARIANCE: "차이 적음", INCONSISTENT: "엇갈림",
};
/** 퍼널 걸음을 사람 말로. **화면에 코드를 적지 않는다** */
const STEP_KO: Record<string, string> = {
  pilot_link_opened: "초대 링크 열었다",
  assessment_started: "검사 시작",
  basic_completed: "BASIC 끝냄",
  standard_completed: "STANDARD 끝냄",
  pro_completed: "PRO 끝냄",
  result_opened: "결과 열었다",
  domain_detail_viewed: "영역 자세히 봤다",
  evidence_viewed: "근거 절 봤다",
  action_viewed: "할 일 절 봤다",
  action_saved: "할 일 담았다",
  pdf_opened: "종이 뽑았다",
  feedback_started: "의견 화면 들어왔다",
  feedback_submitted: "의견 보냈다",
};

function zonesKo(z: Record<string, number> | null): string {
  if (!z) return "—";
  return Object.entries(z)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, n]) => `${ZONE_KO[k] ?? k} ${n}`)
    .join(" · ") || "—";
}

function mins(sec: number | null): string {
  if (sec === null) return "—";
  return `${Math.floor(sec / 60)}분 ${String(sec % 60).padStart(2, "0")}초`;
}

/** 분포는 **중앙값과 사분위로 적는다.** 평균만 보면 한 사람이 표를 끈다 */
function dist(s: { n: number; p25: number | null; median: number | null; p75: number | null }): string {
  if (!s.n) return "—";
  if (s.median === null) return `${s.n}명`;
  const m = `${Math.round(s.median / 60)}분`;
  if (s.p25 === null || s.p75 === null) return `${m} (${s.n}명)`;
  return `${m} · ${Math.round(s.p25 / 60)}~${Math.round(s.p75 / 60)}분 (${s.n}명)`;
}

const TIERS = ["BASIC", "STANDARD", "PRO"];
const DONE_KO: Record<string, string> = {
  done: "끝낸 사람", open: "하는 중", none: "시작 전",
};

/**
 * 본 파일럿 한 표.
 *
 * **거르는 자리를 넷으로 둔다**(wave · 등급 · 진행 · 손볼 일). 스무 명에서
 * 서른 명을 보는 자리에 검색과 내보내기를 달면, 파일럿이 끝난 뒤 아무도
 * 안 쓰는 화면이 하나 남는다. 여기서 답해야 하는 물음은 다섯이다. 누가
 * 끝냈는가 · 얼마나 걸렸는가 · 결과가 나왔는가 · 의견을 적었는가 · 오늘
 * 손볼 것이 무엇인가.
 *
 * **이름을 내보내지 않는다.** 줄마다 서는 것은 가명이고, 전공명은 이 표에
 * 아예 뽑지 않는다(준식별자라서 학위·계열과 같이 놓으면 사람이 좁혀진다).
 *
 * **다섯 명이 안 되는 묶음은 평균을 내지 않는다.** 가려서 보여 주는 것이
 * 아니라 값을 만들지 않는다. 값이 없어야 캡처에도 안 남는다.
 */
export default async function V3PilotPage({
  searchParams,
}: {
  searchParams: Promise<{ wave?: string; tier?: string; done?: string; issue?: string }>;
}) {
  const user = await requireRole(["superadmin"]);
  const sp = await searchParams;

  const waveNum = sp.wave && /^[0-3]$/.test(sp.wave) ? Number(sp.wave) : null;
  const tier = sp.tier && TIERS.includes(sp.tier) ? sp.tier : null;
  const done = sp.done === "done" || sp.done === "open" || sp.done === "none"
    ? sp.done : null;
  const onlyIssue = sp.issue === "1";
  const f: RowFilter = { wave: waveNum, tier, completion: done };

  const [rows, flags, purge, funnel, blocks, own, slow, mets, mixed] = await Promise.all([
    pilotRows(f),
    issues(waveNum ?? undefined),
    purgeDue(),
    funnelByWave(waveNum ?? undefined),
    blockTimes(waveNum ?? undefined),
    ownershipSpread(waveNum ?? undefined),
    slowItems(waveNum ?? undefined, 10),
    metrics(waveNum ?? undefined),
    mixedVersions(waveNum ?? undefined),
  ]);
  /* 결과에 닿는 판본이 섞인 것과 화면·문장이 섞인 것은 급한 정도가 다르다 */
  const mixedHard = mixed
    .filter((m) => (VERSION_DECIDES as readonly string[]).includes(m.key));

  const flagBy = new Map(flags.map((x) => [x.code, x.kinds]));
  const shown = onlyIssue ? rows.filter((r) => flagBy.has(r.code)) : rows;

  const link = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams();
    const cur: Record<string, string | null> = {
      wave: waveNum === null ? null : String(waveNum),
      tier, done, issue: onlyIssue ? "1" : null, ...patch,
    };
    for (const [k, v] of Object.entries(cur)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/admin/v3-pilot?${s}` : "/admin/v3-pilot";
  };

  const finished = rows.filter((r) => r.submitted_at).length;
  const withFeedback = rows.filter((r) => r.feedback > 0).length;
  const broken = rows.filter((r) => r.broken).length;

  return (
    <AdminShell user={user} current="/admin/v3-pilot">
      <h1>V3 파일럿</h1>
      <p className="sub">
        참가자 {rows.length}명 · 끝낸 응시 {finished} · 의견 {withFeedback} ·
        손볼 것 {flags.length} · 결과가 안 나온 응시 {broken}
      </p>

      {/*
        **판본이 섞인 것을 맨 위에 적는다.**
        Wave 가 끝날 때까지 결과에 닿는 셋을 올리지 않기로 했는데, 적어 둔
        규칙은 지켜지지 않는다. 섞이면 앞사람과 뒷사람의 결과를 같은 표에서
        읽을 수 없고, **끝난 뒤에는 되돌릴 수 없다.**

        화면과 문장이 섞인 것은 막을 일이 아니라 **읽을 때 알아야 하는
        일**이라 같은 칸에 두되 나눠 적는다.
      */}
      {mixed.length ? (
        <section className="panel">
          <h2>이 묶음에 판본이 섞여 있습니다</h2>
          {mixedHard.length ? (
            <p className="warn">
              결과에 닿는 판본이 갈렸습니다. 앞사람과 뒷사람의 결과를 한 표에서
              읽을 수 없습니다. 분석을 판본별로 나누고, 남은 Wave 동안은
              올리지 않습니다.
            </p>
          ) : (
            <p className="sub">
              결과에 닿는 판본은 한 벌입니다. 아래는 읽은 화면과 문장이
              갈린 것이라 판정에는 들어가지 않습니다.
            </p>
          )}
          <ul>
            {mixed.map((m) => (
              <li key={m.key}
                className={(VERSION_DECIDES as readonly string[]).includes(m.key)
                  ? "warn" : undefined}>
                {m.label} — {m.values.join(" · ")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel">
        <h2>초대</h2>
        <p className="sub">
          가명은 운영자가 보는 이름이고, 링크가 싣는 것은 한 번만 보여 주는
          열쇠입니다. 다음 번호를 눌러 봐도 남의 자리에 들어갈 수 없습니다.
        </p>
        <InviteForm />
      </section>

      <section className="panel">
        <h2>거르기</h2>
        <div className="v3filt">
          <p>
            <b>wave</b>
            <Link href={link({ wave: null })} className={waveNum === null ? "on" : ""}>전부</Link>
            {WAVES.map((w) => (
              <Link key={w} href={link({ wave: String(w) })}
                className={waveNum === w ? "on" : ""}>{WAVE_KO[w]?.split(" · ")[0]}</Link>
            ))}
          </p>
          <p>
            <b>등급</b>
            <Link href={link({ tier: null })} className={tier === null ? "on" : ""}>전부</Link>
            {TIERS.map((t) => (
              <Link key={t} href={link({ tier: t })} className={tier === t ? "on" : ""}>{t}</Link>
            ))}
          </p>
          <p>
            <b>진행</b>
            <Link href={link({ done: null })} className={done === null ? "on" : ""}>전부</Link>
            {Object.keys(DONE_KO).map((d) => (
              <Link key={d} href={link({ done: d })} className={done === d ? "on" : ""}>
                {DONE_KO[d]}
              </Link>
            ))}
          </p>
          <p>
            <b>손볼 일</b>
            <Link href={link({ issue: null })} className={!onlyIssue ? "on" : ""}>전부</Link>
            <Link href={link({ issue: "1" })} className={onlyIssue ? "on" : ""}>있는 줄만</Link>
          </p>
        </div>
      </section>

      {shown.length === 0 ? (
        <section className="panel">
          <h2>해당하는 줄이 없습니다</h2>
          <p className="sub">
            참가자가 초대 링크로 등록하면 여기에 섭니다. 숫자를 지어내지 않습니다.
          </p>
        </section>
      ) : (
        <section className="panel">
          <h2>참가자 <span className="count">{shown.length}명</span></h2>
          {/* 칸이 열넷이라 좁은 화면에서 쪽 전체가 옆으로 밀렸다.
              미는 것은 표 하나지 쪽이 아니다 */}
          <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>가명</th><th>wave</th><th>등급</th><th>학위</th><th>계열</th>
                <th>상태</th><th>시작</th><th>완료</th>
                <th>손 움직인 시간</th><th>처음부터 끝까지</th>
                <th>응답 품질</th><th>깊게 본 영역</th><th>답한 문항</th>
                <th>결과 묶음</th><th>결과 열람</th><th>의견</th><th>손볼 일</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const kinds = flagBy.get(r.code) ?? [];
                return (
                  <tr key={r.code}>
                    <td>
                      {r.attempt_id
                        ? <Link href={`/admin/v3-pilot/${r.attempt_id}`}><code>{r.code}</code></Link>
                        : <code>{r.code}</code>}
                    </td>
                    <td>{r.wave}</td>
                    <td>{r.tier ?? "—"}</td>
                    <td>{STAGE_KO[r.education_stage] ?? r.education_stage}</td>
                    <td>{r.major_field ? FIELD_KO[r.major_field] ?? r.major_field : "—"}</td>
                    <td>{r.status === "scored" ? "끝남"
                      : r.status === "submitted" ? "낸 뒤"
                        : r.status ? "하는 중" : "시작 전"}</td>
                    <td>{r.started_at?.slice(0, 16) ?? "—"}</td>
                    <td>{r.submitted_at?.slice(0, 16) ?? "—"}</td>
                    <td>{mins(r.active_seconds)}</td>
                    <td>{mins(r.wall_seconds)}</td>
                    <td>{r.response_quality
                      ? QUALITY_KO[r.response_quality] ?? r.response_quality : "—"}</td>
                    <td>{r.opened_deep}</td>
                    <td>{r.answered}</td>
                    <td>{zonesKo(r.zones)}</td>
                    <td>{r.result_opened ? "열었다" : "—"}</td>
                    <td>{r.feedback
                      ? `${r.feedback} / ${r.feedback_items}` : "—"}</td>
                    <td className={kinds.length ? "warn" : ""}>
                      {kinds.length
                        ? kinds.map((k: IssueKind) => ISSUE_KO[k]).join(" · ")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </section>
      )}

      <section className="panel">
        <h2>퍼널</h2>
        <p className="sub">
          사람 수로 셉니다. 같은 응시의 같은 걸음은 한 번만 적히므로 줄
          수가 곧 사람 수입니다. 비율은 여기서 만들지 않습니다. 바닥이 0 인데
          0% 를 찍으면 거짓말입니다. 검사 시작과 등급 완료는 응답과 제출 시각에서
          옮겨 적습니다. <SyncButton />
        </p>
        <div className="tablewrap">
        <table>
          <thead><tr><th>걸음</th><th>사람 수</th></tr></thead>
          <tbody>
            {FUNNEL.map((s) => (
              <tr key={s}>
                <td>{STEP_KO[s] ?? s}</td>
                <td>{funnel.find((x) => x.step === s)?.people ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      <section className="panel">
        <h2>묶음마다 걸린 시간</h2>
        <p className="sub">
          답이 찍힌 시각에서 읽습니다. 답 사이가 20분을 넘으면 그 틈은 빼고
          셉니다. 창을 열어 둔 채 밥을 먹고 온 것을 어려웠다고 읽으면 안 됩니다.
          중앙값과 1·3사분위를 적고 평균은 내지 않습니다.
        </p>
        {blocks.every((b) => b.n === 0) ? (
          <p className="sub">아직 응답이 없습니다.</p>
        ) : (
          <div className="tablewrap">
          <table>
            <thead><tr><th>묶음</th><th>중앙값 · 사분위</th></tr></thead>
            <tbody>
              {blocks.map((b) => (
                <tr key={b.block}><td>{b.label}</td><td>{dist(b)}</td></tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>보기 넷을 어떻게 골랐는가</h2>
        <p className="sub">
          네 단계가 실제로 갈려 쓰이는지 봅니다. 한 칸에 쏠리면 보기가 갈리지
          않은 것입니다. 응답이 스무 개가 안 되면 비율을 내지 않습니다.
        </p>
        <div className="tablewrap">
        <table>
          <thead><tr><th>보기</th><th>응답 수</th><th>비율</th></tr></thead>
          <tbody>
            {own.map((o) => (
              <tr key={o.label}>
                <td>{o.label}</td><td>{o.n}</td>
                <td>{o.share === null ? "적음" : `${o.share}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      <section className="panel">
        <h2>오래 걸린 문항</h2>
        <p className="sub">
          앞 답과의 틈과 고쳐 누른 수로 봅니다. 문항 번호는 내부 이름이라
          묶음 이름으로 적습니다. 키 입력이나 화면 녹화는 하지 않습니다.
        </p>
        {slow.length === 0 ? (
          <p className="sub">아직 응답이 없습니다.</p>
        ) : (
          <div className="tablewrap">
          <table>
            <thead>
              <tr><th>묶음</th><th>응답 수</th><th>중앙 초</th><th>고쳐 누른 수</th></tr>
            </thead>
            <tbody>
              {slow.map((s) => (
                <tr key={s.item_id}>
                  <td>{s.block}</td><td>{s.n}</td>
                  <td>{s.median_secs ?? "—"}</td>
                  <td>{s.changed}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>지표마다 따로</h2>
        <p className="sub">
          {MIN_CELL}명이 안 되는 지표는 평균을 내지 않고 수만 적습니다.
          여섯 지표를 한 숫자로 합치지 않습니다. 합치면 무엇을 고쳐야
          할지 알 수 없습니다. 값에 대한 답은 치러 본 값이 아닌 짐작입니다.
        </p>
        {mets.length === 0 ? (
          <p className="sub">아직 척도 응답이 없습니다.</p>
        ) : (
          <div className="tablewrap">
          <table>
            <thead><tr><th>묻는 것</th><th>응답 수</th><th>평균</th></tr></thead>
            <tbody>
              {mets.map((m) => (
                <tr key={m.code}>
                  <td>{m.label}</td><td>{m.n}</td>
                  <td>{m.mean ?? `${MIN_CELL}명 미만`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>지울 날</h2>
        <p className="sub">
          전공명과 가고 싶은 쪽은 준식별자라 보존 기한을 박아 둡니다.
          기한이 지난 줄은 <code>npm run v3:pilot:purge</code> 가 지웁니다.
        </p>
        {purge.length === 0 ? (
          <p className="sub">지울 것이 없습니다.</p>
        ) : (
          <div className="tablewrap">
          <table>
            <thead><tr><th>가명</th><th>지우는 날</th><th>남은 날</th></tr></thead>
            <tbody>
              {purge.map((p) => (
                <tr key={p.code}>
                  <td><code>{p.code}</code></td>
                  <td>{p.purge_after}</td>
                  <td>{p.left_days <= 0 ? "지날 때가 지났습니다" : `${p.left_days}일`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
