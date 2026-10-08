/**
 * 영역 사전에서 **사람에게 보여 줄 사실**만 꺼낸다.
 *
 * 응시 화면이 쓰는 `session.ts` 는 `ME_V3_ASSESSMENT_UI_V1` 로 굳혀 둔
 * 파일이다. 결과지에 영역 설명 한 줄을 붙이려고 그 파일을 건드리면,
 * 동결 검사가 **응시 화면이 바뀌었다**고 적는다. 바뀐 것은 결과지인데
 * 기록은 응시 화면에 남는다. 그래서 읽는 자리를 따로 둔다.
 *
 * 여기서 하는 일은 읽기뿐이다. 판정도 하지 않고 문장도 만들지 않는다.
 */
import { coreFile } from "../core-registry";

const CORE = "ME_CORE_V3";

type Domain = { code: string; artifacts?: string[]; verify_targets?: string[] };
type Domains = { domains: Domain[] };

let cache: Domains | null = null;
function domains(): Domain[] {
  if (!cache) cache = coreFile<Domains>(CORE, "domains");
  return cache.domains;
}

/**
 * 그 영역에서 흔히 남기는 결과물.
 *
 * **아직 해 보지 않은 사람에게 가장 먼저 필요한 것이 이것이다.** 어느
 * 쪽부터 보라는 말만으로는 무엇을 향해 가는지 알 수 없고, 남길 것이
 * 보이면 짧은 과제 하나도 겨냥할 자리가 생긴다.
 */
export function domainArtifacts(td: string): string[] {
  return (domains().find((d) => d.code === td)?.artifacts ?? []).slice(0, 4);
}
