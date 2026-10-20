import Link from "next/link";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import { ACTIVITIES } from "@/lib/kus/visits";
import { content, roleChoices } from "@/lib/me-v3/runtime/session";
import { KusHead, KusNote, KusShell } from "../../shell";
import { saveVisit } from "../actions";

export const dynamic = "force-dynamic";

/**
 * 탐방 기록 한 건을 적는다.
 *
 * **고르는 칸이 주 입력이다.** 관찰한 직무와 이은 영역은 그 학생 Core 의
 * 사전에서 고르고, 한 활동은 고정 보기다. 자유 입력은 이해한 것 · 한 일 ·
 * 새로 알게 된 것 셋이고 판정에 들어가지 않으며 기한(365일)을 들고 다닌다.
 */
export default async function NewVisit({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { user, me } = await requireKusStudent();
  const w = await kusWorkspace(user, me);
  /* 응시가 없어도 학교 맥락이 Core 를 든다. 검사 전에 탐방을 다녀온 학생도 적을 수 있다 */
  const core = me.ctx.core_code;
  const sp = await searchParams;
  /* 자유전공학부처럼 전공을 아직 고르지 않은 학생은 직무·영역 보기를 읽을 사전이 없다 */
  if (!core) {
    return (
      <KusShell active="/kus/visits" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
        <KusHead kicker="기업탐방 기록" title="새 탐방 기록" />
        <KusNote>아직 전공을 고르지 않아 직무·영역 보기를 띄울 수 없습니다. 전공을 고른 뒤에 기록할 수 있습니다.</KusNote>
        <div className="kus-actions"><Link className="cm-btn is-primary" href="/campus/kus/majors?pick=1">전공 고르기</Link></div>
      </KusShell>
    );
  }
  const roles = roleChoices(core);
  const tds = content(core).domains.domains;
  const progs = w.programs.filter((p) => p.status !== "CANCELLED");
  return (
    <KusShell active="/kus/visits" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker="기업탐방 기록" title="새 탐방 기록" lead="본 것과 직접 해 본 것을 갈라 적습니다. 적은 말은 초안의 재료가 되고, 판정에는 들어가지 않습니다." />
      {sp.e ? <KusNote>{sp.e}</KusNote> : null}
      <form action={saveVisit} className="kus-form kus-panel">
        <div className="kus-field">
          <label htmlFor="program_id">방문 기업</label>
          <small>담당자가 등록한 탐방에서 고릅니다. 목록에 없으면 아래에 직접 적고, 그 기록은 `기업 확인 전` 으로 섭니다.</small>
          <select id="program_id" name="program_id" defaultValue={progs[0]?.id ?? ""}>
            <option value="">목록에 없음 — 직접 적기</option>
            {progs.map((p) => <option key={p.id} value={p.id}>{p.company_name}{p.visit_date ? ` · ${p.visit_date}` : ""}{p.is_test ? " [테스트]" : ""}</option>)}
          </select>
          <input className="kus-input" style={{ marginTop: 8 }} name="company_name" placeholder="목록에 없을 때만: 기업 이름" maxLength={80} />
        </div>
        <div className="kus-field">
          <label htmlFor="visited_on">탐방 날짜</label>
          <input className="kus-input" id="visited_on" name="visited_on" type="date" />
        </div>
        <fieldset className="kus-field">
          <legend>관찰한 직무</legend>
          <small>{w.dept} 검사 사전의 직무입니다. 없으면 아래에 적습니다.</small>
          <div className="kus-checks">
            {roles.map((r) => <label key={r.code}><input type="checkbox" name="role_codes" value={r.code} /><span>{r.name}<small>{r.first}</small></span></label>)}
          </div>
          <input className="kus-input" style={{ marginTop: 8 }} name="role_text" placeholder="보기에 없는 직무 (예: 해외영업)" maxLength={120} />
        </fieldset>
        <div className="kus-field">
          <label htmlFor="understood">이해한 기술·제품·사업</label>
          <textarea id="understood" name="understood" maxLength={600} placeholder="예: 신제품 출시 국가를 시장 자료로 고르는 과정" />
        </div>
        <fieldset className="kus-field">
          <legend>탐방에서 한 활동</legend>
          <small>보고 들은 것과 직접 해 본 것을 갈라 고릅니다. 직접 해 본 것만 경험으로 옮길 수 있습니다.</small>
          <div className="kus-checks">
            {ACTIVITIES.map((x) => <label key={x.code}><input type="checkbox" name="activities" value={x.code} /><span>{x.label}<small>{x.level === "DO" ? "직접 해 봄" : "관찰"}</small></span></label>)}
          </div>
          <input className="kus-input" style={{ marginTop: 8 }} name="activity_text" placeholder="직접 해 본 것이 있으면 한 줄로 (예: 출시 국가 고르기 과제를 팀으로 풀고 발표)" maxLength={300} />
        </fieldset>
        <div className="kus-field">
          <label htmlFor="learned">새롭게 알게 된 것</label>
          <textarea id="learned" name="learned" maxLength={600} />
        </div>
        <fieldset className="kus-field">
          <legend>내 전공과 잇기</legend>
          <small>탐방에서 본 일이 전공의 어느 영역과 이어지는지 고릅니다(최대 4개).</small>
          <div className="kus-checks">
            {tds.map((d) => <label key={d.code}><input type="checkbox" name="td_codes" value={d.code} /><span>{d.name}</span></label>)}
          </div>
        </fieldset>
        <div className="kus-actions">
          <button type="submit" className="cm-btn is-primary">기록 저장</button>
          <Link className="cm-btn" href="/kus/visits">취소</Link>
        </div>
      </form>
    </KusShell>
  );
}
