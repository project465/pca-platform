import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/components/icons";
import { BRAND, BRAND_SUB } from "@/lib/brand";
import { currentUser } from "@/lib/session";
import LoginForm from "./login-form";

export const metadata = { title: "로그인" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/");

  return (
    <main className="center-wrap">
      <div className="auth">
        <section className="auth-intro">
          <div className="logo">
            <span className="mark">
              <Icon name="mark" size={17} />
            </span>
            {BRAND}
          </div>
          <h2>
            내 전공으로 갈 수 있는 직무,
            <br />
            검사 한 번으로 확인하세요
          </h2>
          <ul>
            <li>
              <span className="num">1</span>
              <div>
                <b>학과에서 받은 계정으로 로그인</b>
                <span>학번이나 이메일, 임시 비밀번호를 넣으면 됩니다.</span>
              </div>
            </li>
            <li>
              <span className="num">2</span>
              <div>
                <b>답할 때마다 바로 저장</b>
                <span>창을 닫아도 다음에 이어서 풀 수 있어요.</span>
              </div>
            </li>
            <li>
              <span className="num">3</span>
              <div>
                <b>결과지는 학과 확인 후 공개</b>
                <span>공개되면 이 화면에서 바로 볼 수 있어요.</span>
              </div>
            </li>
          </ul>
        </section>

        <section className="auth-form">
          <h1>로그인</h1>
          <p className="sub">
            {BRAND_SUB} · 계정은 소속 학과에서 발급합니다.
          </p>

          <LoginForm />

          <div className="foot-links">
            <Link href="/password/forgot">비밀번호 찾기</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
