import Link from "next/link";
import { type Lang2, txer } from "@/lib/surface-text";

/**
 * 옛 검사 기록 쪽의 맨 윗줄.
 *
 * **이 세 쪽은 지금 검사를 못 읽는다.** `/my/assessments` 는 `attempts`
 * 를, `/my/results` 는 `report_snapshots` 를, `/my/evidence` 는
 * `evidence_profiles` 를 본다. 기계공학 V3 의 응시와 결과는 다른 표에
 * 있어서(`v3_attempts` · `v3_snapshots`) 여기서는 한 줄도 안 보인다.
 *
 * **쪽을 지우거나 질의를 늘리지 않았다.** 전에 응시한 분의 기록이 그
 * 표에 있고, 그 주소가 적힌 메일도 이미 나가 있다. 대신 **빈 목록을
 * 조용히 두지 않는다**: 지금 검사의 결과가 어디 있는지를 맨 위에 적는다.
 * 그 줄이 없으면 읽는 사람은 자기 결과가 사라진 줄 안다.
 */
export default function OlderNote({
  lang, to = "results",
}: {
  lang: Lang2;
  /** 어느 작업공간 쪽이 그 자리를 맡는가. 경험 쪽은 결과 기록이 아니다 */
  to?: "results" | "experience";
}) {
  const T = txer(lang);
  const go = to === "experience"
    ? { href: "/me/experience", body: "acOldEvidence" as const, label: "acOldExperience" as const }
    : { href: "/me/results", body: "acOldBody" as const, label: "acOldResults" as const };
  return (
    <div className="sf-note" style={{ marginBottom: 18 }}>
      <p style={{ margin: 0 }}>{T(go.body)}</p>
      <Link href={go.href} className="sf-btn ghost sm" style={{ marginTop: 12 }}>
        {T(go.label)}
      </Link>
    </div>
  );
}
