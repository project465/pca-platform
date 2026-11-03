import Link from "next/link";
import { resolveLang } from "@/lib/locale-server";
import { entrySay } from "@/lib/entry-say";

/**
 * 없는 주소.
 *
 * **빈 화면으로 두지 않는다**(규격 §39). 명함과 메일에 적혀 나간 옛 주소가
 * 있어서, 여기 닿는 사람은 길을 잃은 것이지 잘못한 것이 아니다.
 */
export async function generateMetadata() {
  const say = entrySay(await resolveLang().catch(() => "ko"));
  return { title: say("없는 쪽입니다 · CareerMatri") };
}

export default async function NotFound() {
  const say = entrySay(await resolveLang().catch(() => "ko"));
  return (
    <main className="sf-fail">
      <h1>{say("없는 쪽입니다")}</h1>
      <p>
        {say("주소가 바뀌었거나 지워진 쪽입니다. 아래에서 가시려던 곳을 찾으실 수 있습니다.")}
      </p>
      <div className="sf-fail-acts">
        <Link href="/me">{say("내 CareerMatri")}</Link>
        <Link href="/cores">{say("검사")}</Link>
        <Link href="/support">{say("고객지원")}</Link>
      </div>
    </main>
  );
}
