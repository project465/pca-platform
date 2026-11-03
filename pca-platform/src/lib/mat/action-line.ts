import { textFor } from "@/lib/me-v3/result/text";
import { coreOf, type ResultModel } from "@/lib/me-v3/result/model";
import { areaName } from "@/lib/assistant/catalog";
import type { MatUiLang } from "./copy";

/**
 * MAT 화면의 할 일 한 줄을 **그 화면 언어로**(2026-11-03 영어 화면). 굳은 결과에서 온 줄은 저장된 문장
 * (`body`, 담을 때의 한국어)을 쓰지 않고 같은 할 일을 결과 모델에서 찾아 그 언어의 결과지 문장으로 적는다
 * (`/me/next` 와 같은 방식). 못 찾거나 학생이 담은 줄이면 담아 둔 문장 그대로다. 지어내지 않는다
 */
export function actionLine(
  r: { source?: string | null; td_code: string | null; axis_code: string | null; body: string },
  model: ResultModel | null | undefined, lang: MatUiLang,
): string {
  if (lang !== "en" || !model || (r.source && r.source !== "result")) return r.body;
  const x = (model.actions ?? []).find((a) => (a.domain ?? "") === (r.td_code ?? "") && (a.axis ?? "") === (r.axis_code ?? ""));
  if (!x) return r.body;
  try {
    const core = coreOf(model);
    return textFor("en").actionKo(x, x.domain ? areaName(core, x.domain, "en") : "", model.stage).do;
  } catch {
    return r.body;
  }
}
