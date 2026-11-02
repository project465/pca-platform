"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { opFail } from "@/lib/oplog";
import { auth, inactiveReason, resolveLoginId, signIn, signOut, staffRoleOf, staffSignIn } from "@/lib/auth";
import { homePathFor } from "@/lib/roles";
import { clientIpFrom, loginGate } from "@/lib/login-throttle";
import { entrySay } from "@/lib/entry-say";
import { university, universities } from "@/lib/campus/registry";
import { campusLoginId } from "@/lib/campus/students";

/** `schools` = 학교 로그인 화면으로 가는 길(학교 코드 · 이름). 학교 계정 안내에 붙는다 */
export type LoginState = { error?: string; schools?: { code: string; name: string }[] };

/** 학번 · 휴대전화 번호 꼴인가(숫자와 붙임표만, 4~13자) */
const NUMERIC_ID = /^[0-9-]{4,13}$/;

function schoolLinks(codes?: string[]): { code: string; name: string }[] {
  return universities()
    .filter((u) => !codes || codes.includes(u.university_code))
    .map((u) => ({ code: u.university_code.toLowerCase(), name: u.university_name }));
}

/**
 * 기다리라는 말을 분으로 적는다.
 *
 * `잠시 뒤에` 로만 적으면 기다리는 사람이 30초인지 15분인지 몰라 새로
 * 고치기를 되풀이한다. 남은 시간은 **아이디가 있든 없든 같은 규칙으로**
 * 정해지므로 이 수가 계정의 존재를 알려 주지 않는다.
 */
function waitKo(sec: number, say = entrySay("ko")): string {
  if (sec <= 90) return say("약 1분");
  return say("약 {n}분", { n: Math.ceil(sec / 60) });
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  /* 학교 · 기관 로그인 화면은 학번 · 전화번호만 받는다. 그 학교의 아이디 꼴(머리 · 숫자만)로 바꿔 묻는다 */
  const org = university(String(formData.get("org") ?? ""));
  const raw = String(formData.get("identifier") ?? "").trim();
  let identifier = org && raw ? campusLoginId(org, raw) : raw;
  const password = String(formData.get("password") ?? "");
  /* 폼이 그 화면의 언어를 들고 온다. 화면 문구만 고르고 판단에는 쓰지 않는다 */
  const say = entrySay(formData.get("lang") === "en" ? "en" : "ko");

  if (!identifier || !password) {
    return { error: say("아이디와 비밀번호를 모두 입력하세요.") };
  }

  /**
   * **막는 자리는 `authorize()` 이고 여기는 말을 고르는 자리다**(설계
   * 원칙 10). 같은 모듈에 묻기 때문에 둘의 판단이 갈리지 않는다.
   *
   * 여기서 한 번 더 묻는 까닭은, 막힌 사람에게 `아이디 또는 비밀번호가
   * 올바르지 않습니다` 를 내주면 **제 비밀번호를 의심해 더 찍게** 되기
   * 때문이다. 이 줄이 없어도 막히는 것은 그대로다.
   */
  const gate = loginGate(clientIpFrom(await headers()), identifier);
  if (!gate.ok) {
    return {
      error: say("로그인 시도가 너무 많습니다. {wait} 뒤에 다시 시도해주세요.",
        { wait: waitKo(gate.retryAfterSec, say) }),
    };
  }

  /* **공통 화면에 학번 · 휴대전화 번호만 넣었으면** 학교 머리를 붙인 아이디까지 대어 본다(`resolveLoginId`).
     막힌 시도 셈(`loginGate`)은 위에서 넣은 값으로 이미 했다 */
  const numeric = !org && NUMERIC_ID.test(raw);
  if (numeric && password) {
    const unis = universities();
    const r = await resolveLoginId(raw, password, unis.map((u) => campusLoginId(u, raw)))
      .catch((e) => { opFail({ operation: "login.resolve", step: "lookup", category: "db" }, e); return { id: raw }; });
    if ("many" in r) {
      const codes = unis.filter((u) => r.many.includes(campusLoginId(u, raw))).map((u) => u.university_code);
      return { error: say("같은 번호로 된 계정이 여러 학교에 있습니다. 다니는 학교를 골라 그 학교 화면에서 들어와 주세요."), schools: schoolLinks(codes) };
    }
    identifier = r.id;
  }

  /* **담당자와 학생은 로그인 쿠키를 따로 쓴다**(`auth.ts`). 그래서 같은
     브라우저에서 학생으로 들어가 봐도 담당자 로그인이 덮이지 않는다 */
  let staff: Awaited<ReturnType<typeof staffRoleOf>>;
  try {
    staff = await staffRoleOf(identifier);
  } catch (e) {
    /* 담당자인지 모르는 채로 학생 쿠키에 담지 않는다. 까닭은 고치는 사람이 읽는 자리에 남긴다 */
    opFail({ operation: "login.staff-role", step: "lookup", category: "db" }, e);
    return { error: say("지금 로그인을 처리하지 못했습니다. 잠시 뒤에 다시 시도해주세요.") };
  }
  try {
    await (staff ? staffSignIn : signIn)("credentials", { identifier, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      /**
       * **까닭이 넷이고 할 일이 다르다**(규격 §4·§21).
       *
       * 아이디가 없는 것과 비밀번호가 틀린 것은 **구분해 알려주지
       * 않는다**: 그 응답 자체가 계정이 있다는 답이 된다. 반대로 담당자가
       * 꺼 둔 계정은 적어 준다 — 그 사람은 비밀번호를 맞게 넣었고, 그
       * 사실을 모르면 제 비밀번호를 의심해 몇 번 더 찍다가 잠긴다.
       */
      const why = await inactiveReason(identifier, password);
      if (why === "disabled") {
        return {
          error: say("이 계정은 지금 이용이 멈춰 있습니다."
            + " 학과 담당자에게 계정을 다시 열어 달라고 말씀해 주세요."),
        };
      }
      if (why === "erased") {
        return {
          error: say("이 계정은 파기 처리되어 더 쓰실 수 없습니다."
            + " 다시 쓰시려면 학과 담당자에게 말씀해 주세요."),
        };
      }
      return {
        error: say("아이디 또는 비밀번호가 올바르지 않습니다."
          + " 학교에서 받은 비밀번호가 기억나지 않으면 학과 담당자가"
          + " 다시 발급해 드립니다."),
        /* 학번 · 전화번호로 넣었으면 학교 화면으로 가는 길을 함께 준다 */
        ...(numeric ? { schools: schoolLinks() } : {}),
      };
    }
    throw e;
  }

  /* **분리 전의 담당자 로그인을 치운다.** 10-27 전에 들어온 담당자는 학생 쿠키에
     남아 있고, 이제 어디서도 받지 않는 쿠키다(`session.ts`). 그대로 두면 다음에
     학생 계정으로 들어가기 전까지 쓸모없이 남는다. 학생이 든 쿠키는 건드리지 않는다 */
  if (staff) {
    const old = await auth().catch(() => null);
    const role = (old?.user as { role?: string } | undefined)?.role;
    if (role && role !== "student") await signOut({ redirect: false }).catch(() => undefined);
  }

  // 원래 가려던 곳이 있으면 그리로. 없으면 "/" 가 역할을 보고 정한다.
  const next = String(formData.get("next") ?? "");
  /* 담당자는 `/` 를 거치지 않는다. `/` 는 학생 쿠키를 먼저 보므로 같은
     브라우저에 학생이 들어가 있으면 학생 화면으로 떨어진다 */
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : staff ? homePathFor(staff) : "/");
}

