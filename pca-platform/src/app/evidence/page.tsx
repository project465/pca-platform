import { requireRole } from "@/lib/session";
import { competencies, evidenceOf, evidenceSources, grades } from "@/lib/evidence";
import { resolveLang } from "@/lib/locale-server";
import EvidenceBoard from "./evidence-board";

export const metadata = { title: "역량 증거 — METRI" };

/**
 * 증거 입력 화면.
 *
 * 결과지 05절이 "보유 수준 미확인" 으로 비어 있는 것을 채우는 곳이다.
 * 1순위 직무가 요구하는 역량이 위에 오고, 그 아래가 나머지다 — 49개를
 * 코드순으로 늘어놓으면 학생은 어디부터 손대야 할지 모른다.
 */
export default async function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const user = await requireRole(["student"]);
  const { lang: q } = await searchParams;
  const lang = await resolveLang(q);

  const [rows, ev, sources, gradeList] = await Promise.all([
    competencies(user.id, lang),
    evidenceOf(user.id, lang),
    evidenceSources(),
    grades(),
  ]);

  return (
    <EvidenceBoard
      lang={lang}
      rows={rows}
      evidence={ev}
      sources={sources}
      grades={gradeList.map((g) => g.grade)}
    />
  );
}
