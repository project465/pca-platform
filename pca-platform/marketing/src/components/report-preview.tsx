import type { SiteContent } from "@/content";

/**
 * 결과지가 실제로 어떻게 생겼는지 보여주는 축소판.
 *
 * 글로 "직무 적합도를 낸다" 고 쓰는 것보다, 82 옆에 막대가 있는 편이
 * 학과 담당자에게 훨씬 빨리 전달된다. 값은 전부 예시이고 화면에서 그렇게 밝힌다.
 *
 * 막대는 한 계열(크기)이라 색을 나누지 않는다. 순위는 색이 아니라 순서로 말한다.
 * 역량 갭의 빗금은 결과지에서 부족분을 그리는 방식 그대로다.
 */

export function StudentPreview({ site }: { site: SiteContent }) {
  const t = site.outputs.student;
  const max = 100;

  return (
    <div className="rp">
      <div className="rp-head">
        <span className="rp-t">{t.fitHeading}</span>
        <span className="rp-ex">{site.outputs.exampleLabel}</span>
      </div>

      <ul className="rp-bars">
        {t.jobs.map((j, i) => (
          <li key={j.name} className={i === 0 ? "top" : undefined}>
            <span className="nm">{j.name}</span>
            <span className="track">
              <span className="fill" style={{ width: `${(j.score / max) * 100}%` }} />
            </span>
            <span className="val">{j.score}</span>
          </li>
        ))}
      </ul>

      <div className="rp-head second">
        <span className="rp-t">{t.gapHeading}</span>
      </div>

      <ul className="rp-gaps">
        {t.gaps.map((g) => {
          const short = Math.max(0, g.required - g.held);
          return (
            <li key={g.name}>
              <span className="nm">{g.name}</span>
              <span className="lv" role="img" aria-label={`${t.requiredLabel} ${g.required}, ${t.heldLabel} ${g.held}`}>
                {Array.from({ length: 5 }, (_, i) => {
                  const n = i + 1;
                  const cls = n <= g.held ? "held" : n <= g.required ? "short" : "none";
                  return <i key={n} className={cls} />;
                })}
              </span>
              <span className={`gv${short === 0 ? " met" : ""}`}>
                {t.requiredLabel} {g.required} · {t.heldLabel} {g.held}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CohortPreview({ site }: { site: SiteContent }) {
  const t = site.outputs.cohort;
  const max = Math.max(...t.bars.map((b) => b.pct));

  return (
    <div className="rp">
      <div className="rp-head">
        <span className="rp-t">{t.heading}</span>
        <span className="rp-ex">{site.outputs.exampleLabel}</span>
      </div>

      <ul className="rp-bars">
        {t.bars.map((b) => (
          <li key={b.name}>
            <span className="nm">{b.name}</span>
            <span className="track">
              <span className="fill" style={{ width: `${(b.pct / max) * 100}%` }} />
            </span>
            <span className="val">
              {b.pct}
              <em>{t.unit}</em>
            </span>
          </li>
        ))}
      </ul>

      <div className="rp-head second">
        <span className="rp-t">{t.missingHeading}</span>
      </div>
      <ul className="rp-miss">
        {t.missing.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  );
}
