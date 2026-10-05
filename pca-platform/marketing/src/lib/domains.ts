/**
 * 도메인이 사는 자리. **소개 사이트 쪽은 여기 한 곳이다.**
 *
 * 플랫폼 쪽은 DB 의 `site_configs` 한 표에서 읽는다(설계 원칙: 도메인을
 * 코드에 적지 않는다). 소개 사이트는 정적 빌드라 DB 를 볼 수 없어서 적어
 * 둘 수밖에 없는데, 네 나라 원고에 네 번 적어 두면 **고칠 때 한 곳이
 * 반드시 남는다.** 실제로 `careermetri` → `careermatri` 로 한 글자를
 * 고치면서 원고 네 벌에 흩어진 열여섯 줄을 따로 고쳐야 했다.
 *
 * **철자가 한 글자 다르다는 것이 이 파일이 있는 까닭이다.** 받은 규격은
 * `careermatri` 이고 저장소가 오래 쓴 것은 `careermetri` 였다. 눈으로
 * 읽으면 둘이 같아 보이고, 소개 사이트의 '시작하기' 가 한 글자 다른
 * 주소를 가리키면 학생이 남의 집으로 간다.
 *
 * **아직 사지 않은 주소다.** 사기 전에 등록대행자에서 한 번 조회하고,
 * 어느 철자로 살지는 도메인을 사는 사람이 정한다. 정하고 나면 고칠 곳은
 * 이 파일과 `db/schema_platform.sql` 의 `site_configs` 두 줄이다.
 */

/** 플랫폼. 어느 나라 사이트에서 눌러도 여기로 간다(설계 원칙 5) */
export const PLATFORM_URL = "https://app.careermatri.com";

/** 소개 사이트. 나라마다 하나다 */
export const SITE_DOMAIN = {
  global: "careermatri.com",
  kr: "careermatri.co.kr",
} as const;

/** 밖에 띄우는 시장 목록. 준비 중인 곳은 `ready: false` 로 둔다 */
export const MARKET_LINKS = [
  { label: "Global (English)", href: `https://${SITE_DOMAIN.global}`, ready: false },
  { label: "한국", href: `https://${SITE_DOMAIN.kr}`, ready: false },
] as const;
