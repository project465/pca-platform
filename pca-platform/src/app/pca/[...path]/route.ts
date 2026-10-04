/**
 * 결과지 엔진을 플랫폼이 같은 주소에서 내준다.
 *
 * **채점과 결과지를 두 번 짜지 않는다.** ME_V2 의 점수·판정·문장은
 * `sites/pca-platform/assets/*.js` 한 벌에 있고, 그것이 정적 사이트와
 * 플랫폼의 공통 원본이다. 서버에서 TypeScript 로 한 벌 더 옮겨 적으면
 * 결정하는 자리가 둘이 되고, 둘 중 하나는 반드시 뒤처진다(설계 원칙 10 과
 * 같은 이유다).
 *
 * 그래서 플랫폼은 그 파일들을 **그대로 내주고**, 결과지와 PDF 를 만들 때
 * 같은 엔진을 불러 쓴다. 웹에서 본 결과와 PDF 가 다를 수 없는 구조다.
 *
 * **올려 둔 폴더 밖으로 나가지 못한다.** 주소에 `..` 가 들어오면 그 자리에서
 * 끊는다: 이 경로는 로그인 없이 열리므로, 한 줄만 새면 저장소 전체가 열린다.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "sites", "pca-platform");

/** 내주는 종류만 적어 둔다. 적히지 않은 확장자는 내주지 않는다 */
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params;
  const rel = (parts ?? []).join("/");

  /* `..` 와 절대 경로를 먼저 끊는다. 뒤에서 걸러도 되지만, 먼저 끊으면
     아래 줄들이 전부 '안쪽 경로' 라는 전제 위에 설 수 있다 */
  if (!rel || rel.includes("..") || rel.startsWith("/")) {
    return new Response("not found", { status: 404 });
  }

  const ext = path.extname(rel).toLowerCase();
  const type = MIME[ext];
  if (!type) return new Response("not found", { status: 404 });

  const file = path.join(ROOT, rel);
  /* 이어 붙인 뒤에 한 번 더 본다. 심볼릭 링크 같은 길로 밖에 나가는 것을
     막는 것은 이쪽 검사다 */
  if (!file.startsWith(ROOT + path.sep)) {
    return new Response("not found", { status: 404 });
  }

  try {
    const st = await stat(file);
    if (!st.isFile()) return new Response("not found", { status: 404 });
    const body = await readFile(file);
    return new Response(new Uint8Array(body), {
      headers: {
        "content-type": type,
        /* 엔진 판본이 결과 스냅샷에 적히므로 오래 캐시해도 된다.
           판본이 바뀌면 파일 이름이 아니라 배포가 바뀐다 */
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
