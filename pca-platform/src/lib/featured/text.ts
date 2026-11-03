/**
 * 중점 기업 카드의 한국어. **받는 사람에 따라 말을 고른다**: 일자리 기관 참여자에게는
 * 학과 · 학번 · 수업 · 학기 같은 학교 말을 쓰지 않는다(2026-11-03 진흥원 지시).
 * `npm run featured:check` 가 기관 쪽 문장에서 그 낱말을 센다.
 */
import { withJosa } from "@/lib/me-v3/result/josa";
import type { Company, FeaturedLink } from "./index";

export type Audience = "school" | "agency";

const and = (xs: string[]) => xs.join(" · ");
/** 끝의 괄호 풀이는 빼고 조사를 고른다(`장비 제어 소프트웨어(C# · C++)` → `…)가`) */
const jo = (word: string, pair: Parameters<typeof withJosa>[1]) => {
  const base = word.replace(/\s*\([^)]*\)$/, "");
  return word + withJosa(base, pair).slice(base.length);
};

export function featuredText(aud: Audience) {
  /** 전공을 부르는 말. 기관 참여자에게는 `분야` */
  const field = aud === "agency" ? "분야" : "전공";
  return {
    field,
    /** 카드 머리 위 작은 줄 */
    kicker: (title: string) => `${title}`,
    prepMine: (dom: string, pick: string | null) => pick
      ? `${dom}에서 직접 정한 것(‘${pick}’)을 1분 안에 말할 수 있게 정리해 가세요. 같은 판단을 이 회사에서는 어느 팀이 하는지 묻기 좋습니다.`
      : `${dom}에서 직접 정한 판단 하나를 1분 안에 말할 수 있게 정리해 가세요. 같은 판단을 이 회사에서는 어느 팀이 하는지 묻기 좋습니다.`,
    prepTried: (dom: string) =>
      `${dom}에서 해 본 일에 남긴 결과물이나 비교한 기록 하나를 챙겨 가세요. 장비 회사에서 같은 일을 할 때 무엇을 남기는지 견주어 볼 수 있습니다.`,
    prepStrong: (dom: string, pick: string | null) =>
      `${dom}에서 해 본 일${pick ? `(‘${pick}’)` : ""}을 장비 회사의 일과 이어 말할 수 있게 한 줄로 적어 가세요.`,
    prepUses: (dom: string) =>
      `${jo(dom, "이가")} 장비 회사에서 어떤 일로 나타나는지 채용 공고의 담당 업무에서 한 줄 찾아 가세요.`,
    prepJob: (job: string) =>
      `채용 공고의 ${job} 자격 요건을 읽고 내 경험과 겹치는 줄에 표시해 가세요.`,
    lead: (co: Company, l: FeaturedLink, major: string): string => {
      const head = l.pack
        ? `${withJosa(co.short, "은는")} ${aud === "agency" ? `${major} 분야의 산업` : `${major} 전공자가 일하는 산업`} 가운데 ‘${l.pack}’에 듭니다.`
        : `${co.short}의 업종은 ${co.sector}입니다.`;
      if (l.z1.length) return `${head} 이 결과에서 근거가 선 ${withJosa(and(l.z1.map((z) => z.name)), "이가")} 그 산업이 주로 쓰는 영역입니다.`;
      if (l.z2.length) return `${head} 이 결과에서 해 본 일이 확인된 ${withJosa(and(l.z2.map((z) => z.name)), "이가")} 그 산업이 쓰는 영역입니다.`;
      if (l.pack && l.uses.length) return `${head} 그 산업은 주로 ${and(l.uses.slice(0, 2))} 쪽 판단을 씁니다. 방문에서 그 일이 실제로 어떤 모습인지 보고 오세요.`;
      const jb = l.jobs.find((x) => !x.cores.includes("*"));
      if (jb) return `${head} 이 회사가 뽑는 일 가운데 ${jo(jb.name, "이가")} ${withJosa(`${major} ${field}`, "과와")} 가장 가깝습니다.`;
      return `${head} 채용 공고에서 확인한 직무는 ${and(co.jobs.map((x) => x.name))}입니다. 내 경험을 어느 직무와 이어 말할지 정해 가면 방문이 쓸모 있습니다.`;
    },
    /** 이어지는 영역 칸의 줄 */
    linkZ1: (name: string, picks: string[]) => `${name}: 근거가 선 영역${picks.length ? ` · 고른 항목 ${picks.map((p) => `‘${p}’`).join(", ")}` : ""}`,
    linkZ2: (name: string, picks: string[]) => `${name}: 해 본 일이 확인된 영역${picks.length ? ` · ${picks.map((p) => `‘${p}’`).join(", ")}` : ""}`,
    chosen: "검사에서 고르신 산업입니다.",
    law: "회사의 업종과 내 검사 결과를 나란히 놓은 직업 정보입니다. 채용 여부와 근무 조건은 확인하지 않았고, 지원은 회사의 공식 채용 경로로 직접 하시면 됩니다. CareerMatri는 직업소개나 알선을 하지 않습니다.",
  };
}

/** 기관 참여자 문장에 나오면 안 되는 학교 말 */
export const SCHOOL_WORDS = /학과|학번|수업|학기|학부생|교수|캡스톤|재학/;
