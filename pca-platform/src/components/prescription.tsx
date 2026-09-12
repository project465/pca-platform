/**
 * 과목 처방 — 고교판 결과지 05.
 *
 * 여기서 계산하지 않는다. src/lib/prescribe.ts 가 만든 것을 그릴 뿐이다.
 *
 * 순서가 곧 말이다.
 *   1. 학기별 학점 — 신청할 수 있는 분량인지 먼저 보여준다
 *   2. 1군 전부에 필요한 과목 — 아직 안 좁힌 학생이 지금 고를 수 있는 것
 *   3. 여기서 갈리는 과목 — 어느 쪽으로 기울면 무엇이 붙는지
 *   4. 대학이 밝힌 권장 — 계열이 요구하는 것과 근거가 다르므로 따로
 */
import { josa } from "@/lib/locale";
import type { Prescription, PrescribedSubject } from "@/lib/prescribe";

const CATEGORY: Record<string, string> = {
  general: "일반 선택",
  career: "진로 선택",
  fusion: "융합 선택",
  common: "공통",
};

function Item({ s, showFor }: { s: PrescribedSubject; showFor: boolean }) {
  const must = s.necessity === 3;
  return (
    <li className={`rx-item ${must ? "must" : "rec"}`}>
      <span className="rx-need">{must ? "필수" : "권장"}</span>
      <div className="rx-body">
        <span className="rx-name">{s.name}</span>
        <span className="rx-meta">
          <b>{s.groupName}</b>
          <span>{CATEGORY[s.category] ?? s.category}</span>
          <span>{s.credit}학점</span>
          <span>{s.grade}학년 권장</span>
          {s.csat && <span className="rx-tag csat">수능 범위</span>}
          {s.absoluteOnly && <span className="rx-tag abs">석차등급 없음</span>}
          {s.univ.length > 0 && (
            <span className="rx-tag univ">{s.univ.map((u) => u.univ).join("·")} 권장</span>
          )}
          {s.prereq && <span>먼저 — {s.prereq.name}</span>}
        </span>
        {s.why && <span className="rx-why">{s.why}</span>}
        {/* 처방과 사슬을 잇는 한 줄. 이 과목이 현장 어디서 쓰이는지 */}
        {s.usedAt.length > 0 && (
          <span className="rx-use">
            현장에서 —{" "}
            {s.usedAt.map((u, i) => (
              <span key={u.role + u.what}>
                {i > 0 && " · "}
                <b>{u.role}</b>
                {josa(u.role, "이", "가")} {u.what}
              </span>
            ))}
          </span>
        )}
        {s.addedForPrereq && (
          <span className="rx-for">
            아래 과목을 신청하려면 이 과목이 먼저 필요해 함께 넣었습니다.
          </span>
        )}
        {showFor && s.forMajors.length > 0 && (
          <span className="rx-for">
            {s.forMajors.join(" · ")}{" "}
            {/* 필요도 1 은 "필요하다" 가 아니다. 묶음 제목과 어긋나지 않게 말을 맞춘다 */}
            {s.necessity >= 2 ? "쪽에서 필요합니다" : "쪽으로 가면 도움이 됩니다"}
          </span>
        )}
      </div>
    </li>
  );
}

export default function PrescriptionView({ rx }: { rx: Prescription }) {
  return (
    <>
      <div className="rx-terms">
        {rx.byGrade.map((g) => (
          <div className="rx-term" key={g.grade}>
            <h4>{g.grade}학년</h4>
            <span className="n">
              {g.subjects.length}과목 <em>{g.credits}학점</em>
            </span>
            <p>
              한 학년에 넣을 수 있는 선택과목은 {g.budget}학점 안팎입니다.
              {g.credits > g.budget && " 지금 처방이 그 선을 넘었습니다."}
            </p>
          </div>
        ))}
      </div>

      {rx.tooMany && (
        <p className="notice warn">
          1군에 계열이 {rx.majors.length}개 있어 여기 담긴 것은 <b>그 전부에 공통으로
          걸리는 과목</b>까지입니다. 한 계열만 요구하는 과목은 아래 “여기서 갈립니다”
          로 내렸습니다 — 지금 다 담으면 신청할 수 없는 목록이 됩니다.
        </p>
      )}

      <div className="rx-group">
        <div className="rx-gh">
          <h3>먼저 듣습니다</h3>
          <span>
            {rx.majors.map((m) => m.name).join(" · ")} 어느 쪽으로 가도 필요한 과목입니다
          </span>
        </div>
        <ul className="rx-list">
          {rx.shared.map((s) => (
            <Item key={s.code} s={s} showFor={false} />
          ))}
        </ul>
      </div>

      {rx.split.length > 0 && (
        <div className="rx-group">
          <div className="rx-gh">
            <h3>여기서 갈립니다</h3>
            <span>어느 쪽으로 기우는지에 따라 골라 듣습니다</span>
          </div>
          <ul className="rx-list">
            {rx.split.map((s) => (
              <Item key={s.code} s={s} showFor />
            ))}
          </ul>
        </div>
      )}

      {rx.optional.length > 0 && (
        <div className="rx-group">
          <div className="rx-gh">
            <h3>여유가 되면</h3>
            <span>안 들어도 막히지 않지만, 그쪽으로 정하면 도움이 됩니다</span>
          </div>
          <ul className="rx-list">
            {rx.optional.slice(0, 8).map((s) => (
              <Item key={s.code} s={s} showFor />
            ))}
          </ul>
        </div>
      )}

      {rx.univChecks.length > 0 && (
        <div className="rx-univ">
          <h4>대학이 밝힌 권장 과목</h4>
          <ul>
            {rx.univPicks.map((s) => (
              <li key={s.code}>
                {s.univ.map((u) => u.univ).join("·")} — {s.name}{" "}
                <span className="ok">담겨 있습니다</span>
              </li>
            ))}
            {rx.univChecks.map((c) => (
              <li key={c.univ + c.rule}>
                {c.univ} — {c.rule}: 지금 {c.have}과목{" "}
                {c.met ? (
                  <span className="ok">충족</span>
                ) : (
                  <span className="no">{c.need - c.have}과목 더 필요</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
