import { jsx } from "./jsx-runtime.mjs";
export default function Link({ href, children, prefetch, replace, scroll, ...rest }) {
  return jsx("a", { href: typeof href === "string" ? href : String(href?.pathname ?? "#"), ...rest, children });
}
