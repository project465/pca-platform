/**
 * **질문 아래 한 줄. 학생이 자기 경험을 떠올리는 자리.**
 *
 * 받은 규격은 묻는 화면의 차례를 `질문 → 짧은 실제 예시 → 선택` 으로
 * 적었다. 전에는 가운데가 비어 있었다: 보기 넷의 뜻풀이는 접힌 자리에
 * 한 번 서고, 그 영역에서 그 판단을 **어디에서 해 봤을 만한가**는 화면
 * 어디에도 없었다. 그래서 2학년이 `구속 조건을 직접 정했나요?` 를 읽고
 * 자기 캡스톤을 떠올리지 못한 채 `해본 적 없음` 을 고른다.
 *
 * ## 지어내지 않는다
 *
 * 예시 문장은 **그 Core 의 체크리스트**(영역 × 축)에서 그대로 가져온다.
 * 그 목록은 응시자가 근거 고르기에서 고르는 문장이고 그 전공을 아는
 * 사람이 쓴 것이다. 장면(`조별 과제` · `임상 실습`)만
 * `me-v3-student-scenes.json` 에서 고른다.
 *
 * **산업팩 문항은 이미 들고 있던 것을 쓴다.** 팩 문항마다 `gloss` 가
 * 있는데(그 판단을 일반 말로 바꿔 적은 줄) **화면이 한 번도 읽지 않았다**:
 * 쓰는 자리가 검사 셋뿐이었다. 그 줄이 있어야 그 산업의 낱말을 모르는
 * 학생이 같은 판단을 자기 경험으로 알아본다.
 *
 * ## 판정에 들어가지 않는다
 *
 * 돌려주는 것은 화면에 적는 글자뿐이고 채점과 결과 모델은 이 파일을
 * 읽지 않는다. 같은 응답이면 예시가 무엇이든 같은 판정이 나온다.
 */
import { readFileSync } from "node:fs";
import { CONTENT_DIR, coreFile } from "../core-registry";

type Checklists = {
  domains: Record<string, Record<string, { text: string }[]>>;
  common: Record<string, { text: string }[]>;
};

type Item = {
  item_id: string; technical_domain?: string | null;
  evidence_axis?: string | null; response_scale?: string | null;
};

let scenes: Record<string, string[]> | null = null;

/** 그 Core 의 장면 묶음. **적지 않은 Core 는 그 자리에서 멈춘다** */
export function studentScenes(core: string, dir = CONTENT_DIR): string[] {
  if (!scenes) {
    scenes = (JSON.parse(readFileSync(
      `${dir}/me-v3-student-scenes.json`, "utf8")) as
      { scenes: Record<string, string[]> }).scenes;
  }
  const got = scenes[core];
  if (!got?.length) {
    throw new Error(`${core} 의 학생 장면이 me-v3-student-scenes.json 에 없습니다`);
  }
  return got;
}

/** 같은 문항이면 늘 같은 자리를 고른다. 찍을 때마다 장면이 바뀌면 안 된다 */
function pick<T>(list: T[], key: string): T {
  let n = 0;
  for (let i = 0; i < key.length; i++) n = (n * 31 + key.charCodeAt(i)) % 100003;
  return list[n % list.length];
}

/**
 * 그 문항 아래에 세울 한 줄. 없으면 `null`.
 *
 * 보기 넷으로 받는 문항만 돌려준다. 다섯 칸 척도(관심 · 배울 뜻)와 고르는
 * 문항은 예시가 필요한 자리가 아니다: 묻는 것이 경험이 아니다.
 */
export function exampleOf(
  core: string, it: Item, gloss?: string | null, dir = CONTENT_DIR,
): string | null {
  if (it.response_scale !== "L0~L3") return null;
  /* 산업팩은 그 산업의 낱말을 쓴다. 쉬운 말 풀이가 그 자리의 예시다 */
  if (gloss) return gloss;

  const cl = coreFile<Checklists>(core, "checklists", dir);
  const axis = it.evidence_axis ?? null;
  if (!axis) return null;
  const list = it.technical_domain
    ? cl.domains[it.technical_domain]?.[axis] ?? []
    : cl.common[axis] ?? [];
  if (!list.length) return null;
  return pick(list, it.item_id).text;
}

/**
 * **어디에서 해 본 것이든 괜찮다는 한 줄.** 묶음의 첫 질문에만 선다.
 *
 * 장면을 문항마다 붙이지 않는 까닭이 둘이다. 하나는 같은 말이 문항마다
 * 서면 그것이 새 틀이 되는 것이고, 둘은 **장면이 그 판단과 안 맞는
 * 자리가 생기는 것**이다. 실제로 그렇게 만들어 보니 간호의 `줄 약을
 * 처방과 대조했다` 에 `간호 동아리에서` 가 붙었다. 학부생이 동아리에서
 * 약을 주지는 않는다.
 *
 * 그래서 장면은 **묶음마다 한 번** 세우고, 문항 아래에는 그 영역에서
 * 실제로 하는 판단 한 줄만 둔다.
 */
export function sceneHint(core: string, dir = CONTENT_DIR): string {
  /* 장면 이름을 쉼표로 잇는다. 가운뎃점으로 이으면 이름 안의 가운뎃점
     (`교지·학보 활동`)과 섞이고, `가운데` 로 맺으면 고르는 화면처럼 읽힌다 */
  const list = studentScenes(core, dir).slice(0, 5).join(", ");
  return `${list} 등 어디에서 해 본 일이든 괜찮습니다.`;
}
