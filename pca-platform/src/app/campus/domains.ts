import { coreFile, hasCoreFile, specializationOf } from "@/lib/me-v3/core-registry";

/**
 * 그 Core 가 살펴보는 기술영역 이름.
 *
 * **학과 소개를 지어내지 않는다.** 우리가 아는 것은 그 학과가 어느 Major
 * Core 로 가는가까지이고, 학과가 무엇을 가르치는지는 학교가 적는 글이다.
 * 적을 수 있는 것은 **그 검사가 실제로 묻는 영역의 이름**이고, 그 값은
 * 그 Core 의 taxonomy 가 들고 있다.
 *
 * 한 자리에 둔 까닭은 학과 목록과 학과 상세가 같은 줄을 적기 때문이다.
 * 두 쪽이 따로 읽으면 어느 날 한쪽만 고쳐진다.
 */
/**
 * **학과 목록 한 줄에 적는 영역 셋.** 그 학과의 세부 판(갈래)이 먼저 보는 영역(`domain_emphasis.lead`)을 쓴다.
 * 전에는 언제나 계열 열두 영역의 앞 셋이라, 사회복지학과가 `보건사업 기획 · 건강 자료 분석 · 건강 교육` 으로
 * 보였다(2026-11-02 시험). 갈래가 없거나 lead 가 없으면 앞 셋이다
 */
export function leadDomainNames(coreCode: string, specialization: string | null | undefined): string[] {
  if (!hasCoreFile(coreCode, "taxonomy")) return [];
  try {
    const t = coreFile<{ technical_domains?: { code: string; name: string }[] }>(coreCode, "taxonomy");
    const all = t.technical_domains ?? [];
    const emph = specialization ? (specializationOf(coreCode, specialization)?.domain_emphasis as { lead?: string[] } | undefined) : undefined;
    const lead: string[] = emph?.lead ?? [];
    const picked = lead.map((c) => all.find((d) => d.code === c)?.name).filter((x): x is string => !!x);
    return (picked.length ? picked : all.map((d) => d.name)).slice(0, 3);
  } catch { return []; }
}

export function domainNames(coreCode: string): string[] {
  if (!hasCoreFile(coreCode, "taxonomy")) return [];
  try {
    const t = coreFile<{ technical_domains?: { name: string }[] }>(
      coreCode, "taxonomy");
    return (t.technical_domains ?? []).map((d) => d.name);
  } catch { return []; }
}
