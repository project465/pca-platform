/**
 * 내보낸 `out/` 을 Firebase Hosting 처럼 띄운다.
 *
 * 정적으로 나가면 `next start` 가 없다. 그런데 미리보기를 뽑는 스크립트와
 * 링크 검사는 서버가 하나 떠 있어야 돈다. 그래서 같은 규칙으로 서빙하는
 * 작은 서버를 둔다 — **firebase.json 의 cleanUrls 와 같게** 라야 한다.
 * 여기서만 열리고 배포에서 404 가 나면 검사한 의미가 없다.
 *
 *   node scripts/serve-static.mjs out 3100
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "out");
const port = Number(process.argv[3] ?? 3100);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".ico": "image/x-icon",
};

const isFile = async (p) => {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
};

/** cleanUrls: /about → about.html, / → index.html */
async function resolvePath(pathname) {
  const clean = decodeURIComponent(pathname.split("?")[0]);
  if (clean.includes("..")) return null;
  const base = join(root, clean);
  for (const c of [base, `${base}.html`, join(base, "index.html")]) {
    if (await isFile(c)) return c;
  }
  return null;
}

createServer(async (req, res) => {
  const file = (await resolvePath(req.url ?? "/")) ?? join(root, "404.html");
  const found = await isFile(file);
  try {
    const body = await readFile(file);
    res.writeHead(found && !file.endsWith("404.html") ? 200 : found ? 404 : 404, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
