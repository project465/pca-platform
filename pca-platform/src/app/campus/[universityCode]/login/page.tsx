import { notFound, redirect } from "next/navigation";
import "../../../surface.css";
import "../../campus.css";
import { university } from "@/lib/campus/registry";
import { currentUser } from "@/lib/session";
import { safeNext } from "@/lib/safe-next";
import { CmHead } from "../../../me/shell";
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
  const code = u.university_code.toLowerCase();
  /* 열린 리다이렉트를 막는 자리가 한 곳이다(`safe-next.ts`) */
  const nx = safeNext(next, `/campus/${code}/start`);
  if (await currentUser()) redirect(nx);

  return (
    <CampusShell u={u}>
      <CmHead
        kicker={`${u.university_name} · CareerMatri`}
        title="로그인"
        lead="학교에서 안내받은 계정으로 로그인해주세요."
      />
      <CampusLoginForm next={nx} />
      <p className="cm-note" style={{ marginTop: 18 }}>
        아이디는 학번입니다. 비밀번호를 잊으셨으면 학과 담당자에게 알려
        주십시오.
      </p>
    </CampusShell>
  );
}
