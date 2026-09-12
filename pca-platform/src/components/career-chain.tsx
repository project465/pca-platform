/**
 * 현장에서 거꾸로 내려오는 사슬 — 고교판 결과지 05.
 *
 * 한 직무마다 네 칸이 위에서 아래로 이어진다.
 *   현장 장면 → 그 일이 요구하는 것 → 대학에서 · 고등학교에서 · 중학교에서
 *
 * 왼쪽에 세로선을 세워 "같은 줄기에서 내려온다" 는 것을 눈으로 보이게 한다.
 * 여기서 계산하지 않는다. src/lib/chain.ts 가 읽어 온 것을 그릴 뿐이다.
 */
import type { CareerChain } from "@/lib/chain";

export default function CareerChainView({ chain }: { chain: CareerChain }) {
  return (
    <div className="cc">
      {chain.roles.map((r) => (
        <article className="cc-role" key={r.majorCode + r.name}>
          <header className="cc-head">
            <span className="cc-major">{r.majorName}</span>
            <h3>{r.name}</h3>
            <p className="cc-scene">{r.scene}</p>
          </header>

          <div className="cc-needs">
            {r.needs.map((n) => (
              <div className="cc-need" key={n.what}>
                <p className="cc-what">{n.what}</p>

                <div className="cc-steps">
                  <div className="cc-step">
                    <span className="cc-when">대학에서</span>
                    <span className="cc-body">{n.univ}</span>
                  </div>

                  <div className="cc-step now">
                    <span className="cc-when">고등학교에서</span>
                    <span className="cc-body">
                      <b>{n.subjects.map((s) => s.name).join(" · ") || "—"}</b>
                      {n.hsWhy && <em>{n.hsWhy}</em>}
                    </span>
                  </div>

                  <div className="cc-step">
                    <span className="cc-when">중학교에서</span>
                    <span className="cc-body">
                      {n.ms}
                      {n.msWhy && <em>{n.msWhy}</em>}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
