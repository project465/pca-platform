import { Children, cloneElement, isValidElement, type ReactNode } from "react";

/**
 * 화면 한 덩이의 글자를 기관 낱말로 바꾼다(`campusSay`).
 *
 * 담당자 화면은 `학생 · 학과 · 단과대학` 을 백 군데 가까이 적는다. 그것을
 * 한 줄씩 감싸면 다음에 문장을 더하는 사람이 감싸기를 잊고, 기관 화면에
 * 학교 낱말이 다시 선다. 그래서 **쪽이 돌려주는 덩이를 통째로 지나가며**
 * 글자 자식만 바꾼다. 학교면(`t` 가 그대로 돌려주는 함수면) 건드리지 않는다.
 *
 * 닿는 것은 그 덩이에 직접 적힌 글자와 글자 속성(`PROPS`)이다. 다른
 * 컴포넌트가 제 안에서 만드는 글자는 닿지 않으므로, 그런 컴포넌트는
 * `campusSay` 를 직접 받는다(담당자의 학생 추가 · 명단 · CSV).
 */
const PROPS = ["title", "eyebrow", "lead", "body", "label", "placeholder",
  "aria-label", "kicker", "meta", "note", "sub", "hint", "actions"] as const;
export function sayTree(node: ReactNode, t: (s: string) => string, on: boolean): ReactNode {
  if (!on) return node;
  const walk = (n: ReactNode): ReactNode => {
    if (typeof n === "string") return t(n);
    if (Array.isArray(n)) return Children.map(n, walk);
    if (isValidElement<Record<string, unknown> & { children?: ReactNode }>(n)) {
      /* 머리 컴포넌트는 제목을 속성으로 받는다(`<PageHead title=… />`).
         글자인 속성 몇 개도 같이 바꾼다 */
      const extra: Record<string, unknown> = {};
      for (const k of PROPS) {
        const v = n.props[k];
        if (typeof v === "string") extra[k] = t(v);
        else if (isValidElement(v)) extra[k] = walk(v);
      }
      if (n.props.children !== undefined) {
        return cloneElement(n, extra, walk(n.props.children));
      }
      return Object.keys(extra).length ? cloneElement(n, extra) : n;
    }
    return n;
  };
  return walk(node);
}
