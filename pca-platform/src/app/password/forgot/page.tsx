import Link from "next/link";
import ForgotForm from "./forgot-form";
import EntryFrame from "@/components/sf/entry-frame";
import { resolveLang } from "@/lib/locale-server";
import { entrySay } from "@/lib/entry-say";

export async function generateMetadata() {
  const say = entrySay(await resolveLang().catch(() => "ko"));
  return { title: say("비밀번호 재설정 · CareerMatri") };
}

export default async function ForgotPage() {
  const lang = (await resolveLang().catch(() => "ko")) === "en" ? "en" : "ko";
  const say = entrySay(lang);
  return (
    <EntryFrame lang={lang}>
      <div className="panel narrow">
        <h1>{say("비밀번호 재설정")}</h1>
        <p className="sub">{say("등록된 학번이나 이메일을 입력하세요.")}</p>

        <ForgotForm lang={lang} />

        <div className="foot-links">
          <Link href="/login">{say("로그인")}</Link>
        </div>
      </div>
    </EntryFrame>
  );
}
