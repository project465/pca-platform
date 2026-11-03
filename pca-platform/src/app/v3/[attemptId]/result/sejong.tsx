import { withJosa } from "@/lib/me-v3/result/josa";
import { SEJONG_LAW, type SejongGroup, type SejongOrgLine, type SejongView } from "@/lib/me-v3/result/sejong";

/**
 * 세종에서 이 경험을 이어 볼 기업.
 *
 * **이름이 추천이 아니다**(CLAUDE.md 법적 범위): `내 결과와 잘 맞는 곳` 과
 * `이어서 볼 곳` 이고, 채용 여부를 확인하지 않았다는 것과 지원은 본인이
 * 한다는 것을 절 끝에 적는다. 회사 설명은 명단에 적힌 업종과 주력 품목뿐이다.
 *
 * **새 class 를 짓지 않는다.** `rs-pack` 의 줄 모양을 그대로 쓴다: 이
 * 저장소에서 새 이름이 다른 규칙과 겹쳐 버그가 된 것이 열 번이 넘는다.
 */
function Row({ o }: { o: SejongOrgLine }) {
  const what = [o.sector, o.product ? `주력 품목 ${o.product}` : ""].filter(Boolean).join(" · ");
  return (
    <div>
      <dt>{o.name}{o.listed ? ` · ${o.listed} 상장` : ""}</dt>
      <dd><span>{what}</span></dd>
    </div>
  );
}

/** 분야 하나. **같은 까닭을 회사마다 되풀이하지 않는다**: 머리에 한 번 적는다 */
function Group({ g, lead }: { g: SejongGroup; lead: string }) {
  return (
    <>
      <p className="rs-note">
        <strong>{g.theme}</strong> · {lead} {g.via.join(" · ")}
      </p>
      <dl>{g.orgs.map((o) => <Row key={o.name} o={o} />)}</dl>
      {g.more ? <p className="rs-others">{g.theme} 쪽에 {g.more}곳이 더 있습니다.</p> : null}
    </>
  );
}

export default function SejongSection({ v }: { v: SejongView }) {
  const f = v.focus;
  return (
    <section className="rs-sect" id="sejong">
      <h2>{v.city}에서 이 경험을 이어 볼 기업</h2>
      <p className="rs-note">
        {v.city}에 있는 기업 {v.total}곳의 업종과 주력 품목을 이 결과에서 확인된 영역에
        대어 보았습니다. 점수나 순위가 아니고, 같은 분야에 있는지를 나란히 놓은 것입니다.
      </p>

      {f ? (
        <div className="rs-pack" id="sejong-focus">
          <h3>{withJosa(f.org.name, "과와")} 이어지는 점</h3>
          <p>{v.city}에 소재지를 둔 기업입니다. 공개 명단에 적힌 업종과 주력 품목만 옮겼습니다.</p>
          <dl>
            <div>
              <dt>회사가 하는 일</dt>
              <dd><span>
                {f.org.sector}{f.org.product ? ` · 주력 품목 ${f.org.product}` : ""}
              </span></dd>
            </div>
            <div>
              <dt>이 결과에서 이어지는 영역</dt>
              <dd><span>
                {f.linked.length
                  ? `${f.linked.join(" · ")} 쪽에서 근거가 확인되었습니다. 이 회사의 업종(${f.org.themes.join(" · ")})과 같은 분야입니다.`
                  : "지금 응답에서는 이 회사와 같은 분야로 근거가 확인된 영역이 아직 없습니다."}
              </span></dd>
            </div>
            {f.open.length ? (
              <div>
                <dt>더 채우면 이어지는 영역</dt>
                <dd><span>
                  {f.open.join(" · ")} 쪽은 해 보셨지만 아직 정리가 덜 되었습니다.
                  아래 &lsquo;회사를 볼 때 해 볼 것&rsquo;을 한 번 해 두면 지원서에 적을 거리가 생깁니다.
                </span></dd>
              </div>
            ) : null}
            {f.paths.length ? (
              <div>
                <dt>고르신 산업·직무와 겹치는 곳</dt>
                <dd><span>{f.paths.join(" · ")}</span></dd>
              </div>
            ) : null}
          </dl>
          {v.semiRelevant && v.semiCount < 5 ? (
            <p className="rs-others">
              {v.city} 명단에서 업종이나 주력 품목에 반도체가 적힌 곳은 {v.semiCount}곳입니다.{" "}
              {withJosa(f.org.name, "이가")} 기계 제조업으로 등록되어 있듯, 반도체 쪽 일은 아래
              기계·장비와 전기·전자 묶음의 회사에서도 함께 찾아볼 수 있습니다.
            </p>
          ) : null}
        </div>
      ) : null}

      {v.strong.length ? (
        <div className="rs-pack">
          <h3>내 결과와 잘 맞는 곳 {v.strongN}곳</h3>
          <p>
            근거가 확인된 영역이 그 회사의 업종이나 주력 품목과 같은 분야에 있습니다.
            분야마다 상장사를 먼저 적었습니다.
          </p>
          {v.strong.map((g) => <Group key={g.theme} g={g} lead="이 결과에서 확인된 영역:" />)}
        </div>
      ) : null}

      {v.next.length ? (
        <div className="rs-pack">
          <h3>한 걸음 더 채우면 맞는 곳 {v.nextN}곳</h3>
          <p>
            해 본 적은 있지만 아직 정리가 덜 된 영역, 또는 확인된 영역에서 이어지는
            산업과 같은 분야에 있는 곳입니다.
          </p>
          {v.next.map((g) => <Group key={g.theme} g={g} lead="해 보셨거나 고르신 것:" />)}
        </div>
      ) : null}

      {!v.strong.length && !v.next.length ? (
        <div className="rs-pack">
          <h3>같은 분야로 확인된 곳은 아직 없습니다</h3>
          <p>
            지금 응답에서 확인된 영역과 같은 분야로 적힌 {v.city} 기업이 명단에 없습니다.
          </p>
        </div>
      ) : null}

      {v.tries.length ? (
        <div className="rs-pack">
          <h3>회사를 볼 때 해 볼 것</h3>
          <dl>
            {v.tries.map((t) => (
              <div key={t.theme}>
                <dt>{t.theme}</dt>
                <dd><span>{t.text}</span></dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <p className="rs-others">
        {SEJONG_LAW} 명단은 중소벤처기업부 벤처기업 확인 명단(소재지 {v.city})과 OpenDART
        기업개황(본점 {v.city})에서 옮겼습니다. 기준일 {v.builtOn}.
      </p>
    </section>
  );
}
