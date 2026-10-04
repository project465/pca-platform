"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { openGrants, openV2Attempt, isStage } from "@/lib/me-v2/attempt";
import { siteForMarket, productByCode, isMarket } from "@/lib/catalog";

/**
 * 응시를 연다.
 *
 * **등급을 받지 않는다.** 폼이 보낼 수 있는 것은 학위 단계와 목표 국가뿐이고,
 * 등급은 이용권이 정한다. 폼이 등급을 보낼 수 있으면 언젠가 그 값을 고치는
 * 사람이 생긴다(규격 §11).
 *
 * **목표 국가를 접속 위치로 짐작하지 않는다**(규격 §28). 고르지 않으면
 * 비워 두고, 비어 있으면 결과지가 기준 자료로 나간다.
 */
export async function startAttemptAction(form: FormData) {
  const user = await requireUser();
  const stage = String(form.get("stage") ?? "");
  const target = String(form.get("target") ?? "").trim().toUpperCase();
  const entitlementId = String(form.get("entitlement") ?? "");
  if (!isStage(stage)) return;

  const grants = await openGrants(user.id);
  const g = grants.find((x) => x.entitlement_id === entitlementId) ?? grants[0];
  if (!g) return;

  const p = await productByCode(g.product_code);
  const market = isMarket(p?.market ?? null) ? p!.market : "KR";
  const site = await siteForMarket(market);

  const a = await openV2Attempt({
    userId: user.id,
    entitlementId: g.entitlement_id,
    stage,
    siteId: site,
    lang: market === "GLOBAL" ? "en" : "ko",
    targetCountry: target && target !== "NONE" ? target.slice(0, 2) : null,
  });
  if (a) redirect(`/assessment/${a.id}`);
}
