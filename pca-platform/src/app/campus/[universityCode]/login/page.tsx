import { notFound, redirect } from "next/navigation";
import "../../../surface.css";
import "../../campus.css";
import { campusSay, university } from "@/lib/campus/registry";
import { currentUser } from "@/lib/session";
import { campusStudentOf, loginPrefixOf } from "@/lib/campus/students";
import { safeNext } from "@/lib/safe-next";
import { BrandMark } from "@/components/sf/brand-mark";
import { CampusShell } from "../../shell";
import CampusLoginForm from "./login-form";

type Params = {
  params: Promise<{ universityCode: string }>;
  searchParams: Promise<{ next?: string }>;
};

export async function generateMetadata({ params }: Params) {
  const { universityCode } = await params;
  const u = university(universityCode);
  return { title: u ? `로그인 · ${u.university_name} CareerMatri` : "CareerMatri" };
}

/**
 * 학교 전용 로그인.
 *
 * **개인 회원가입으로 보내지 않는다.** 전에는 학과를 고른 비로그인 학생이
 * `/login` 으로 갔고 그 쪽에는 소셜 단추와 `회원가입` 링크가 있었다. 학교
 * 계약 학생이 그 길로 들어가면 **계약과 무관한 개인 계정**이 하나 생기고,
 * 그 계정의 응시는 학교 집계에 잡히지 않는다. 받은 계정으로만 들어온다.
 *
 * **소셜 단추를 두지 않는다.** 학교가 발급한 계정에는 연결된 공급자가
 * 없어서, 그 단추는 누르면 다른 계정을 만드는 길이다.
 *
 * 인증 자체는 개인 로그인과 같은 자리를 쓴다(`loginAction`).
 */
export default async function CampusLogin({ params, searchParams }: Params) {
  const { universityCode } = await params;
  const { next } = await searchParams;
  const u = university(universityCode);
  if (!u) notFound();
  const t = campusSay(u);
  const prefix = loginPrefixOf(u);
  const code = u.university_code.toLowerCase();
  /* 열린 리다이렉트를 막는 자리가 한 곳이다(`safe-next.ts`) */
  const nx = safeNext(next, `/campus/${code}/start`);
  /**
   * **다른 계정이 열려 있어도 학교 로그인이 닫히지 않는다.**
   *
   * 전에는 세션이 있으면 그대로 돌려보냈다. 그래서 실습실 PC 처럼 앞사람의
   * 세션이 남아 있는 자리에서는 **학교 계정으로 바꿀 길이 아예 없었고**,
   * 학과 쪽에서 누른 `검사 시작` 이 그 앞사람의 응시를 열었다. 운영
   * Canary 에서 발급한 계정과 응시한 계정이 갈린 자리가 여기다.
   *
   * 그 학교의 학생으로 들어와 있을 때만 돌려보낸다.
   */
  const who = await currentUser();
  const mine = who ? await campusStudentOf(who.id, u.university_code) : null;
  if (mine) redirect(nx);

  return (
    <CampusShell u={u}>
      {/*
        * **학교 전용이라는 것을 폼 위에 적는다**(규격 §5).
        *
        * 일반 회원가입도 소셜 단추도 개인 B2C 진입도 두지 않는다. 학교가
        * 발급한 계정에는 연결된 공급자가 없어서, 그 단추는 누르면 다른
        * 계정을 만드는 길이다.
        */}
      <div className="cm-cmp-auth">
        <div className="cm-cmp-auth-id">
          <b>{u.university_name}</b>
          <span className="cm-cmp-sep" aria-hidden="true"
            style={{ background: "var(--pcu-line)" }} />
          <span><BrandMark size={18} /> CareerMatri</span>
        </div>
        <h1>{u.university_name} {t("학생")} 전용 검사</h1>
        <p className="cm-cmp-auth-lead">
          {t("학교") === "학교" ? "학교에서" : "기관에서"} 발급받은 계정으로 로그인하세요.
        </p>

        {who ? (
          /* **앞사람의 세션이 남아 있다는 것을 적는다.** 적지 않으면
             로그인 화면이 왜 또 떴는지 알 수 없고, 그대로 누른
             `검사 시작` 이 남의 응시를 연다. 누구인지는 적지 않는다 */
          <p className="cm-cmp-warn" role="status">
            지금 다른 계정으로 로그인되어 있습니다. {u.org_kind === "agency" ? "기관" : "학교"}에서
            받은 계정으로 다시 로그인해주세요.
          </p>
        ) : null}

        <CampusLoginForm next={nx} />
      </div>

      <p className="cm-cmp-note" style={{ textAlign: "center" }}>
        {u.org_kind === "agency"
          ? "아이디는 기관에서 받은 아이디입니다."
          : prefix
            ? `아이디는 ${prefix} 뒤에 학번을 붙인 것입니다(예: ${prefix}20260001).`
            : "아이디는 학번입니다."}{" "}
        비밀번호를 잊으셨으면 {t("학과 담당자")}에게 알려 주십시오.
      </p>
    </CampusShell>
  );
}
