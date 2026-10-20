import Link from "next/link";
import { examUnavailable, requireKusStudent } from "@/lib/kus/access";
import { UNSUPPORTED_NOTE } from "@/lib/kus/analysis";
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
  const bare = !core && examUnavailable(me);
  if (!core && !bare) {
    return (
      <KusShell active="/kus/visits" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
        <KusHead kicker="기업탐방" title="새 탐방 기록" />
        <KusNote>전공을 먼저 골라 주세요. 그래야 직무와 영역을 고를 수 있어요.</KusNote>
        <div className="kus-actions"><Link className="kus-btn" href="/campus/kus/majors?pick=1">전공 고르기</Link></div>
      </KusShell>
    );
  }
  /* 학과 Core 가 없는 학생은 고를 사전이 없다: 직무는 적는 칸 하나, 전공 영역 잇기는 세우지 않는다 */
  const roles = bare ? [] : roleChoices(core);
  const tds = bare ? [] : content(core).domains.domains;
  const progs = w.programs.filter((p) => p.status !== "CANCELLED");
  return (
    <KusShell active="/kus/visits" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker="기업탐방" title="새 탐방 기록" lead="본 것과 직접 해 본 것을 나눠서 적어 주세요." />
      {sp.e ? <KusNote>{sp.e}</KusNote> : null}
      {bare ? <KusNote tone="info">{UNSUPPORTED_NOTE} 직무는 직접 적어 주세요.</KusNote> : null}
      <form action={saveVisit} className="kus-form kus-card">
        <div className="kus-field">
          <label htmlFor="program_id">어느 회사에 다녀왔나요?</label>
          <select id="program_id" name="program_id" defaultValue={progs[0]?.id ?? ""}>
            <option value="">목록에 없어요 (직접 적기)</option>
            {progs.map((p) => <option key={p.id} value={p.id}>{p.company_name}{p.visit_date ? ` · ${p.visit_date}` : ""}{p.is_test ? " [테스트]" : ""}</option>)}
          </select>
          <input className="kus-input" name="company_name" placeholder="목록에 없으면 회사 이름을 적어 주세요" maxLength={80} />
        </div>
        <div className="kus-field">
          <label htmlFor="visited_on">다녀온 날</label>
          <input className="kus-input" id="visited_on" name="visited_on" type="date" />
        </div>
        <fieldset className="kus-field">
          <legend>어떤 직무를 봤나요?</legend>
          {roles.length ? (
            <>
              <span className="kus-help">여러 개 골라도 돼요.</span>
              <div className="kus-checks is-cards">
                {roles.map((r) => <label key={r.code}><input type="checkbox" name="role_codes" value={r.code} /><span>{r.name}<small>{r.first}</small></span></label>)}
              </div>
            </>
          ) : null}
          <input className="kus-input" style={{ marginTop: 10 }} name="role_text" placeholder={roles.length ? "보기에 없으면 적어 주세요 (예: 해외영업)" : "본 직무를 적어 주세요 (예: 공정기술 엔지니어)"} maxLength={120} />
        </fieldset>
        <div className="kus-field">
          <label htmlFor="understood">무엇을 알게 됐나요?</label>
          <textarea id="understood" name="understood" maxLength={600} placeholder="예: 신제품 출시 국가를 시장 자료로 고르는 과정" />
        </div>
        <fieldset className="kus-field">
          <legend>탐방에서 무엇을 했나요?</legend>
          <span className="kus-help">직접 해 본 것만 나중에 경험으로 옮길 수 있어요.</span>
          <div className="kus-checks">
            {ACTIVITIES.map((x) => <label key={x.code}><input type="checkbox" name="activities" value={x.code} /><span>{x.label}</span></label>)}
          </div>
          <input className="kus-input" style={{ marginTop: 10 }} name="activity_text" placeholder="직접 해 본 것이 있으면 한 줄로 (예: 출시 국가 고르기 과제를 팀으로 풀고 발표)" maxLength={300} />
        </fieldset>
        <div className="kus-field">
          <label htmlFor="learned">새로 알게 된 점</label>
          <textarea id="learned" name="learned" maxLength={600} />
        </div>
        {tds.length ? <fieldset className="kus-field">
          <legend>내 전공의 어느 영역과 이어지나요?</legend>
          <span className="kus-help">4개까지 고를 수 있어요.</span>
          <div className="kus-checks">
            {tds.map((d) => <label key={d.code}><input type="checkbox" name="td_codes" value={d.code} /><span>{d.name}</span></label>)}
          </div>
        </fieldset> : null}
        <div className="kus-actions">
          <button type="submit" className="kus-btn">저장하기</button>
          <Link className="kus-btn is-sub" href="/kus/visits">취소</Link>
        </div>
      </form>
    </KusShell>
  );
}
