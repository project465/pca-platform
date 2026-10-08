import "./assessment.css";

/**
 * ME_V3 응시 화면의 바깥.
 *
 * 공개 머리띠와 꼬리말을 두지 않는다. 응시 중에는 나가는 길이 눈에
 * 먼저 들어오면 안 되고, 꼬리말의 사업자 표시는 **사는 자리**에 둘
 * 것이다(여기는 이미 산 사람이 들어온 자리다).
 */
export const metadata = { title: "검사 · CareerMatri" };

export default function V3Layout({ children }: { children: React.ReactNode }) {
  return children;
}
