import { appEnv } from "./env";
import { businessInfo } from "./business";
import { supportConfig } from "./support";

/**
 * 공개 상거래 화면을 열어도 되는가.
 *
 * 상품 쪽과 가격표에는 **아직 안 채운 칸을 그 자리에 적어 두는** 자리가
 * 둘 있다: 전자상거래법 제10조 표시 일곱 칸의 `확인 필요`, 그리고 `지원
 * 메일 주소가 아직 설정되지 않았습니다`. 채우는 쪽에게는 그게 할 일
 * 목록이라 **공개 전에는 보이는 쪽이 낫다.** 운영에서는 반대다: 사는
 * 사람이 보는 자리에 `확인 필요` 가 찍히면 상호도 환불 연락처도 없는
 * 가게가 되고, 그 상태로 결제를 받는 것이 법이 막는 바로 그것이다.
 *
 * 그래서 **판단을 환경으로 가른다.** dev·staging 은 늘 열고, 운영은
 * 일곱 칸과 지원 주소가 다 찬 뒤에만 연다. 비어 있으면 상거래 화면을
 * 닫고 그 사실만 적는다. **빈칸을 지우는 것으로 넘기지 않는다**: 줄을
 * 지우면 화면은 멀쩡해 보이고 가게는 여전히 상호가 없다.
 *
 * 막힌 것이 무엇인지는 운영자만 본다(`/admin/launch` 의 `BUSINESS_INFO` ·
 * `SUPPORT` 갈래). 공개 화면에 환경변수 이름을 적지 않는다.
 */
export type PublicGate =
  | { open: true; missing: [] }
  | { open: false; missing: string[] };

export async function publicCommerceGate(): Promise<PublicGate> {
  if (appEnv() !== "production") return { open: true, missing: [] };

  const biz = await businessInfo();
  const sup = await supportConfig();
  const missing = [...biz.missing];
  if (!sup.ready) missing.push("support_email");
  return missing.length === 0
    ? { open: true, missing: [] }
    : { open: false, missing };
}
