/**
 * 사람이 읽는 전공 이름. **등록부 하나에서 읽는다.**
 *
 * 전에는 `기계공학` 이 결과지와 작업공간 열 자리에 **글자로 박혀** 있었다
 * (`me/shell.tsx` 의 `const MAJOR` 와 `/me`·`/me/results`·`/me/state`·
 * `/me/next`, 그리고 결과지의 제목 줄). 그래서 경영학과 학생이 친 검사의
 * 결과지에도 `기계공학 진로 진단 결과` 가 찍혔고, 그 종이는 손에 남는다.
 *
 * **Core 이름을 화면에 적지 않는다.** 전공이 늘어나는 일이 화면을 고치는
 * 일이 되면, 늘어난 화면 하나가 반드시 빠뜨린다.
 */
import { core as coreEntry } from "./core-registry";
import { activeCore } from "./platform";

/** 그 Core 의 한국어 이름. 모르는 코드면 `null` 이다 */
export function majorNameOf(core: string | null | undefined): string | null {
  if (!core) return null;
  try { return coreEntry(core).name_ko ?? null; } catch { return null; }
}

/**
 * 이 사람이 지금 쓰고 있는 전공의 이름.
 *
 * **모르면 `null` 을 돌려준다.** 응시도 지금 값도 없는 사람에게 아무
 * 전공 이름이나 적으면 그 사람은 자기가 그 검사를 친 줄 안다.
 */
export async function activeMajorName(userId: string): Promise<string | null> {
  try { return majorNameOf(await activeCore(userId)); } catch { return null; }
}

/**
 * 그 계열에 드는 학과 보기 한 줄. **등록부의 별칭에서 온다.**
 *
 * 화면에 적어 두면 전공이 늘 때마다 그 줄을 고쳐야 하고, 고치지 않은
 * 날 다른 전공 학생이 기계공학 학과 목록을 읽는다.
 */
export function majorExamplesOf(core: string | null | undefined): string {
  if (!core) return "";
  try {
    const e = coreEntry(core);
    return (e.aliases ?? []).slice(0, 6).join(" · ");
  } catch { return ""; }
}
