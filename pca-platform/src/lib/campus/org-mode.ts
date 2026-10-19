/**
 * **학교 전용 진입으로만 운영하는 기관인가.**
 *
 * 담당자 메뉴의 옛 줄 일곱(참여자 · 회차 · 좌석 · 직무 집계 · 증거 집계 ·
 * 보고 · 설정)과 첫 화면(`/org`)은 옛 계약·좌석·`attempts` 표를 읽는다.
 * 학교 전용 진입(`/campus/<학교>`)으로 운영하는 기관은 그 표에 줄이 없어서,
 * 그 화면들이 **학생 수십 명이 결과를 받은 날에도 `계약 없음` 과 `완료 0`**
 * 을 적었다. 담당자는 로그인하자마자 그 화면을 받고 집계가 깨진 줄로 읽는다.
 *
 * 판정은 둘이 다 맞을 때다: 그 기관의 코드가 학교 등록부에 있고 · 옛 계약이
 * 한 줄도 없다. 옛 계약이 있는 기관은 전과 같은 메뉴를 받는다(옛 검사를
 * 산 학과가 그 화면으로 일한다). **판정은 이 함수 하나다**(설계 원칙 10):
 * 메뉴와 첫 화면과 옛 쪽의 돌려보냄이 같은 답을 읽는다.
 */
import { contractsOf, orgsOf } from "@/lib/org";
import { university } from "@/lib/campus/registry";
import { NAV_CAMPUS, NAV_CAMPUS_V3 } from "@/components/sf/nav";
import type { NavItem } from "@/components/sf/shell";

export async function campusV3Only(userId: string): Promise<boolean> {
  const orgs = await orgsOf(userId);
  if (!orgs.some((o) => o.code && university(o.code))) return false;
  const contracts = await contractsOf(orgs.map((o) => o.id));
  return contracts.length === 0;
}

export async function campusNav(userId: string): Promise<NavItem[]> {
  return (await campusV3Only(userId)) ? NAV_CAMPUS_V3 : NAV_CAMPUS;
}
