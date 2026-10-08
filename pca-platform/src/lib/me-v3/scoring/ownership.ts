/**
 * 보기 넷의 뜻. **여기가 유일한 출처다.**
 *
 * 문면은 축의 `l2` 행동을 묻고 보기가 **누가 그 행동을 소유했는가**를
 * 받는다. 그래서 `해석 프로그램을 돌렸다` 와 `해석 조건을 정했다` 가 같은
 * 칸에 들어가면 안 된다: 조건을 받아 쓴 쪽은 `RECEIVED` 다.
 *
 * 화면과 문서와 채점이 같은 표를 읽는다. 사람이 읽는 말은 문항 은행의
 * `level_options` 에 있고 뜻은 여기 있다.
 */

export const OWNERSHIP = [
  {
    code: "NONE", index: 0,
    means: "그 일을 해 본 적이 없다",
  },
  {
    code: "RECEIVED", index: 1,
    means: "남이 정한 조건이나 결과를 받아 썼다. 도구를 돌리기만 한 것이 여기다",
  },
  {
    code: "DID", index: 2,
    means: "그 일을 내가 했다. 판단에 참여한 범위까지가 여기다",
  },
  {
    code: "DECIDED_USED", index: 3,
    means: "조건이나 기준을 내가 정했고 그 결과가 다음 작업에 쓰였다",
  },
] as const;

export type Ownership = typeof OWNERSHIP[number]["code"];

const BY_INDEX = new Map<number, Ownership>(
  OWNERSHIP.map((o) => [o.index as number, o.code as Ownership]));

/** 보기 번호(0~3)를 뜻으로 바꾼다. 범위를 벗어나면 던진다 */
export function ownershipOf(index: number): Ownership {
  const code = BY_INDEX.get(index);
  if (!code) throw new Error(`보기 번호가 0~3 밖이다: ${index}`);
  return code;
}

export function ownershipIndex(code: Ownership): number {
  return OWNERSHIP.find((o) => o.code === code)?.index ?? 0;
}

/** 더 높은 쪽. 한 칸에 문항이 둘일 때 쓴다 */
export function maxOwnership(a: Ownership, b: Ownership): Ownership {
  return ownershipIndex(a) >= ownershipIndex(b) ? a : b;
}
