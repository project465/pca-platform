import { signIn } from "@/lib/auth";
import { socialProviders } from "@/lib/social";

/** 키가 들어와 있는 제공자만 뜬다. 하나도 없으면 아무것도 그리지 않는다. */
export default function SocialButtons({ next = "/" }: { next?: string }) {
  const providers = socialProviders();
  if (providers.length === 0) return null;

  return (
    <div className="social">
      <div className="social-or">
        <span>또는</span>
      </div>
      {providers.map((p) => (
        <form
          key={p.id}
          action={async () => {
            "use server";
            await signIn(p.id, { redirectTo: next });
          }}
        >
          <button className={`act full social-${p.id}`} type="submit">
            {p.label}
          </button>
        </form>
      ))}
    </div>
  );
}
