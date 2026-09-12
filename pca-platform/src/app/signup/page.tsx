import SignupForm from "./signup-form";

export const metadata = { title: "회원가입 — 현멘" };

export default function SignupPage() {
  return (
    <div className="center-wrap">
      <div className="panel narrow">
        <SignupForm />
      </div>
    </div>
  );
}
