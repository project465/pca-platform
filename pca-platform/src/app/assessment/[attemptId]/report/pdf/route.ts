/**
 * 결과지 PDF 를 내려 준다.
 *
 * **파일을 웹에 그대로 올려 두지 않는다.** `var/reports/` 는 바깥에서 열리지
 * 않는 자리이고, 여기를 지나면서 로그인한 본인인지 다시 본다. 주소만 알면
 * 열리는 자리에 두면 번호를 하나씩 올려 남의 결과지를 받아 갈 수 있다.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/lib/session";
import { attemptOf } from "@/lib/me-v2/attempt";
import { latestSnapshot, PDF_DIR } from "@/lib/me-v2/render";
import { track } from "@/lib/funnel";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await ctx.params;
  const user = await requireUser();
  const a = await attemptOf(attemptId, user.id);
  if (!a) return new Response("not found", { status: 404 });

  const snap = await latestSnapshot(attemptId);
  if (!snap?.pdf_path) return new Response("not found", { status: 404 });

  /* DB 에 적힌 경로라도 두는 자리 밖이면 내주지 않는다. 적는 쪽이 한 군데라
     지금은 어긋날 일이 없지만, 어긋나는 날 새는 것이 남의 파일이다 */
  const file = path.resolve(snap.pdf_path);
  if (!file.startsWith(path.resolve(PDF_DIR) + path.sep)) {
    return new Response("not found", { status: 404 });
  }

  try {
    const buf = await readFile(file);
    await track("pdf_downloaded", { userId: user.id, props: { tier: a.tier } });
    return new Response(new Uint8Array(buf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition":
          `attachment; filename="careermatri-${a.tier}-${attemptId}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
