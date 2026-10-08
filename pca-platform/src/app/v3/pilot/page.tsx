import Link from "next/link";
import { requireUser } from "@/lib/session";
import { participantOf } from "@/lib/me-v3/pilot/store";
import { queryOne } from "@/lib/db";
import { joinPilot } from "./actions";
import "../result.css";

export const metadata = { title: "파일럿 참가 · CareerMatri" };

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

/**
 * 파일럿 참가 등록.
 *
 * **응시 화면이 아니다.** 검사는 `ME_V3_ASSESSMENT_UI_V1` 로 굳혀 두었고,
 * 파일럿에 필요한 칸을 거기 끼워 넣으면 참가자와 일반 응시자가 다른
 * 문항을 받게 된다. 그러면 파일럿이 재는 것이 제품이 아니게 된다.
 */
export default async function PilotJoin({
  searchParams,
}: { searchParams: Promise<{ ok?: string; e?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const p = await participantOf(user.id);
  const mine = p
    ? await queryOne<{ major_name: string | null; career_interest: string | null }>(
      `SELECT major_name, career_interest FROM v3_pilot_participants WHERE id = $1`, [p.id])
    : null;

  return (
    <div className="rs">
      <header className="rs-head">
        <div className="rs-head-in">
          <span className="rs-brand">CareerMatri</span>
          <span className="rs-tier">파일럿</span>
        </div>
      </header>
      <main className="rs-main" style={{ maxWidth: 760 }}>
        <section className="rs-hero">
          <p className="rs-kicker">기계공학 진로 진단 파일럿</p>
          <h1 className="rs-h1">검사와 결과지를 함께 다듬습니다</h1>
          <p className="rs-lead">
            아래 네 가지만 받습니다. 이름과 학교와 학번은 받지 않습니다.
            적어주신 내용은 검사와 결과지를 고치는 데만 씁니다.
          </p>
        </section>

        {p ? (
          <div className="rs-top" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <h3>참가자 이름</h3>
              <p>{p.code}</p>
              <p>운영 화면과 분석에는 이 이름만 나갑니다.</p>
            </div>
            <div>
              <h3>적어주신 내용을 지우는 날</h3>
              <p>{p.purge_after}</p>
              <p>전공명과 가고 싶은 쪽은 이 날 지웁니다.</p>
            </div>
          </div>
        ) : null}

        {sp.ok ? <p className="rs-flag">등록했습니다. 이제 검사를 시작하시면 됩니다.</p> : null}
        {sp.e === "stage" ? <p className="rs-flag">학위를 골라주세요.</p> : null}

        <section className="rs-sect">
          <h2>참가 등록</h2>
          <p className="rs-note">언제든 그만두실 수 있고, 그만두시면 적어주신 내용을 지웁니다.</p>
          <form action={joinPilot} className="rs-form">
            <label>
              <span>학위</span>
              <select name="education_stage" defaultValue={p?.education_stage ?? ""} required>
                <option value="" disabled>고르기</option>
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
              <select name="major_field" defaultValue={p?.major_field ?? ""}>
                <option value="">고르지 않음</option>
                {FIELD.map(([v, k]) => <option key={v} value={v}>{k}</option>)}
              </select>
            </label>
            <label>
              <span>지금 상태</span>
              <select name="current_status" defaultValue={p?.current_status ?? ""}>
                <option value="">고르지 않음</option>
                {STATUS.map(([v, k]) => <option key={v} value={v}>{k}</option>)}
              </select>
            </label>
            <label>
              <span>가고 싶은 쪽</span>
              <input type="text" name="career_interest" maxLength={120}
                defaultValue={mine?.career_interest ?? ""}
                placeholder="예) 완성차 구조해석" />
            </label>
            <button type="submit" className="rs-go">{p ? "고쳐 적기" : "참가 등록"}</button>
          </form>
        </section>

        <div className="rs-fine">
          <p>
            전공은 학위·계열과 함께 놓으면 개인이 좁혀지는 항목이라, 받는
            자리에서 지우는 날을 함께 정해 둡니다. 다섯 명이 안 되는 묶음은
            평균을 내지 않습니다.
          </p>
          <p><Link href="/v3/start">검사 시작하기</Link></p>
        </div>
      </main>
    </div>
  );
}
