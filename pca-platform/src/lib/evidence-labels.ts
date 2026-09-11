import type { Lang } from "./locale";

/**
 * 증거 출처의 이름과 설명.
 *
 * evidence_sources 는 배점만 들고 있고 이름이 없다. translations 에 넣을 수도
 * 있지만 출처 여덟 개는 전 세계 공통이고 늘어날 일이 드물어, 화면 문구와 같은
 * 자리에 둔다. 나라가 늘면 여기 한 줄씩 붙는다.
 */
type Tri = Record<Lang, string>;
const d = (ko: string, en: string, tr: string): Tri => ({ ko, en, tr });

export const SOURCE_NAME: Record<string, Tri> = {
  COURSE: d("이수 과목", "Course passed", "Geçilen ders"),
  CERT: d("자격증", "Certificate", "Sertifika"),
  PROJECT: d("프로젝트", "Project", "Proje"),
  INTERN: d("인턴·현장실습", "Internship", "Staj"),
  NCS_UNIT: d("NCS 능력단위", "NCS unit", "NCS birimi"),
  AWARD: d("공모전·수상", "Award", "Ödül"),
  SOFTWARE: d("소프트웨어 사용", "Software used", "Kullanılan yazılım"),
  SELF: d("자기평가", "Self-assessment", "Öz değerlendirme"),
};

export const SOURCE_NOTE: Record<string, Tri> = {
  COURSE: d("성적표로 확인됩니다", "Confirmed by transcript", "Transkriptle doğrulanır"),
  CERT: d("발급 기관이 보증합니다", "Backed by the issuer", "Veren kurum güvence verir"),
  PROJECT: d("결과물보다 과정 기록", "The process record, not the artifact", "Ürün değil, sürecin kaydı"),
  INTERN: d("기간과 담당 업무", "Duration and the work you did", "Süre ve yaptığınız iş"),
  NCS_UNIT: d("국가직무능력표준 단위", "National competency standard unit", "Ulusal yetkinlik standardı birimi"),
  AWARD: d("수상 내역", "What you won", "Kazandığınız ödül"),
  SOFTWARE: d("자기보고라 가장 낮게 셉니다", "Self-reported, so it counts least", "Öz beyan olduğu için en az sayılır"),
  SELF: d("자기보고라 가장 낮게 셉니다", "Self-reported, so it counts least", "Öz beyan olduğu için en az sayılır"),
};

export function sourceName(code: string, lang: Lang): string {
  return SOURCE_NAME[code]?.[lang] ?? code;
}
export function sourceNote(code: string, lang: Lang): string {
  return SOURCE_NOTE[code]?.[lang] ?? "";
}
