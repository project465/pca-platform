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
import { CONTENT_DIR, coreFile, sharedFile } from "../core-registry";
import { copyFor } from "./copy";

type Checklists = {
  domains: Record<string, Record<string, { text: string }[]>>;
  common: Record<string, { text: string }[]>;
};

type Item = {
  item_id: string; technical_domain?: string | null;
  evidence_axis?: string | null; response_scale?: string | null;
  /** 한국어 문항 글. 예시를 고르는 데 쓴다(`closest`) */
  wording?: string | null;
  industry_pack?: string | null;
};

/** 두 글자 묶음. 띄어쓰기 · 문장부호를 걷고 센다 */
function bigrams(s: string): Set<string> {
  const t = s.replace(/[\s.,·'"‘’“”?!()~\-]/g, "");
  const out = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
}

/**
 * **문항과 가장 겹치는 줄을 고른다**(2026-11-01 배재대 운영 시험: 데이터·의사결정의
 * `넣을 자료와 뺄 자료를 정해 봤나요?` 아래에 `빠진 값과 튀는 값을 어떻게 처리할지
 * 정했다` 가, 다음 문항 아래에 그 반대가 섰다). 전에는 같은 축의 줄 가운데 문항 번호로
 * 아무 줄이나 골라, 같은 축의 두 문항이 서로의 예시를 받을 수 있었다. 겹치는 글자가
 * 하나도 없을 때만 전처럼 번호로 고른다. 돌려주는 것은 줄의 차례다: 다른 언어 원고도
 * 같은 차례에 같은 뜻이 있다.
 */
/** 문항 은행은 한 번만 읽는다. 문항마다 큰 파일을 다시 읽지 않게 */
const banks = new Map<string, Item[]>();

function overlap(a: string, b: string): number {
  const w = bigrams(a), x = bigrams(b);
  let n = 0;
  for (const g of x) if (w.has(g)) n += 1;
  return x.size ? n / x.size : 0;
}

/**
 * 같은 영역 · 같은 축의 문항들에게 줄을 나눠 준다. 겹치는 정도가 큰 짝부터 묶고,
 * **한 줄을 두 문항에 주지 않는다**(줄이 문항보다 적을 때만 다시 쓴다). 돌려주는 것은
 * 이 문항의 줄 차례이고, 겹치는 글자가 없으면 -1 이다.
 */
function closest(list: { text: string }[], me: Item, siblings: Item[]): number {
  const group = siblings.some((x) => x.item_id === me.item_id) ? siblings : [...siblings, me];
  const pairs: { i: number; j: number; s: number }[] = [];
  group.forEach((it, i) => list.forEach((x, j) => {
    const sc = it.wording ? overlap(it.wording, x.text) : 0;
    if (sc > 0) pairs.push({ i, j, s: sc });
  }));
  pairs.sort((a, b) => b.s - a.s || a.i - b.i || a.j - b.j);
  const got = new Map<number, number>();
  const used = new Set<number>();
  for (const p of pairs) {
    if (got.has(p.i) || used.has(p.j)) continue;
    got.set(p.i, p.j);
    used.add(p.j);
  }
  /* 남은 문항에는 아직 아무도 받지 않은 줄을 먼저 준다. 그래도 남으면 가장 겹치는 줄을 다시 쓴다 */
  group.forEach((_, i) => {
    if (got.has(i)) return;
    const free = list.findIndex((__, j) => !used.has(j));
    if (free >= 0) { got.set(i, free); used.add(free); return; }
    const p = pairs.find((x) => x.i === i);
    if (p) got.set(i, p.j);
  });
  return got.get(group.findIndex((x) => x.item_id === me.item_id)) ?? -1;
}

let scenes: Record<string, string[]> | null = null;

/** 그 Core 의 장면 묶음. **적지 않은 Core 는 그 자리에서 멈춘다** */
export function studentScenes(core: string, dir = CONTENT_DIR, lang = "ko"): string[] {
  /* 다른 언어는 공용 원고의 `scenes` 다. **없으면 멈춘다**: 한국어 장면을
     영어 화면에 세우지 않는다 */
  if (lang !== "ko") {
    const got = scenesOf(sharedFile(core, lang, dir).scenes, core);
    if (!got.length) throw new Error(`${core} 의 ${lang} 학생 장면이 공용 원고에 없습니다`);
    return got;
  }
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

/**
 * 공용 원고의 장면 칸. 계약은 `me-v3-student-scenes.json` 의 그 Core 항목과
 * **같은 모양**(글자 배열)이다. Core 이름을 열쇠로 한 겹 더 싼 꼴도 받는다:
 * 원고를 쓰는 쪽이 원본 파일의 모양을 그대로 옮겨 오는 일이 흔하다.
 */
export function scenesOf(raw: unknown, core: string): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const inner = o[core] ?? o.scenes ?? Object.values(o).find(Array.isArray);
    return Array.isArray(inner) ? inner.filter((x): x is string => typeof x === "string") : [];
  }
  return [];
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
  core: string, it: Item, gloss?: string | null, dir = CONTENT_DIR, lang = "ko",
): string | null {
  if (it.response_scale !== "L0~L3") return null;
  /* 산업팩은 그 산업의 낱말을 쓴다. 쉬운 말 풀이가 그 자리의 예시다 */
  if (gloss) return gloss;

  /* 고르는 자리가 언어와 무관하다: 두 원고는 길이와 차례가 같아서, 같은 문항이면
     두 언어에서 같은 줄(같은 뜻)이 선다 */
  const axis = it.evidence_axis ?? null;
  if (!axis) return null;
  const rows = (l: string) => {
    const cl = coreFile<Checklists>(core, "checklists", dir, l);
    return it.technical_domain
      ? cl.domains[it.technical_domain]?.[axis] ?? []
      : cl.common[axis] ?? [];
  };
  const list = rows(lang);
  if (!list.length) return null;
  /* 고르는 것은 한국어 문항과 한국어 원고로 한다. 차례가 같아 다른 언어에도 그대로 쓴다 */
  const ko = lang === "ko" ? list : rows("ko");
  const key = `${dir}|${core}`;
  let bank = banks.get(key);
  if (!bank) { bank = coreFile<{ items: Item[] }>(core, "items", dir, "ko").items ?? []; banks.set(key, bank); }
  /* 산업팩 문항은 제 풀이 줄(gloss)을 쓰므로 나눠 받는 데 넣지 않는다 */
  const siblings = bank.filter((x) => x.response_scale === "L0~L3" && !x.industry_pack
    && x.evidence_axis === axis && (x.technical_domain ?? null) === (it.technical_domain ?? null));
  const at = closest(ko.length === list.length ? ko : list, it, siblings);
  return (at >= 0 ? list[at] : pick(list, it.item_id)).text;
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
export function sceneHint(core: string, dir = CONTENT_DIR, lang = "ko"): string {
  /* 장면 이름을 쉼표로 잇는다. 가운뎃점으로 이으면 이름 안의 가운뎃점
     (`교지·학보 활동`)과 섞이고, `가운데` 로 맺으면 고르는 화면처럼 읽힌다.
     문장은 언어마다 `copy.*.ts` 의 `sceneHint` 가 든다 */
  return copyFor(lang).sceneHint(studentScenes(core, dir, lang).slice(0, 5));
}
