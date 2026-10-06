/**
 * 한국어 조사가 앞말에 맞는가.
 *
 * **눈으로는 안 잡힌다.** `민간기업 를 기준으로` 와 `기술기획·PM 가` 가
 * 실제 결과지에 그대로 나갔다. 이름은 응시자마다 달라서 한 번 고쳐 봐야
 * 다른 이름에서 또 난다. 그래서 **그리고 나서 센다**: 등급 셋을 실제
 * 엔진으로 그린 뒤 글자 사이에서 틀린 조사를 찾는다.
 *
 *   npm run josa:check
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const ROOT = "sites/pca-platform";
const PORT = 8247;
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8" };

function serve() {
  const s = createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    let f = join(ROOT, normalize(decodeURIComponent(u.pathname)).replace(/^(\.\.[/\\])+/, ""));
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
    if (!existsSync(f)) { res.writeHead(404); res.end("no"); return; }
    res.writeHead(200, { "content-type": MIME[extname(f)] ?? "application/octet-stream" });
    res.end(readFileSync(f));
  });
  return new Promise((ok) => s.listen(PORT, () => ok(s)));
}

/* 받침이 있는가. 한글·숫자·라틴을 본다 */
const TAIL_A = { l: 1, m: 1, n: 1, r: 1, f: 1 };
const TAIL_D = { 0: 1, 1: 1, 3: 1, 6: 1, 7: 1, 8: 1 };
function hasTail(w) {
  const t = String(w).replace(/[\s)\]}”'"·.,]+$/, "");
  if (!t) return null;
  const ch = t[t.length - 1], c = t.charCodeAt(t.length - 1);
  if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 !== 0;
  if (/[0-9]/.test(ch)) return !!TAIL_D[ch];
  if (/[A-Za-z]/.test(ch)) return !!TAIL_A[ch.toLowerCase()];
  return null;          // 모르는 글자는 세지 않는다
}

/* 조사 짝. 앞엣것이 받침 있는 쪽이다 */
const PAIRS = { "을": "를", "과": "와", "이": "가", "은": "는" };

/**
 * 글에서 틀린 조사를 찾는다.
 *
 * **붙어 있는 것은 세지 않는다.** 한국어에서 `가까이` 의 `이` 와 조사 `이`
 * 는 글자만으로 갈리지 않아서, 붙은 것까지 세면 멀쩡한 낱말이 전부 걸린다.
 * 세는 것은 **앞말과 조사 사이가 벌어진 것**뿐이다: `민간기업 를` ·
 * `기술기획·PM 가`. 이것은 사람이 쓰지 않는 모양이고, 이름 뒤에 조사를
 * 박아 둔 코드가 내는 모양이다. 실제로 난 탈이 전부 이 모양이었다.
 */
export function wrongJosa(text) {
  const bad = [];
  /* 앞말을 통째로 잡는다. 고칠 때 보여 줄 글자가 한 자뿐이면 어디를
     고쳐야 하는지 안 보인다 */
  const re = /([가-힣A-Za-z0-9][가-힣A-Za-z0-9·\-_.]*) (을|를|과|와|이|가|은|는)(?=[\s,.)\]]|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const tail = hasTail(m[1]);
    const want = tail === null ? m[2]
      : (tail ? (PAIRS[m[2]] ? m[2] : Object.keys(PAIRS).find((k) => PAIRS[k] === m[2]) ?? m[2])
              : (PAIRS[m[2]] ?? m[2]));
    bad.push({
      at: m.index, got: `${m[1]} ${m[2]}`, want: `${m[1]}${want}`,
      around: text.slice(Math.max(0, m.index - 20), m.index + 20).replace(/\s+/g, " "),
    });
  }
  return bad;
}

const CASES = [["BASIC", "bachelor"], ["STANDARD", "master"], ["PRO", "phd"]];

async function main() {
  const srv = await serve();
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const bad = [];
  for (const [tier, stage] of CASES) {
    const p = await b.newPage();
    await p.goto(`http://127.0.0.1:${PORT}/me-v2/report-host.html?sample=ko&lang=ko`,
      { waitUntil: "networkidle" });
    const text = await p.evaluate(() => document.body.innerText);
    const hits = wrongJosa(text);
    console.log(`  ${hits.length ? "실패" : "OK  "} ${tier} · ${stage}  (${hits.length}군데)`);
    hits.slice(0, 8).forEach((h) => console.log(`        …${h.around}…  → ${h.want}`));
    if (hits.length) bad.push(`${tier}_${stage} ${hits.length}`);
    await p.close();
    break;   /* 견본은 한 벌이라 한 번만 그린다 */
  }
  await b.close(); srv.close();
  console.log(`\n조사 ${bad.length ? bad.join(" · ") + " 가 걸렸다." : "OK."}`);
  process.exit(bad.length ? 1 : 0);
}
/* **불러다 쓸 때는 돌지 않는다.** 검사기 자신을 시험하는 쪽이
   `wrongJosa` 만 가져다 쓴다 */
if (process.argv[1] && process.argv[1].endsWith("josa-check.mjs")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
