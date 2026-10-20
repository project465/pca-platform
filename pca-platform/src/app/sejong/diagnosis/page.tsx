import Link from "next/link";
import { requireSejong } from "@/sejong/lib/session";
import { sejongContent } from "@/sejong/lib/content";
import { latestAttempt } from "@/sejong/lib/store";
import { startDiagnosis } from "./actions";

export const dynamic = "force-dynamic";

export default async function DiagnosisStart({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const a = await requireSejong("participant");
  const { instrument } = sejongContent();
  const att = await latestAttempt(a.userId);
  const sp = await searchParams;
  const prev = att?.profile;
  const total = instrument.sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <>
      <span className="sj-badge demo">DEMO · {instrument.instrument_version}</span>
      <h1 style={{ marginTop: 10 }}>직무 경험 진단 시작</h1>
      <p className="lead">
        학과나 전공을 묻지 않습니다. 희망하는 일과, 일하며 실제로 해 본 것을 묻습니다.
        {total}문항이고 고른 즉시 저장됩니다.
      </p>
      {att?.status === "in_progress" ? (
        <p className="sj-note">진행 중인 진단이 있습니다. <Link href={`/sejong/diagnosis/${att.id}`}>이어하기</Link> · 아래를 바꾸면 시작 정보만 고칩니다.</p>
      ) : null}
      {att?.status === "scored" ? (
        <p className="sj-note">제출한 진단이 있습니다. 새로 시작하면 이전 결과는 그대로 남고 새 결과가 하나 더 생깁니다.</p>
      ) : null}

      <form action={startDiagnosis} className="sj-form sj-card sj-section">
        <div className="sj-field">
          <span className="lab">희망 직무 (1~3개)</span>
          {sp.e === "area" ? <p className="sj-error">희망 직무를 하나 이상 골라 주세요.</p> : null}
          <div className="sj-choices">
            {instrument.job_areas.map((j) => (
              <label key={j.code} className="sj-choice" title={j.one_line}>
                <input type="checkbox" name="job_areas" value={j.code}
                  defaultChecked={prev?.job_areas?.includes(j.code)} />
                {j.name}
              </label>
            ))}
          </div>
          <p className="small muted">세 개를 넘게 고르면 앞의 세 개만 씁니다.</p>
        </div>

        <div className="sj-field">
          <span className="lab">일하고 싶은 지역 범위</span>
          <div className="sj-choices">
            {instrument.region_ranges.options.map((o) => (
              <label key={o.code} className="sj-choice">
                <input type="radio" name="region_range" value={o.code}
                  defaultChecked={(prev?.region_range ?? "ADJACENT") === o.code} />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <div className="sj-field">
          <span className="lab">해당하는 구분 (선택)</span>
          <p className="small muted">{instrument.audiences.note}</p>
          <div className="sj-choices">
            {instrument.audiences.options.map((o) => (
              <label key={o.code} className="sj-choice">
                <input type="radio" name="audience" value={o.code}
                  defaultChecked={(prev?.audience ?? "none") === o.code} />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <div className="sj-field">
          <label htmlFor="skills">보유 기술·도구 (선택, 쉼표로 구분)</label>
          <input id="skills" name="skills" type="text" placeholder="예: 엑셀, 지게차, ERP, 고객 응대"
            defaultValue={prev?.skills?.join(", ") ?? ""} />
        </div>

        <p className="sj-note">
          시작 정보는 결과에서 보여 줄 직무와 기업 범위만 정합니다. <b>판정에는 들어가지 않습니다.</b>
        </p>
        <div><button className="sj-btn" type="submit">진단 {att?.status === "in_progress" ? "이어하기" : "시작"}</button></div>
      </form>
    </>
  );
}
