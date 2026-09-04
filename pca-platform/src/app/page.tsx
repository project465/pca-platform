import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { homePathFor } from "@/lib/roles";

export default async function Root() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.mustResetPw) redirect("/password/change");
  redirect(homePathFor(user.role));
}
