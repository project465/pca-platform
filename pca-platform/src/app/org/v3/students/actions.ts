"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { orgsOf } from "@/lib/org";
import { university } from "@/lib/campus/registry";
import {
  addStudentAccount, allowRetake, applyImport, previewImport,
  rotateStudentPassword, setAccountStatus,
  type ImportRow, type ManageActor,
} from "@/lib/campus/manage";

/**
 * 담당자가 자기 학교에만 손댄다.
 *
 * **역할만 보지 않고 범위도 같이 본다**(`rbac.ts` 와 같은 규칙). 역할이
 * 맞아도 자기 기관이 학교 등록부의 학교가 아니면 아무것도 하지 않는다:
 * 그 문이 없으면 A 대학 담당자가 폼을 고쳐 B 대학 학생의 열쇠를 바꾼다.
 */
async function scope(): Promise<{
  uni: string; orgId: string; actor: ManageActor;
} | null> {
  const user = await requireRole(["org_admin"]);
  const orgs = await orgsOf(user.id);
  const hit = orgs.find((o) => Boolean(university(o.code)));
  if (!hit) return null;
  return {
    uni: hit.code, orgId: hit.id,
    actor: { userId: user.id, role: user.role, orgId: Number(hit.id) },
  };
}

export type ManageState = {
  ok?: string;
  err?: string;
  /** 한 번만 보여 주는 새 비밀번호. **DB 에도 로그에도 남지 않는다** */
  issued?: { login_id: string; password: string }[];
};

/** 계정을 끄고 켠다 */
export async function setStatusAction(
  _prev: ManageState, form: FormData,
): Promise<ManageState> {
  const sc = await scope();
  if (!sc) return { err: "학교 등록부에 연결된 기관이 아닙니다." };
  const id = String(form.get("user_id") ?? "");
  const on = String(form.get("on") ?? "") === "1";
  const r = await setAccountStatus(sc.uni, id, on, sc.actor);
  revalidatePath("/org/v3/students");
  return r.ok
    ? { ok: on ? "계정을 다시 열었습니다." : "계정을 멈췄습니다." }
    : { err: r.why };
}

/** 비밀번호를 다시 낸다. **한 번만 보여 준다** */
export async function rotateAction(
  _prev: ManageState, form: FormData,
): Promise<ManageState> {
  const sc = await scope();
  if (!sc) return { err: "학교 등록부에 연결된 기관이 아닙니다." };
  const id = String(form.get("user_id") ?? "");
  const r = await rotateStudentPassword(sc.uni, id, sc.actor);
  revalidatePath("/org/v3/students");
  if (!r.ok) return { err: r.why };
  return {
    ok: "새 비밀번호를 냈습니다. 이 화면을 벗어나면 다시 볼 수 없습니다.",
    issued: [{ login_id: r.login_id ?? "", password: r.password ?? "" }],
  };
}

/** 재응시를 한 번 연다(규격 §7) */
export async function retakeAction(
  _prev: ManageState, form: FormData,
): Promise<ManageState> {
  const sc = await scope();
  if (!sc) return { err: "학교 등록부에 연결된 기관이 아닙니다." };
  const r = await allowRetake(sc.uni, String(form.get("user_id") ?? ""), sc.actor);
  revalidatePath("/org/v3/students");
  return r.ok ? { ok: "이 학생이 한 번 더 응시할 수 있습니다." } : { err: r.why };
}

/** 한 명 추가 */
export async function addAction(
  _prev: ManageState, form: FormData,
): Promise<ManageState> {
  const sc = await scope();
  if (!sc) return { err: "학교 등록부에 연결된 기관이 아닙니다." };
  const r = await addStudentAccount(sc.uni, sc.orgId, {
    student_id: String(form.get("student_id") ?? ""),
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? "") || null,
    login_id: String(form.get("login_id") ?? "") || null,
    college_code: null,
    department_code: String(form.get("department_code") ?? ""),
  }, sc.actor);
  revalidatePath("/org/v3/students");
  if (!r.ok) return { err: r.why };
  return r.password
    ? {
      ok: "계정을 만들었습니다. 비밀번호는 이 화면에서만 보입니다.",
      issued: [{ login_id: r.login_id ?? "", password: r.password }],
    }
    : { ok: "이미 있는 학생이라 학과만 맞췄습니다. 비밀번호는 그대로입니다." };
}

/* ── CSV ───────────────────────────────────────────────────────────── */

export type ImportState = {
  err?: string;
  /** 미리 보기. **아직 아무것도 쓰지 않았다** */
  preview?: { rows: ImportRow[]; text: string };
  /** 적용 결과 */
  done?: { created: number; updated: number; rejected: ImportRow[] };
  issued?: { login_id: string; password: string }[];
};

async function textOf(form: FormData): Promise<string> {
  const pasted = String(form.get("csv") ?? "").trim();
  if (pasted) return pasted;
  const f = form.get("file");
  if (f && typeof f === "object" && "text" in f) {
    return (await (f as File).text()).trim();
  }
  return "";
}

/** 올린 파일을 **읽기만 한다**(규격 §14) */
export async function previewAction(
  _prev: ImportState, form: FormData,
): Promise<ImportState> {
  const sc = await scope();
  if (!sc) return { err: "학교 등록부에 연결된 기관이 아닙니다." };
  const text = await textOf(form);
  if (!text) return { err: "CSV 파일을 고르거나 내용을 붙여 넣어 주세요." };
  const r = await previewImport(sc.uni, text);
  if (!r.ok) return { err: r.why };
  return { preview: { rows: r.rows, text } };
}

/** 정상 줄만 적용한다. **오류 줄에서 멈추지 않는다** */
export async function applyAction(
  _prev: ImportState, form: FormData,
): Promise<ImportState> {
  const sc = await scope();
  if (!sc) return { err: "학교 등록부에 연결된 기관이 아닙니다." };
  const text = String(form.get("text") ?? "");
  if (!text) return { err: "적용할 내용이 없습니다. 다시 올려 주세요." };
  const r = await applyImport(sc.uni, sc.orgId, text, sc.actor);
  if (!r.ok) return { err: r.why };
  revalidatePath("/org/v3/students");
  return {
    done: { created: r.created.length, updated: r.updated, rejected: r.rejected },
    issued: r.created,
  };
}
