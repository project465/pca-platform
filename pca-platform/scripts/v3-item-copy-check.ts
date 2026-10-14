/**
 * **문항이 학생의 말로 적혀 있는가.** 전 Core 문항 은행을 글자로 센다.
 *
 * `v3:wording` 이 묻는 것은 **구조**다: 자리가 덮였는가 · 한 문항이 두
 * 가지를 묻는가 · 문면이 소유가 아니라 행동을 묻는가 · 돌려 쓴 문장이
 * 있는가. 여기서 묻는 것은 **읽는 사람 쪽**이다: 한 번 읽어 `내가 해 본
 * 일을 묻는구나` 가 되는가, 용어를 모르면 `없다` 를 고르게 되는 자리가
 * 있는가.
 *
 * 두 검사를 한 파일로 묶지 않는다. 구조가 깨지는 날과 문체가 흐트러지는
 * 날이 다르고, 한 파일에 담으면 둘 가운데 하나가 늘 뒤처진다.
 *
 * **세는 것은 사람이 거의 쓰지 않는 모양뿐이다.** 그 전공의 말(공차 ·
 * 불확도 · 중재 · 양생)은 **지우라고 요구하지 않는다**: §5 가 요구한 것은
 * 용어를 빼는 것이 아니라 **쉬운 말로 받쳐 주는 것**이라, 받침이 없는
 * 자리만 적어 낸다.
 *
 *   npm run v3:items:copy            전 Core
 *   CORE=EE_CORE_V1 npm run v3:items:copy
 */
import { readFileSync } from "node:fs";
import { hasCoreFile, registry } from "../src/lib/me-v3/core-registry";
import { termsOf } from "../src/lib/me-v3/runtime/terms";

type Item = {
  item_id: string; module: string; measurement_axis: string | null;
  evidence_axis: string | null; response_scale: string | null;
  wording: string | null; stage_wording: Record<string, string> | null;
  grid_row: string | null; grid_stem: string | null;
  options: string[] | null; option_values: (number | null)[] | null;
  gloss?: string | null;
};
type Bank = {
  core: string; item_bank_version: string; level_options: string[];
  option_guidance: string; items: Item[];
};

const REG = registry() as unknown as {
  cores: { code: string; status: string; files?: { items?: string }; name_ko?: string }[];
};
const CORES = (process.env.CORE ?? REG.cores
  .filter((c) => c.status === "building" && hasCoreFile(c.code, "items"))
  .map((c) => c.code).join(",")).split(",");

function bankOf(core: string): { bank: Bank; path: string } {
  const f = REG.cores.find((c) => c.code === core)?.files?.items;
  const path = `sites/pca-platform/content/${f}`;
  return { bank: JSON.parse(readFileSync(path, "utf8")) as Bank, path };
}

/** 사람이 거의 쓰지 않는 모양. 한도는 전부 0 이다 */
const BAD: { name: string; re: RegExp; why: string; axis?: string }[] = [
  {
    name: "능력 단정", re: /할 수 있다|능력이 (있|된)|잘한다|잘 한다|능숙|익숙하다|자신 ?있다/,
    why: "해 본 일이 아니라 능력을 묻는 꼴이다. 같은 자리에서 `~해 본 적이 있다` 로 적는다",
  },
  {
    name: "성향 단정", axis: "axis_level",
    re: /좋아한다|선호한다|끌린다|성향이|관심이 많다|편이 편하다|즐긴다/,
    why: "보기 넷은 누가 그 일을 소유했는가를 받는다. 성향을 물으면 그 응답이 축 수준이 된다",
  },
  {
    name: "보고서 문체", re: /본 연구|에 관하여|에 대하여|실시하였|수행한 바|제고|도모|강구|정립/,
    why: "연구·정책 보고서의 말이다. 학생이 자기 경험을 떠올리는 말로 적는다",
  },
  {
    name: "번역투", re: /되어진|에 의해|에 있어|하여금|통하여/,
    why: "한국어에서 거의 쓰지 않는 꼴이다. 주어를 세워 풀어 적는다",
  },
  {
    name: "AI식 추상", re: /종합적|체계적으로|효과적으로|최적의|최적화|전략적으로|다양한|유의미|고도화|극대화/,
    why: "무엇을 했는지가 사라진다. 그 자리에서 실제로 한 동작으로 적는다",
  },
  {
    name: "빈도 부사", axis: "axis_level",
    /* **대상을 가리키는 빈도는 세지 않는다.** `자주 멈춘 자리` 와 `예산이
       늘 적은 자리` 는 설비와 사정을 적은 말이고 응시자가 몇 번 했는지를
       묻는 말이 아니다. 세면 멀쩡한 문항을 고치라고 요구하게 된다 */
    re: /(자주|종종|수시로|상시로)\s*\S{0,4}(해 본|한 적|한 경험|수행|반복)/,
    why: "보기 넷은 빈도가 아니라 소유를 받는다. 빈도는 영역 훑기의 세 칸이 묻는다",
  },
];

/**
 * **그 전공의 말인데 받침이 없는 자리.**
 *
 * 지우라고 요구하는 목록이 아니다. 이 말은 그 전공에서 제자리에 쓰는
 * 말이고, 빼면 결과지가 얕아진다(저장소가 전부터 적어 둔 원칙이다). 다만
 * 2학년이 이 낱말 하나를 몰라서 `해 본 적 없음` 을 고르면 그 응답은
 * **경험이 없다는 뜻이 아니다.** 그래서 `gloss` 한 줄을 요구한다.
 *
 * 목록은 Core 전용 낱말을 세어 뽑고 사람이 골랐다. 늘리는 쪽으로만
 * 고친다: 빠뜨린 말은 다음 사람이 더하면 되고, 억지로 넣은 말은 멀쩡한
 * 문항을 고치라고 요구한다.
 */
const JARGON: Record<string, string[]> = {
  EE_CORE_V1: ["불확도", "정합", "누설", "단선도", "방사 특성", "오류율", "이득", "커패시터", "절연"],
  CS_CORE_V1: ["복잡도", "규약", "색인", "스키마", "맞바꿈", "이관", "렌더링", "잠금"],
  BT_CORE_V1: ["계대", "검량선", "일탈", "표준작업절차", "역가", "차폐", "배지", "균주"],
  NURSING_CORE_V1: ["중재", "무균", "조기경고", "회진"],
  CIV_CORE_V1: ["양생", "공종", "통수", "검측", "침하", "시방서", "기준점", "보정량"],
  ME_CORE_V3: ["공차", "불확도", "공정능력", "경계 조건", "수렴"],
  ARCH_CORE_V1: ["용적", "일조", "마감재"],
  AGRI_CORE_V1: ["적심", "관주", "토성"],
  FOOD_CORE_V1: ["검량선", "관능", "유통기한 설정"],
  HEALTH_CORE_V1: ["사정", "청구", "급여"],
  LAW_CORE_V1: ["요건", "입증", "처분"],
  PUBADM_CORE_V1: ["교부", "정산", "집행률"],
  PSY_CORE_V1: ["신뢰도", "타당도", "규준"],
  SPORTS_CORE_V1: ["처방", "가동범위", "부하"],
  STYLE_CORE_V1: ["패턴", "그레이딩", "소재 혼용률"],
  VISUAL_CORE_V1: ["그리드", "커닝", "색 교정"],
  MEDIA_CORE_V1: ["큐시트", "편성", "노출"],
  LANG_CORE_V1: ["교열", "말뭉치", "전사"],
  EDU_CORE_V1: ["성취기준", "평가기준", "차시"],
  BIZ_CORE_V1: ["손익", "원가", "전환율"],
};

/**
 * 받침이 있는가.
 *
 * 넷 가운데 하나면 받침이 선 것이다: 말 표에 그 말이 적혀 있다 · 문항에
 * `gloss` 가 붙어 있다 · 괄호로 풀어 적었다 · `같은` 이나 `예를 들어` 로
 * 예시를 들었다. **첫째가 거의 전부다**: 같은 말이 문항 여덟 자리에 서는데
 * 여덟 번 따로 적으면 그 가운데 하나가 어긋난다.
 */
function supported(core: string, it: Item, term: string, text: string): boolean {
  if (termsOf(core)[term]) return true;
  if (it.gloss) return true;
  const at = text.indexOf(term);
  const after = text.slice(at + term.length, at + term.length + 24);
  return /^\s*\(/.test(after) || /같은|예를 들어|이를테면|즉/.test(text);
}

const NOMINAL = /수립|도출|산정|실시|이행|제반|당해|소정|기술적 검토|사전 검토/g;

type Finding = {
  core: string; id: string; rule: string; hit: string; text: string; why: string;
};

function main(): void {
  const findings: Finding[] = [];
  const meta: string[] = [];
  let items = 0;
  for (const core of CORES) {
    const { bank, path } = bankOf(core);
    /* **그 Core 의 은행이라고 적혀 있는가.** 열여덟 은행이 `EE_CORE_V1` 을
       적고 있었다(EE 머리를 베껴 쓴 자리다). 읽는 코드가 없어 아무 일도
       일어나지 않지만, 되짚을 때 **그 파일이 남의 Core 의 은행이라고
       말한다** */
    if (bank.core !== core) {
      meta.push(`${path} 의 core 칸이 ${bank.core} 다`);
    }
    for (const it of bank.items) {
      items += 1;
      const texts = [it.wording, ...Object.values(it.stage_wording ?? {}), it.grid_row]
        .filter((x): x is string => Boolean(x));
      for (const t of texts) {
        for (const r of BAD) {
          if (r.axis && it.measurement_axis !== r.axis) continue;
          const m = r.re.exec(t);
          if (m) {
            findings.push({
              core, id: it.item_id, rule: r.name, hit: m[0].trim(), text: t, why: r.why,
            });
            break;
          }
        }
        const nom = t.match(NOMINAL) ?? [];
        if (nom.length >= 2) {
          findings.push({
            core, id: it.item_id, rule: "명사화 과다", hit: nom.join("·"), text: t,
            why: "행정 문서의 말이 겹쳤다. 동작으로 풀어 적는다",
          });
        }
        /* 보기 넷을 쓰는 문항에서만 센다. 격자 줄은 영역 이름에 가까워
           용어가 그대로 서는 것이 맞다 */
        if (it.response_scale === "L0~L3") {
          for (const term of JARGON[core] ?? []) {
            if (t.includes(term) && !supported(core, it, term, t)) {
              findings.push({
                core, id: it.item_id, rule: "용어 받침 없음", hit: term, text: t,
                why: "이 말을 모르면 해 본 사람도 `없다` 를 고른다. 쉬운 말 한 줄(`gloss`)을 붙인다",
              });
            }
          }
        }
      }
      /* 빈도 척도는 셋 그대로다. 전공마다 다른 빈도 체계를 만들면 같은
         `1` 이 전공에 따라 다른 뜻이 된다 */
      if (it.response_scale === "3보기") {
        const o = (it.options ?? []).join("/");
        const v = (it.option_values ?? []).join("/");
        if (o !== "없다/한두 번/여러 번" || v !== "0/1/2") {
          findings.push({
            core, id: it.item_id, rule: "빈도 척도", hit: `${o} (${v})`, text: it.wording ?? "",
            why: "빈도 척도는 세 칸 하나뿐이다",
          });
        }
      }
    }
  }

  /* **학위 장면마다 한 번씩 세지 않는다.** 한 문항이 문면 다섯 벌을
     들고 있어서(학사·석사·박사·포닥과 기본) 같은 자리가 다섯 번 적힌다.
     고치는 쪽에서 보면 그것은 한 자리다 */
  const seen = new Set<string>();
  const uniq = findings.filter((f) => {
    const k = `${f.core}:${f.id}:${f.rule}:${f.hit}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const byRule = new Map<string, Finding[]>();
  for (const f of uniq) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);
  console.log(`문항 카피 — Core ${CORES.length} · 문항 ${items}`);
  for (const [rule, list] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  걸림 ${rule} — ${list.length}`);
    for (const f of list.slice(0, 12)) {
      console.log(`    ${f.core.replace(/_CORE_V\d/, "").padEnd(8)} ${f.id.padEnd(22)} `
        + `${f.hit}\n      ${f.text}`);
    }
    if (list.length > 12) console.log(`    … 그 밖에 ${list.length - 12}가지`);
    console.log(`    고치는 법: ${list[0].why}`);
  }
  if (meta.length) {
    console.log(`\n  걸림 은행 머리 — ${meta.length}`);
    for (const m of meta.slice(0, 4)) console.log(`    ${m}`);
    if (meta.length > 4) console.log(`    … 그 밖에 ${meta.length - 4}벌`);
  }
  /* **쓰는 말이 표에 없는 자리.** 위 규칙과 같은 자리를 세지만 고치는
     곳이 다르다: 저쪽은 문항이고 이쪽은 말 표다 */
  const perCore = new Map<string, number>();
  for (const f of uniq) perCore.set(f.core, (perCore.get(f.core) ?? 0) + 1);
  console.log(`\nCore 별 걸림 — ${[...perCore].sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${c.replace(/_CORE_V\d/, "")} ${n}`).join(" · ")}`);
  console.log(`\n걸림 ${uniq.length + meta.length}`
    + ` (문항 ${new Set(uniq.map((f) => `${f.core}:${f.id}`)).size}자리 · 은행 머리 ${meta.length})`);
  if (uniq.length || meta.length) process.exitCode = 1;
}

main();
