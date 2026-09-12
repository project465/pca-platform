"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { saveWeights, ScoringError, type WeightCell } from "@/lib/scoring";

export type WeightState = { message?: string; ok?: string };

export async function saveWeightsAction(
  _prev: WeightState,
  formData: FormData,
): Promise<WeightState> {
  await requireRole(["superadmin"]);

  const instrumentId = String(formData.get("instrumentId") ?? "");
  if (!/^\d+$/.test(instrumentId)) return { message: "검사 도구를 찾을 수 없습니다." };

  const cells: WeightCell[] = [];
  for (const [key, value] of formData.entries()) {
    const m = /^w:(\d+):(\d+)$/.exec(key);
    if (!m) continue;
    const weight = Number(String(value).trim() || "0");
    if (!Number.isFinite(weight) || weight < 0 || weight > 99) {
      return { message: "가중치는 0 이상 99 이하의 숫자여야 합니다." };
    }
    cells.push({ indicatorId: m[1], jobId: m[2], weight });
  }
  if (cells.length === 0) return { message: "저장할 값이 없습니다." };

  try {
    await saveWeights(instrumentId, cells);
  } catch (e) {
    if (e instanceof ScoringError) return { message: e.message };
    throw e;
  }

  revalidatePath(`/admin/instruments/${instrumentId}`);
  revalidatePath("/admin/instruments");
  return { ok: `가중치 ${cells.filter((c) => c.weight > 0).length}개를 저장했습니다.` };
}
