import Link from "next/link";
import { requireUser } from "@/lib/session";
import { queryOne } from "@/lib/db";
import { participantOf } from "@/lib/me-v3/pilot/store";
import { mark } from "@/lib/me-v3/pilot/funnel";
import { redeem, WAVE_KO } from "@/lib/me-v3/pilot/enroll";
import { latestAttemptOf, leavePilot, saveProfile } from "./actions";
import "../result.css";

export const metadata = { title: "파일럿 참가 · CareerMatri" };
export const dynamic = "force-dynamic";

const STAGE = [
  ["bachelor", "학부"], ["master", "석사"], ["phd", "박사"], ["postdoc", "박사후연구원"],
] as const;
const FIELD = [
  ["STEM", "이공계"], ["HUMANITIES_SOCIAL", "인문·사회"],
  ["BUSINESS", "경영·상경"], ["OTHER_INTERDISCIPLINARY", "그 밖·융합"],
] as const;
const STATUS = [
  ["enrolled", "재학"], ["on_leave", "휴학"], ["graduated", "졸업"],
  ["employed", "재직"], ["job_seeking", "구직 중"], ["other", "그 밖"],
] as const;
const LEVEL = [
  ["none", "거의 해 본 적 없음"], ["coursework", "수업·캡스톤"],
  ["lab", "연구실"], ["internship", "인턴·현장"], ["industry", "산업 경력"],
] as const;
const AREA = ["설계", "CAE", "생산", "시험·계측", "제어", "재료", "아직 모르겠다"];

const ERR: Record<string, string> = {
  invite: "초대 링크로 먼저 들어와 주세요.",
  stage: "학위를 골라주세요.",
  unknown: "이 링크로는 들어올 수 없습니다. 받으신 주소를 다시 확인해주세요.",
  used: "이미 다른 분이 쓴 링크입니다. 운영자에게 알려주세요.",
  expired: "기한이 지난 링크입니다. 운영자에게 알려주세요.",
};

/**
 * 파일럿 참가 등록.
 *
 * **응시 화면이 아니다.** 검사는 `ME_V3_ASSESSMENT_UI_V1` 로 굳혀 두었고,
 * 파일럿에 필요한 칸을 거기 끼워 넣으면 참가자와 일반 응시자가 다른 문항을
 * 받게 된다. 그러면 파일럿이 재는 것이 제품이 아니게 된다.
 *
 * **링크의 열쇠로만 자리가 열린다.** 가명(`V3-A0001`)을 주소에 넣어도
 * 아무 일이 없다: 그 값은 운영자가 보는 이름이고 열쇠가 아니다.
 */
export default async function PilotJoin({
  searchParams,
}: { searchParams: Promise<{ t?: string; ok?: string; e?: string; left?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;

  let err = sp.e ?? "";
  if (sp.t) {
    const r = await redeem(sp.t, user.id);
    if (!r.ok) err = r.reason;
  }

  const p = await participantOf(user.id);
  if (p) {
    await mark("pilot_link_opened", {
      userId: user.id, participant: p.code, wave: p.wave,
    });
  }
  const mine = p
    ? await queryOne<{ major_name: string | null; career_interest: string | null }>(
      `SELECT major_name, career_interest FROM v3_pilot_participants WHERE id = $1`, [p.id])
    : null;
  const attempt = p ? await latestAttemptOf(user.id) : null;

  return (
    <div className="rs">
      <header className="rs-head">
        <div className="rs-head-in">
          <span className="rs-brand">CareerMatri</span>
          <span className="rs-tier">기계공학 진로진단 베타</span>
        </div>
      </header>
      <main className="rs-main" style={{ maxWidth: 760 }}>
        <section className="rs-hero">
          <p className="rs-kicker">파일럿 참가</p>
          <h1 className="rs-h1">검사와 결과지를 함께 다듬습니다</h1>
          <p className="rs-lead">
            아래 다섯 가지만 받습니다. 이름과 학교와 학번과 연락처는 받지
            않습니다. 적어주신 내용은 검사와 결과지를 고치는 데만 씁니다.
          </p>
        </section>

        {err ? <p className="rs-flag">{ERR[err] ?? ERR.unknown}</p> : null}
        {sp.ok ? <p className="rs-flag">적어주셔서 고맙습니다. 이제 검사를 시작하시면 됩니다.</p> : null}
        {sp.left ? <p className="rs-flag">그만두셨습니다. 적어주신 글은 지웠습니다.</p> : null}

        {!p ? (
          <section className="rs-sect">
            <h2>초대 링크가 필요합니다</h2>
            <p className="rs-note">
              받으신 주소를 그대로 눌러 주세요. 주소 끝에 붙은 열쇠가 자리를
              엽니다.
            </p>
            <div className="rs-fine">
              <p><Link href="/me">내 CareerMatri 로</Link></p>
            </div>
          </section>
        ) : (<>
          <div className="rs-top" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <h3>참가자 이름</h3>
              <p>{p.code}</p>
              <p>{WAVE_KO[p.wave] ?? ""} · 운영 화면에는 이 이름만 나갑니다.</p>
            </div>
            <div>
              <h3>적어주신 내용을 지우는 날</h3>
              <p>{p.purge_after}</p>
              <p>전공명과 가고 싶은 쪽은 이 날 지웁니다.</p>
            </div>
          </div>

          <section className="rs-sect">
            <h2>어떻게 진행되나요</h2>
            <ol className="rs-steps">
              <li><span>1</span><b>검사를 받습니다. 학위와 등급에 따라 15분에서 55분쯤 걸립니다.</b></li>
              <li><span>2</span><b>결과를 읽습니다. 끝내지 않아도 중간에 닫았다가 이어서 하실 수 있습니다.</b></li>
              <li><span>3</span><b>짧은 의견을 남겨주세요. 답하지 않으셔도 결과는 그대로 보실 수 있습니다.</b></li>
            </ol>
          </section>

          <section className="rs-sect">
            <h2>참가 등록</h2>
            <p className="rs-note">언제든 그만두실 수 있고, 그만두시면 적어주신 내용을 지웁니다.</p>
            <form action={saveProfile} className="rs-form">
              <label>
                <span>학위</span>
                <select name="education_stage" defaultValue={p.education_stage} required>
                  {STAGE.map(([v, k]) => <option key={v} value={v}>{k}</option>)}
                </select>
              </label>
              <label>
                <span>전공</span>
                <input type="text" name="major_name" maxLength={80}
                  defaultValue={mine?.major_name ?? ""} placeholder="예) 기계공학" />
              </label>
              <label>
                <span>전공계열</span>
                <select name="major_field" defaultValue={p.major_field ?? ""}>
                  <option value="">고르지 않음</option>
                  {FIELD.map(([v, k]) => <option key={v} value={v}>{k}</option>)}
                </select>
              </label>
              <label>
                <span>지금 상태</span>
                <select name="current_status" defaultValue={p.current_status ?? ""}>
                  <option value="">고르지 않음</option>
                  {STATUS.map(([v, k]) => <option key={v} value={v}>{k}</option>)}
                </select>
              </label>
              <label>
                <span>지금까지 해 본 정도</span>
                <select name="experience_level" defaultValue={p.experience_level ?? ""}>
                  <option value="">고르지 않음</option>
                  {LEVEL.map(([v, k]) => <option key={v} value={v}>{k}</option>)}
                </select>
              </label>
              <label>
                <span>관심 있는 쪽</span>
                <select name="interest_area" defaultValue={p.interest_area ?? ""}>
                  <option value="">고르지 않음</option>
                  {AREA.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label>
                <span>가고 싶은 자리</span>
                <input type="text" name="career_interest" maxLength={120}
                  defaultValue={mine?.career_interest ?? ""}
                  placeholder="예) 완성차 구조해석" />
              </label>
              <button type="submit" className="rs-go">적어두기</button>
            </form>
          </section>

          <section className="rs-sect">
            <h2>검사</h2>
            <p className="rs-note">
              {attempt
                ? "이어서 하실 수 있습니다. 답하신 것은 그대로 남아 있습니다."
                : "등록을 마치셨으면 여기서 시작하시면 됩니다."}
            </p>
            <p>
              <Link className="rs-go" href={attempt && attempt.status === "in_progress"
                ? `/v3/${attempt.id}` : "/v3/start"}>
                {attempt && attempt.status === "in_progress" ? "이어서 하기" : "검사 시작하기"}
              </Link>
            </p>
            {attempt && attempt.status !== "in_progress" ? (
              <p className="rs-note" style={{ marginTop: 14 }}>
                <Link href={`/v3/${attempt.id}/result`}>결과 보기</Link>
                {" · "}
                {/* **동결한 결과지 화면을 건드리지 않는다.** 내려받는 길이
                    거기 없어서 여기 둔다. 손님 화면에도 둘지는 `RESULT_UI_VERSION`
                    을 올릴 일이라 사업주가 정한다 */}
                <a href={`/v3/${attempt.id}/result/pdf`}>결과 PDF 내려받기</a>
                {" · "}
                <Link href={`/v3/${attempt.id}/feedback`}>의견 남기기</Link>
              </p>
            ) : null}
          </section>

          <div className="rs-fine">
            <p>
              전공은 학위·계열과 함께 놓으면 개인이 좁혀지는 항목이라, 받는
              자리에서 지우는 날을 함께 정해 둡니다. 다섯 명이 안 되는 묶음은
              평균을 내지 않습니다. 이 결과는 합격 가능성을 뜻하지 않습니다.
            </p>
            <form action={leavePilot}>
              <button type="submit" className="rs-discbtn">그만두고 적은 것 지우기</button>
            </form>
            <p><Link href="/legal/privacy">개인정보 처리방침</Link></p>
          </div>
        </>)}
      </main>
    </div>
  );
}
