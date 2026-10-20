import { requireSejong } from "@/sejong/lib/session";
import { sejongContent, areaName } from "@/sejong/lib/content";
import { experienceRows } from "@/sejong/lib/store";
import { addExperience, removeExperience } from "./actions";

export const dynamic = "force-dynamic";

export default async function ExperiencePage({
  searchParams,
}: { searchParams: Promise<{ e?: string; saved?: string }> }) {
  const a = await requireSejong("participant");
  const { instrument, axisInfo } = sejongContent();
  const rows = await experienceRows(a.userId);
  const sp = await searchParams;
  const kindLabel = Object.fromEntries(instrument.experience_kinds.map((k) => [k.code, k.label]));
  const checkLabel = Object.fromEntries(instrument.experience_checks.map((c) => [c.code, c]));

  return (
    <>
      <h1>경험 기록 (Evidence)</h1>
      <p className="lead">
        경력·아르바이트·인턴·훈련·자격·봉사를 적습니다. 진단에서 '직접 해 봤다'고 고른 판단은
        <b> 여기 적은 경험이 둘 이상 받쳐 줄 때</b> '경험으로 확인됨'이 됩니다. 경험은 점수를 만들지 않고,
        이미 고른 단계를 올리지도 않습니다. 근거만 붙입니다.
      </p>
      {sp.saved ? <p className="sj-note">저장했습니다.</p> : null}
      {sp.e ? <p className="sj-error">경험 종류와 제목을 적어 주세요.</p> : null}

      <div className="sj-grid c2 sj-section" style={{ alignItems: "start" }}>
        <form action={addExperience} className="sj-card sj-form">
          <h2>경험 하나 더하기</h2>
          <div className="sj-field">
            <label htmlFor="kind">종류</label>
            <select id="kind" name="kind" defaultValue="work">
              {instrument.experience_kinds.map((k) => <option key={k.code} value={k.code}>{k.label}</option>)}
            </select>
          </div>
          <div className="sj-field">
            <label htmlFor="title">무슨 일이었나요</label>
            <input id="title" name="title" type="text" required placeholder="예: 물류센터 출고 검수" />
          </div>
          <div className="sj-grid c2">
            <div className="sj-field">
              <label htmlFor="org_name">어디서 (선택)</label>
              <input id="org_name" name="org_name" type="text" placeholder="회사·기관·과정 이름" />
            </div>
            <div className="sj-field">
              <label htmlFor="period_text">언제·얼마나 (선택)</label>
              <input id="period_text" name="period_text" type="text" placeholder="예: 2025.3~2025.12" />
            </div>
          </div>
          <div className="sj-field">
            <label htmlFor="job_area">가까운 직무 (선택)</label>
            <select id="job_area" name="job_area" defaultValue="">
              <option value="">고르지 않음</option>
              {instrument.job_areas.map((j) => <option key={j.code} value={j.code}>{j.name}</option>)}
            </select>
          </div>
          <div className="sj-field">
            <label htmlFor="role_text">내가 맡은 일 (선택)</label>
            <textarea id="role_text" name="role_text" placeholder="무엇을 했고, 무엇이 남았는지 한두 줄" />
          </div>
          <div className="sj-field">
            <span className="lab">이 경험에서 말할 수 있는 것</span>
            <div className="sj-choices" style={{ flexDirection: "column", alignItems: "stretch" }}>
              {instrument.experience_checks.map((c) => (
                <label key={c.code} className="sj-choice">
                  <input type="checkbox" name="checks" value={c.code} />
                  {c.label} <span className="muted small">({axisInfo[c.axis]?.name ?? c.axis})</span>
                </label>
              ))}
            </div>
          </div>
          <div className="sj-field">
            <label htmlFor="skills">쓴 기술·도구 (선택, 쉼표로 구분)</label>
            <input id="skills" name="skills" type="text" placeholder="예: 엑셀, 바코드 스캐너" />
          </div>
          <div><button className="sj-btn" type="submit">기록하기</button></div>
        </form>

        <div>
          <h2>기록한 경험 {rows.length}건</h2>
          {rows.length === 0 ? <p className="muted">아직 없습니다. 아르바이트 하나도 좋은 근거입니다.</p> : null}
          {rows.map((r) => (
            <div key={r.id} className="sj-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <span className="sj-badge">{kindLabel[r.kind] ?? r.kind}</span>{" "}
                  {r.job_area ? <span className="sj-badge brand">{areaName(r.job_area)}</span> : null}
                  <h3 style={{ marginTop: 6 }}>{r.title}</h3>
                  <p className="small muted">{[r.org_name, r.period_text].filter(Boolean).join(" · ")}</p>
                </div>
                <form action={removeExperience}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="sj-btn ghost small" type="submit">지우기</button>
                </form>
              </div>
              {r.role_text ? <p className="small">{r.role_text}</p> : null}
              <div className="sj-choices">
                {r.checks.map((c) => (
                  <span key={c} className="sj-badge ok">{checkLabel[c]?.label ?? c}</span>
                ))}
                {r.checks.length === 0 ? <span className="small muted">고른 근거 칸 없음</span> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
