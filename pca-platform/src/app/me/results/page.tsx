import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, requireUser } from "@/lib/session";
import { majorNameOf } from "@/lib/me-v3/major-name";
import { currentState, resultHistory, activeCoreOrPick, experiencesOf } from "@/lib/me-v3/platform";
import { domainName, industryChoices, majorNameIn, roleChoices } from "@/lib/me-v3/runtime/session";
import { wsLang, type WsLang } from "@/lib/me-v3/ws-lang";
import { wsSay, type WsSay } from "@/lib/me-v3/ws-say";
import { recentChangeKo } from "@/lib/me-v3/change-text.ko";
import { registry } from "@/lib/me-v3/core-registry";
import { CmShell, CmHead } from "../shell";
import { EmptyState } from "../ui";

export async function generateMetadata() {
  const u = await currentUser().catch(() => null);
  /* 처음 비밀번호(학번 · 전화번호)를 아직 안 바꿨으면 바꾸는 화면만(2026-11-02 대표 결정 "첫 로그인 때 꼭 바꾸게") */
  if (u?.mustResetPw) redirect("/password/change");
  const t = wsSay(u ? await wsLang(u.id) : "ko");
  return { title: `${t("결과 기록")} · CareerMatri` };
}

/**
 * 결과 기록.
 *
 * **굳은 기록과 변하는 상태를 같은 카드 모양으로 그리지 않는다.** 전에는
 * `/me` 카드 한 줄에 둘이 나란히 있어서, 날짜만 다른 같은 값으로 읽혔다.
 * 여기서는 생김새를 갈라 둔다: 검사 당시 결과는 흰 카드에 자물쇠 표시,
 * 현재 상태는 점선 테두리에 `바뀔 수 있습니다`.
 *
 * **판본 코드를 앞세우지 않는다.** 접어 두고, 펼치면 보인다. 응시자에게
 * 필요한 것은 결과가 고정돼 있다는 사실이다.
 */
export default async function Results() {
  const user = await requireUser();
  const lang = await wsLang(user.id);
  const t = wsSay(lang);
  const en = lang === "en";
  const day = (s: string | null | undefined) => daySay(s, lang);
  /* 어느 전공의 사전을 읽을지는 **그 사람의 자료**가 정한다 */
  const core = await activeCoreOrPick(user.id);
  const [st, rows, exps] = await Promise.all([
    currentState(user.id), resultHistory(user.id), experiencesOf(user.id).catch(() => [])]);
  const major = en ? majorEn(st.core) : majorNameOf(st.core);
  const snaps = rows.filter((r) => r.kind === "SNAPSHOT");
  /* 세 화면이 같이 쓰는 문장(규격 §8). 여기서 따로 적으면 같은 변화가
     홈과 현재 상태와 이 쪽에서 서로 다른 말로 읽힌다 */
  const change = recentChangeKo(st, (td) => domainName(core, td, lang), 2, lang);

  return (
    <CmShell active="/me/results" title={t("결과 기록")} lang={lang}
      major={major}
      bar={<Link className="cm-btn" href="/me/state">{t("현재 상태")}</Link>}>
      {/* 제목 하나. 부제로 제목을 되풀이하지 않는다(2026-11-03 대표 "AI스럽다") */}
      <CmHead title={t("결과 기록")} />

      {!snaps.length ? (
        <EmptyState>
          <b>{t("완료한 검사 0건")}</b>
          <p style={{ marginTop: 10 }}><Link className="cm-btn is-primary" href="/cores">{t("검사 시작")}</Link></p>
        </EmptyState>
      ) : null}

      {/* ── 현재 상태. 점선 테두리로 `변한다` 를 생김새로 말한다 ──
          **반영 전이면 한 줄과 단추 하나**(2026-11-03 대표 "AI스럽다"). 달라진 것이 없는데 `아직 달라진 것이
          없습니다 · 아직 부족한 것 · 이 줄은 바뀝니다` 를 늘어놓지 않는다 */}
      {st.model ? (
        <section className="cm-live">
          <header>
            <h2>{t("현재 상태")}</h2>
            <span>
              {st.recomputed_at
                ? t("{at} 경험 더함", { at: day(st.recomputed_at) ?? "" })
                : t("검사 결과와 같음 (추가한 경험 {n}건)", { n: exps.length })}
            </span>
          </header>
          {st.recomputed_at ? (
            /* **축 이름을 늘어놓지 않는다**(규격 §8). 문장은 세 화면이 같이 쓰는 함수가 든다 */
            <div className="cm-rows">
              {change.lines.map((line) => (
                <p className="cm-row" key={line}><b>{line}</b></p>
              ))}
              {change.more ? (
                <p className="cm-none">{t("그 밖에 {n}가지가 더 달라졌습니다.", { n: change.more })}</p>
              ) : null}
              {st.gaps.length ? (
                <p className="cm-row"><b>{t("부족한 부분")}</b><span>{t("{n}곳#gap", { n: st.gaps.length })}</span></p>
              ) : null}
            </div>
          ) : null}
          <div className="cm-acts">
            {st.pending > 0 ? (
              <Link className="cm-btn is-primary" href="/me/recompute">{t("새 경험 더하기")}</Link>
            ) : (
              <Link className="cm-btn is-primary" href="/me/experience/new">{t("경험 추가")}</Link>
            )}
            <Link className="cm-btn" href="/me/state">{t("현재 상태 보기")}</Link>
          </div>
        </section>
      ) : null}

      {/* ── 검사 당시 결과. 왼쪽 날짜 띠와 자물쇠 ── */}
      {snaps.length ? (
        <>
          {/**
            * **기록은 줄로 쌓인다**(규격 §7·§13).
            *
            * 전에는 결과 하나가 왼쪽 날짜 칸이 달린 큰 카드였다. 응시가
            * 두 번만 되어도 그 모양은 **카드를 모아 둔 쪽**이 되고, 기록을
            * 훑어 하나를 고르는 일이 안 된다. 한 줄에 날짜와 전공과 등급과
            * 상태를 적고 오른쪽에 두 단추를 둔다.
            */}
          <p className="cm-listhead">{t("검사 당시 결과")}<em>{t("{n}건#count", { n: snaps.length })}</em></p>
          <ul className="cm-list">
            {snaps.map((r) => (
              <li className="cm-item" key={`${r.attempt_id}-${r.at}`}>
                <div className="cm-item-row">
                  <span className="cm-item-t">
                    <b>{day(r.at) ?? ""}</b>
                    <em>{major ?? t("전공 진단")} · {tierSay(r.tier ?? "", lang)}</em>
                    <span className="cm-lockmark">{t("검사 시점")}</span>
                  </span>
                  <span className="cm-item-meta">
                    {/* **고르는 데 쓰이는 수 하나다**(규격 §15). 축의
                        개수는 이 줄에서 할 일을 정해 주지 않는다 */}
                    <span>
                      {r.domains !== null ? t("확인된 영역 {n}", { n: r.domains }) : null}
                    </span>
                    <Link className="cm-btn" href={`/v3/${r.attempt_id}/result`}>
                      {t("결과 보기")}
                    </Link>
                    {/* **`Link` 로 걸지 않는다.** Next 가 화면에 들어온 `Link` 를
                        미리 불러오면서 종이를 한 벌씩 만들어 버린다 */}
                    <a className="cm-btn" href={`/v3/${r.attempt_id}/result/pdf`}>PDF</a>
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <details className="cm-fold">
            <summary>{t("검사 버전 정보")}</summary>
            <div className="cm-rows">
              {Object.entries(st.model?.provenance.module_versions ?? {}).map(([k, v]) => (
                <p className="cm-row" key={k}><b>{verKo(t)[k] ?? k}</b>
                  <span>{v === null ? t("없음") : verSay(k, String(v), lang, st.core)}</span></p>
              ))}
            </div>
          </details>
        </>
      ) : null}
    </CmShell>
  );
}

/**
 * 판본 값 가운데 **사람 말로 바꿀 수 있는 것**만 바꾼다.
 *
 * `core_version` 의 값은 `ME_CORE_V3` 인데 그 글자는 읽는 사람에게 아무
 * 뜻이 없다. 어느 전공의 검사였는지가 그 칸이 답해야 하는 것이라 전공
 * 이름을 적는다. 등록부에 없는 코드는 **지어내지 않고 그대로 적는다**:
 * 모르는 것을 그럴듯한 이름으로 바꾸면 되짚을 때 틀린 줄을 읽는다.
 *
 * 나머지 판본 글자는 그대로 둔다. 이 묶음이 접혀 있는 까닭이 그것이다:
 * **되짚어 보실 자리라** 고객지원에 적어 보낼 수 있는 값이어야 한다.
 */
function verSay(key: string, value: string, lang: WsLang = "ko", core?: string): string {
  if (key === "core_version") {
    const hit = registry().cores.find((c) => c.code === value);
    if (!hit) return value;
    return lang === "en" ? (hit.name_en || hit.name_ko) : hit.name_ko;
  }
  /* **내부 코드를 그대로 적지 않는다**(2026-11-02 진흥원 시험: `ROLE_CAE_V2.v2` · `me-v3-scoring.5`). 산업 · 직무는
     이름과 판 번호로, 나머지는 판 번호만 적는다. 번호를 못 찾으면 그대로 둔다(고객지원에 적어 보낼 값) */
  const n = /(?:[._-]v|\.|_V)(\d+(?:\.\d+)?)$/i.exec(value)?.[1] ?? /(\d+(?:\.\d+)?)$/.exec(value)?.[1];
  const nth = n ? (lang === "en" ? `v${n}` : `${n}판`) : "";
  if ((key === "industry_pack_version" || key === "role_pack_version") && core) {
    const code = value.replace(/\.v\d+$/i, "");
    const list = key === "industry_pack_version" ? industryChoices(core) : roleChoices(core);
    const name = list.find((x) => x.code === code)?.name;
    if (name) return nth ? `${name} · ${nth}` : name;
  }
  return nth || value;
}

/** 판본 칸 이름을 사람 말로. **내부 열쇠를 그대로 적지 않는다** */
const verKo = (t: WsSay): Record<string, string> => ({
  core_version: t("전공#ver"),
  item_bank_version: t("문항#ver"),
  scoring_version: t("판단 규칙"),
  assessment_ui_version: t("검사 화면"),
  assessment_copy_version: t("검사 문장"),
  result_model_version: t("결과 구성"),
  result_copy_version: t("결과 문장"),
  result_ui_version: t("결과 화면"),
  industry_pack_version: t("산업#ver"),
  role_pack_version: t("직무#ver"),
  region_layer_version: t("지역#ver"),
});

/** 날짜. 한국어는 받은 글자(`YYYY-MM-DD`) 그대로이고 영어는 `Oct 24, 2026` 이다 */
function daySay(s: string | null | undefined, lang: WsLang): string | null {
  if (!s) return s ?? null;
  if (lang !== "en" || !/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  const d = new Date(`${s.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

/** 영어판 전공 이름. **모르면 `null`** 이다(`majorNameOf` 와 같은 규칙) */
function majorEn(core: string | null | undefined): string | null {
  if (!core) return null;
  try { return majorNameIn(core, "en") || null; } catch { return null; }
}

/** 등급 이름. 한국어 화면은 코드를 그대로 적어 왔다 */
function tierSay(tier: string, lang: WsLang): string {
  if (lang !== "en") return tier;
  return ({ BASIC: "Basic", STANDARD: "Standard", PRO: "Pro" } as Record<string, string>)[tier] ?? tier;
}
