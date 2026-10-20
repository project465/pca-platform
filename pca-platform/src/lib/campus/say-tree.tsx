import { Children, cloneElement, isValidElement, type ReactNode } from "react";

/**
 * 화면 한 덩이의 글자를 기관 낱말로 바꾼다(`campusSay`).
 *
 * 담당자 화면은 `학생 · 학과 · 단과대학` 을 백 군데 가까이 적는다. 그것을
 * 한 줄씩 감싸면 다음에 문장을 더하는 사람이 감싸기를 잊고, 기관 화면에
 * 학교 낱말이 다시 선다. 그래서 **쪽이 돌려주는 덩이를 통째로 지나가며**
 * 글자 자식만 바꾼다. 학교면(`t` 가 그대로 돌려주는 함수면) 건드리지 않는다.
 *
 * 닿는 것은 그 덩이에 직접 적힌 글자다. 다른 컴포넌트가 제 안에서 만드는
 * 글자와 `placeholder` 같은 속성은 닿지 않는다.
 */
export function sayTree(node: ReactNode, t: (s: string) => string, on: boolean): ReactNode {
  if (!on) return node;
  const walk = (n: ReactNode): ReactNode => {
    if (typeof n === "string") return t(n);
    if (Array.isArray(n)) return Children.map(n, walk);
    if (isValidElement<{ children?: ReactNode }>(n) && n.props.children !== undefined) {
      return cloneElement(n, undefined, walk(n.props.children));
    }
    return n;
  };
  return walk(node);
}
