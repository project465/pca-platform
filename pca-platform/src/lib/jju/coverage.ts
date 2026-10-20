/**
 * 그 Major Core 가 AI 역량 하나하나를 **문항 번호 단위로** 재는가.
 *
 * 네 상태를 섞지 않는다.
 *
 * `MEASURED`      판정 문항(`axis_level`)이 그 역량을 직접 묻는다. 문항 번호를 든다
 * `SELF_REPORT`   격자·체크리스트 문구에만 나온다. 판정 근거가 아니다
 * `CURRICULUM`    공식 교육과정이 다루지만 어느 문항도 묻지 않는다
 * `NOT_MEASURED`  어디에도 없다
 *
 * **점수를 만들지 않는다.** 여기서 하는 일은 문항이 있는가를 세는 것뿐이고,
 * 리포트와 화면은 이 상태로 `이 검사가 재지 않는 영역` 을 적는다. 묶는 규칙
 * (`CAPS`)을 드러내 두는 까닭은 사람이 고칠 자리이기 때문이다. 리포트와 감사
 * 스크립트가 같은 함수를 읽는다(설계 원칙 10).
 */
import { coreFile } from "@/lib/me-v3/core-registry";

export type CapStatus = "MEASURED" | "SELF_REPORT" | "CURRICULUM" | "NOT_MEASURED";
export type Cap = { id: string; name: string; course?: string; domains: Record<string, string[]>; keys: RegExp };

export const CAPS: Cap[] = [
  { id: "PY", name: "파이썬 프로그래밍", course: "파이썬", domains: {}, keys: /파이썬|Python/ },
  { id: "DATA", name: "데이터 처리", course: "데이터 처리", domains: {}, keys: /결측|이상값|자료 준비|전처리|자료 품질|데이터 정리|잡음을 걸러/ },
  { id: "VIS", name: "시각화", course: "시각화", domains: {}, keys: /시각화|그래프로|도표/ },
  { id: "STAT", name: "통계(측정 분포 수준 포함)", course: "통계", domains: {}, keys: /통계|분포|유의|회귀|표본/ },
  { id: "ML", name: "기계학습 모형 평가·개선", domains: { CS_CORE_V1: ["TD09"] }, keys: /학습에 쓰지 않은|따로 둔 자료로 성능|기계학습/ },
  { id: "DL", name: "딥러닝·신경망", course: "딥러닝 기초", domains: {}, keys: /딥러닝|신경망|합성곱|역전파/ },
  { id: "LLM", name: "LLM·생성형 AI 응용", domains: {}, keys: /LLM|언어 모델|생성형|프롬프트|임베딩|검색 증강/ },
  { id: "CV", name: "컴퓨터 비전", domains: {}, keys: /컴퓨터 비전|영상 인식|객체 검출|이미지 분류|카메라 영상/ },
  { id: "MLOPS", name: "모델 배포·운영(MLOps)", domains: {}, keys: /모델 배포|모형 배포|모델 서빙|추론 서버|모델 버전|드리프트/ },
  { id: "EDGE", name: "엣지·온디바이스 AI", domains: {}, keys: /온디바이스|엣지|추론 가속|양자화/ },
  { id: "ROBOT", name: "로봇 인지·자율 동작", domains: {}, keys: /자율 주행|자율 비행|경로 계획|SLAM|강화학습/ },
  { id: "SENSOR", name: "센서 신호 수집·처리", domains: { EE_CORE_V1: ["TD04"] }, keys: /센서/ },
];

export const CAP_STATUS_KO: Record<CapStatus, string> = {
  MEASURED: "측정", SELF_REPORT: "자기보고만", CURRICULUM: "교육과정만", NOT_MEASURED: "미측정",
};

type Item = { item_id: string; technical_domain: string | null; measurement_axis: string; wording: string };
export type CapCell = { cap: Cap; status: CapStatus; core: string[]; pack: string[]; self: string[] };

const isPack = (id: string) => /^(INDUSTRY|ROLE)_/.test(id);

export function coverageOf(core: string, courseTopics: Iterable<string> = []): CapCell[] {
  const items = coreFile<{ items: Item[] }>(core, "items").items;
  const ck = JSON.stringify(coreFile<unknown>(core, "checklists"));
  const topics = new Set(courseTopics);
  return CAPS.map((cap) => {
    const judge = items.filter((i) => i.measurement_axis === "axis_level"
      && ((cap.domains[core] ?? []).includes(i.technical_domain ?? "") || cap.keys.test(i.wording)))
      .map((i) => i.item_id);
    const self = items.filter((i) => i.measurement_axis !== "axis_level" && cap.keys.test(i.wording))
      .map((i) => i.item_id);
    const inCk = cap.keys.test(ck);
    const status: CapStatus = judge.length ? "MEASURED"
      : (self.length || inCk) ? "SELF_REPORT"
      : cap.course && topics.has(cap.course) ? "CURRICULUM" : "NOT_MEASURED";
    return {
      cap, status,
      core: judge.filter((id) => !isPack(id)),
      pack: judge.filter(isPack),
      self: [...self, ...(inCk ? ["(체크리스트 문구)"] : [])],
    };
  });
}

/** 그 학생의 응시에서 판정 문항으로 실제로 답한 것만 센다(받은 문항 ∩ 그 역량의 문항) */
export function answeredIn(cell: CapCell, answered: Iterable<string>): string[] {
  const got = new Set(answered);
  return [...cell.core, ...cell.pack].filter((id) => got.has(id));
}
