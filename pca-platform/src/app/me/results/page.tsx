import Link from "next/link";
import { currentUser, requireUser } from "@/lib/session";
import { majorNameOf } from "@/lib/me-v3/major-name";
import { currentState, resultHistory, activeCoreOrPick } from "@/lib/me-v3/platform";
import { domainName, majorNameIn } from "@/lib/me-v3/runtime/session";
import { wsLang, type WsLang } from "@/lib/me-v3/ws-lang";
import { wsSay, type WsSay } from "@/lib/me-v3/ws-say";
import { recentChangeKo } from "@/lib/me-v3/change-text.ko";
import { registry } from "@/lib/me-v3/core-registry";
import { CmShell, CmHead } from "../shell";
import { EmptyState } from "../ui";

export async function generateMetadata() {
  const u = await currentUser().catch(() => null);
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
  const [st, rows] = await Promise.all([currentState(user.id), resultHistory(user.id)]);
  const major = en ? majorEn(st.core) : majorNameOf(st.core);
  const snaps = rows.filter((r) => r.kind === "SNAPSHOT");
  /* 세 화면이 같이 쓰는 문장(규격 §8). 여기서 따로 적으면 같은 변화가
     홈과 현재 상태와 이 쪽에서 서로 다른 말로 읽힌다 */
  const change = recentChangeKo(st, (td) => domainName(core, td, lang), 2, lang);

  return (
    <CmShell active="/me/results" title={t("결과 기록")} lang={lang}
      major={major}
      bar={<Link className="cm-btn" href="/me/state">{t("현재 상태")}</Link>}>
      <CmHead
        title={t("검사 당시 결과와 현재 상태")}
        lead={t("검사 당시 결과와 현재 상태를 따로 볼 수 있습니다.")}
      />

      {!snaps.length ? (
        <EmptyState>
          <b>{t("아직 완료한 검사가 없습니다.")}</b>{" "}
          {t("검사를 한 번 끝내면 그날의 결과가 날짜와 함께 한 줄씩 나옵니다.")}
          <p style={{ marginTop: 10 }}><Link href="/cores">{t("검사 시작하기")}</Link></p>
        </EmptyState>
      ) : null}

      {/* ── 현재 상태. 점선 테두리로 `변한다` 를 생김새로 말한다 ── */}
      {st.model ? (
        <section className="cm-live">
          <header>
            <h2>{t("현재 상태")}</h2>
            <span>
              {st.recomputed_at
                ? t("{at} 에 새 경험을 더했습니다", { at: day(st.recomputed_at) ?? "" })
                : t("아직 새 경험을 더한 적이 없어 검사 당시 결과와 같습니다")}
            </span>
          </header>
          {/* **축 이름을 늘어놓지 않는다**(규격 §8). 전에는 이 자리가
              `기구·제품 설계 · 문제 정의 / 기구·제품 설계 · 직접 판단 외 2`
              였다. 우리가 재는 칸의 이름을 빗금으로 이어 붙인 줄이고,
              읽는 사람에게는 **무엇이 달라졌는지**가 한 글자도 없다.
              문장은 세 화면이 같이 쓰는 함수가 든다(홈 · 저장 직후 ·
              현재 상태와 같은 말이어야 한다) */}
          <div className="cm-rows">
            {change.lines.length ? change.lines.map((line) => (
              <p className="cm-row" key={line}><b>{line}</b></p>
            )) : (
              <p className="cm-row"><b>{t("아직 달라진 것이 없습니다.")}</b></p>
            )}
            {change.more ? (
              <p className="cm-none">{t("그 밖에 {n}가지가 더 달라졌습니다.", { n: change.more })}</p>
            ) : null}
            <p className="cm-row"><b>{t("아직 부족한 것")}</b>
              <span>{st.gaps.length
                ? t("{n}곳#gap", { n: st.gaps.length })
                : t("지금 잡힌 것이 없습니다")}</span></p>
          </div>
          <p className="cm-live-note">{t("이 줄은 경험을 더하면 바뀝니다.")}</p>
          <div className="cm-acts">
            <Link className="cm-btn is-primary" href="/me/state">{t("현재 상태 보기")}</Link>
            {st.pending > 0 ? (
              <Link className="cm-btn" href="/me/recompute">{t("새 경험 더하기")}</Link>
            ) : null}
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
                    <span className="cm-lockmark">{t("고정됨")}</span>
                  </span>
                  <span className="cm-item-meta">
                    {/* **고르는 데 쓰이는 수 하나다**(규격 §15). 축의
                        개수는 이 줄에서 할 일을 정해 주지 않는다 */}
                    <span>
                      {r.domains !== null
                        ? t("근거가 확인된 영역 {n}곳", { n: r.domains })
                        : t("그날의 응답 그대로 고정되어 있습니다")}
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
            <summary>{t("당시 판본 보기")}</summary>
            <div className="cm-rows">
              {Object.entries(st.model?.provenance.module_versions ?? {}).map(([k, v]) => (
                <p className="cm-row" key={k}><b>{verKo(t)[k] ?? k}</b>
                  <span>{v === null ? t("없음") : verSay(k, String(v), lang)}</span></p>
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
function verSay(key: string, value: string, lang: WsLang = "ko"): string {
  if (key !== "core_version") return value;
  const hit = registry().cores.find((c) => c.code === value);
  if (!hit) return value;
  return lang === "en" ? (hit.name_en || hit.name_ko) : hit.name_ko;
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
