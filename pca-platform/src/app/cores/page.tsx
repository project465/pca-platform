import Link from "next/link";
import { requireUser } from "@/lib/session";
import { coresForMarket } from "@/lib/me-v3/core-registry";
import { currentAttempt, v3Grants } from "@/lib/me-v3/runtime/session";
import "../surface.css";
import "../me/platform.css";
import { CmShell, CmHead } from "../me/shell";

export const metadata = { title: "전공 Core · CareerMatri" };

/**
 * 전공 Core 고르기.
 *
 * **이 화면이 있는 까닭.** 검사를 바로 열면 사용자는 CareerMatri 를
 * `기계공학 검사 한 벌` 로 읽는다. 전공마다 Core 가 따로 있고 지금은 기계
 * 공학이 열려 있다는 것을 **첫 화면에서** 보여야, 전기전자 학생이 왜
 * 자기 것이 없는지 알고 열리는 날 돌아온다.
 *
 * **준비 중인 Core 를 눌러 404 로 보내지 않는다.** 등록부가 `planned` 로
 * 적어 둔 것은 자리를 잡아 둔 상태가 맞고, 그 자리에는 지금 없는 것과
 * 그 까닭이 적힌다.
 */
export default async function Cores() {
  const user = await requireUser();
  const open = await currentAttempt(user.id);
  const grants = await v3Grants(user.id);
  const cores = coresForMarket("KR");
  const live = cores.filter((c) => c.status === "building" || c.status === "live");
  const planned = cores.filter((c) => c.status === "planned");

  return (
    <CmShell active="/cores" title="검사">
      <CmHead
        kicker="전공 Core"
        title="어느 전공으로 볼지 고릅니다"
        lead={"CareerMatri 는 전공마다 Core 를 따로 둡니다. "
          + "같은 엔진을 쓰지만 기술영역과 판단축과 산업이 전공마다 다릅니다."}
      />

      {/*
        **검사가 끝이 아니라는 것을 고르는 자리에서 적는다.** 전에는 이
        쪽이 전공 카드만 세워서, 읽는 사람이 CareerMatri 를 검사 한 벌로
        읽고 결과 PDF 를 받는 데까지로 생각했다. 그 뒤에 무엇이 쌓이는지를
        네 줄로 적는다.
      */}
      <section className="cm-live" style={{ marginTop: 0, marginBottom: 20 }}>
        <header>
          <h2>검사는 시작점입니다</h2>
          <span>결과를 받은 다음부터가 내 CareerMatri 입니다.</span>
        </header>
        <dl className="cm-dl">
          <div>
            <dt>검사에서 받는 것</dt>
            <dd>근거가 선 기술영역과 아직 비어 있는 자리, 그리고 다음 할 일</dd>
          </div>
          <div>
            <dt>그 뒤에 쌓는 것</dt>
            <dd>새로 겪은 경험을 적고 지금 상태에 반영하면 비어 있던 자리가 채워집니다</dd>
          </div>
          <div>
            <dt>등급 차이</dt>
            <dd>문항 수가 아니라 판단의 종류가 다릅니다. 어디부터 볼지 · 영역끼리 비교하기 · 경험을 직무 언어로 옮기기</dd>
          </div>
          <div>
            <dt>중간에 멈춰도</dt>
            <dd>답한 것은 문항마다 저장되어 있어 멈춘 자리에서 이어집니다</dd>
          </div>
        </dl>
      </section>

      {open ? (
        <div className="cm-card is-wide" style={{ marginBottom: 18 }}>
          <h2>이어서 풀 응시가 있습니다 <em>{open.tier}</em></h2>
          <p>
            마지막으로 답한 자리에서 이어집니다. 다시 시작하면 앞 응답이
            두 벌 쌓이므로 이어하기로만 들어갑니다.
          </p>
          <div className="cm-acts">
            <Link className="cm-btn is-primary" href={`/v3/${open.id}`}>이어하기</Link>
          </div>
        </div>
      ) : null}

      <div className="cm-grid">
        {live.map((c) => (
          <div className="cm-card" key={c.code}>
            <h2>{c.name_ko} <em>지금 응시할 수 있습니다</em></h2>
            <p>
              기술영역 {c.domain_count}개와 판단축 {c.axis_count}개로 봅니다.
              산업과 직무와 지역까지 이어 읽습니다.
            </p>
            <div className="cm-grow" />
            <div className="cm-acts">
              {open ? (
                <Link className="cm-btn" href={`/v3/${open.id}`}>이어하기</Link>
              ) : (
                <Link className="cm-btn is-primary" href="/v3/start">시작하기</Link>
              )}
              <Link className="cm-btn" href="/me">내 CareerMatri</Link>
            </div>
            {grants.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--sf-ink-3)" }}>
                이용권이 없으면 선별 등급으로 시작합니다.
              </p>
            ) : null}
          </div>
        ))}

      </div>

      {/* **같은 문장을 아홉 번 쓰지 않는다.** 준비 중인 Core 마다 카드를
          세우고 같은 설명을 되풀이하면, 아홉 장이 한 문단을 아홉 번 읽게
          한다. 까닭은 한 번만 적고 이름은 줄로 세운다 */}
      <h2 className="cm-h1" style={{ fontSize: 18, margin: "28px 0 10px" }}>
        준비 중인 전공
      </h2>
      <p className="cm-lead" style={{ marginBottom: 14 }}>
        기술영역 사전과 문항과 산업 자료를 그 전공을 아는 분이 써야 열립니다.
        전공을 늘리는 속도는 그 전공을 아는 사람이 쓸 수 있는 속도입니다.
      </p>
      <div className="cm-chips">
        {planned.map((c) => (
          <span className="cm-chip" key={c.code}>{c.name_ko}</span>
        ))}
      </div>
    </CmShell>
  );
}
