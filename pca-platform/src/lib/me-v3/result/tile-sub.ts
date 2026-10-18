import { studentActivity } from "@/lib/me-v3/student";

/**
 * 현재 상태 카드의 **세부 한 줄**.
 *
 * **taxonomy 의 말을 학생 화면에 그대로 내보내지 않는다.** 전에는 이
 * 파일이 `BIZ_CORE_V1` 열둘을 직접 들고 있었고 나머지 열아홉 Core 는
 * `domainSub` 로 떨어졌다. 그 함수가 내놓는 것은 `*-taxonomy.json` 의
 * `subareas` 를 가운뎃점으로 잇고 열한 자에서 자른 값이라, 여섯 Core 를
 * 한 장에 놓으면 `고객을 나누고 반응 비교하기` 옆에 `확인할 것·줄 방법`
 * 이 섰다(R28 의 B1).
 *
 * 지금 그 사전은 `src/lib/me-v3/student/` 한 자리에 있다. 결과지와
 * 작업공간이 같은 object 를 읽으므로 **같은 영역이 화면마다 다른 말로
 * 서지 않는다**(R28 의 B3). 이 파일은 그 자리를 가리키는 이름으로만
 * 남는다: 결과지가 부르는 이름을 바꾸면 되짚을 때 자리가 끊긴다.
 *
 * **측정 모델과 taxonomy key 는 그대로다.** 여기서 바뀌는 것은 화면에
 * 적는 글자뿐이고, 영역을 고르는 일도 차례도 판정도 손대지 않는다.
 */
export function tileSub(core: string, code: string): string {
  return studentActivity(core, code);
}
