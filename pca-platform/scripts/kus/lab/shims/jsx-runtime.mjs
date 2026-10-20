// harness-only JSX runtime. **React 가 아니다.** 서버 컴포넌트를 HTML 글자로 그린다.
// 훅은 첫 값만 돌려주고 브라우저 쪽 상호작용은 없다. 폼의 서버 액션은 POST 로 잇는다.
export const Fragment = Symbol.for("kus.fragment");
export function jsx(type, props, key) { return { $$k: 1, type, props: props ?? {}, key }; }
export const jsxs = jsx;
export const jsxDEV = jsx;
const VOID = new Set(["input", "img", "br", "hr", "meta", "link", "source", "area", "col", "wbr"]);
const SVG_KEEP = new Set(["viewBox", "gradientUnits", "preserveAspectRatio"]);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escA = (s) => esc(s).replace(/"/g, "&quot;");
const kebab = (s) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
function styleStr(o) {
  return Object.entries(o).filter(([, v]) => v != null && v !== false)
    .map(([k, v]) => `${k.startsWith("--") ? k : kebab(k)}:${typeof v === "number" && !/^(flex|opacity|zIndex|fontWeight|lineHeight)/.test(k) ? v + "px" : v}`).join(";");
}
export async function renderToString(node, ctx = {}) {
  if (node == null || node === false || node === true) return "";
  if (typeof node === "string" || typeof node === "number") return esc(node);
  if (Array.isArray(node)) { let s = ""; for (const n of node) s += await renderToString(n, ctx); return s; }
  if (node instanceof Promise) return renderToString(await node, ctx);
  if (!node.$$k) return "";
  const { type, props } = node;
  if (type === Fragment) return renderToString(props.children, ctx);
  if (typeof type === "function") return renderToString(await type(props), ctx);
  const tag = String(type);
  const svg = ctx.svg || tag === "svg";
  let attrs = "";
  let inner = null;
  let value = props.value ?? props.defaultValue;
  for (const [k, v] of Object.entries(props)) {
    if (k === "children" || k === "key" || k === "ref" || v == null || v === false) continue;
    if (k === "dangerouslySetInnerHTML") { inner = v.__html; continue; }
    if (k === "defaultValue" || k === "value") { if (tag !== "textarea" && tag !== "select") attrs += ` value="${escA(v)}"`; continue; }
    if (k === "defaultChecked") { if (v) attrs += " checked"; continue; }
    if (typeof v === "function") {
      if ((k === "action" && tag === "form") || k === "formAction") {
        const id = globalThis.__kusRegisterAction?.(v);
        if (id) attrs += ` ${k === "action" ? "action" : "formaction"}="/__action/${id}" method="post"`;
      }
      continue;
    }
    let name = k === "className" ? "class" : k === "htmlFor" ? "for" : k;
    if (svg && !SVG_KEEP.has(k) && /[A-Z]/.test(k) && k !== "className") name = kebab(k);
    if (k === "style" && typeof v === "object") { attrs += ` style="${escA(styleStr(v))}"`; continue; }
    attrs += v === true ? ` ${name}` : ` ${name}="${escA(v)}"`;
  }
  if (VOID.has(tag)) return `<${tag}${attrs}>`;
  let kids;
  if (inner != null) kids = inner;
  else if (tag === "textarea") kids = esc(value ?? "");
  else if (tag === "select") kids = await renderToString(props.children, { ...ctx, select: value == null ? undefined : String(value) });
  else if (tag === "option" && ctx.select !== undefined && String(props.value) === ctx.select) { attrs += " selected"; kids = await renderToString(props.children, ctx); }
  else kids = await renderToString(props.children, { ...ctx, svg });
  return `<${tag}${attrs}>${kids}</${tag}>`;
}
