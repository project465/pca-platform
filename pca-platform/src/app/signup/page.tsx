import SignupForm from "./signup-form";
import SocialButtons from "@/components/social-buttons";

export const metadata = { title: "회원가입 — 현멘" };
// 소셜 버튼이 환경변수를 보고 갈리므로 빌드 시점에 굳으면 안 된다
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <div className="center-wrap">
      <div className="panel narrow">
        <SignupForm />
        <SocialButtons />
      </div>
    </div>
  );
}
