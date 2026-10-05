import Link from "next/link";

/**
 * 로그인 · 가입 · 비밀번호 쪽 머리의 상표.
 *
 * **처음 오는 사람이 보는 첫 화면이다.** 상자 하나만 떠 있으면 어느
 * 서비스에 들어왔는지가 입력칸 위의 제목 한 줄에만 걸리고, 그 제목이
 * '가입하고 시작하기' 처럼 할 일인 쪽에서는 상표가 아예 사라진다.
 */
export default function AuthBrand({ name }: { name: string }) {
  return (
    <Link href="/" className="authbrand">
      <span className="sf-brand-mark" aria-hidden="true">CM</span>
      <span>{name}</span>
    </Link>
  );
}
