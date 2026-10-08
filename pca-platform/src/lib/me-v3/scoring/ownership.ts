/**
 * 보기 넷의 뜻. **여기가 유일한 출처다.**
 *
 * 문면은 축의 `l2` 행동을 묻고 보기가 **누가 그 행동을 소유했는가**를
 * 받는다. 그래서 `해석 프로그램을 돌렸다` 와 `해석 조건을 정했다` 가 같은
 * 칸에 들어가면 안 된다: 조건을 받아 쓴 쪽은 `RECEIVED` 다.
 *
 * 화면과 문서와 채점이 같은 표를 읽는다. 사람이 읽는 말은 문항 은행의
 * `level_options` 에 있고 뜻은 여기 있다.
 *
 * **문말을 화면의 말투로 맞췄다.** 네 줄이 `~다` 로 끝나는 규격 문체였고,
 * 응시자는 이 네 줄을 백 번 가까이 본다. 한 흐름 안에서 보기 문면은
 * `~다`(문항 은행)이고 그 아래 뜻풀이는 `~입니다`(화면)인데, 뜻풀이까지
 * 규격 문체면 두 사람이 쓴 글을 읽는 꼴이 된다. **판정에 쓰는 것은 자리
 * 번호뿐이라 글자를 고쳐도 같은 응답이 같은 수준이다.**
 */

export const OWNERSHIP = [
  {
    code: "NONE", index: 0,
    means: "그 일을 해 본 적이 없습니다",
  },
  {
    code: "RECEIVED", index: 1,
    means: "조건이나 결과를 받아서 썼습니다. 도구만 돌린 것도 여기입니다",
  },
  {
    code: "DID", index: 2,
    means: "그 일을 직접 했습니다. 정하는 자리에 함께 있었다면 여기입니다",
  },
  {
    code: "DECIDED_USED", index: 3,
    means: "조건이나 기준을 직접 정했고 그 결과가 다음 작업에 쓰였습니다",
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
