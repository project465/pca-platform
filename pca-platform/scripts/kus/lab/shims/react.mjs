// harness-only: 훅은 첫 값만. 화면을 한 번 그리는 데만 쓴다
import { Fragment } from "./jsx-runtime.mjs";
export { Fragment };
export const useState = (v) => [typeof v === "function" ? v() : v, () => {}];
export const useActionState = (_fn, init) => [init, _fn, false];
export const useFormStatus = () => ({ pending: false });
export const useEffect = () => {}; export const useLayoutEffect = () => {};
export const useRef = (v) => ({ current: v ?? null }); export const useMemo = (f) => f();
export const useCallback = (f) => f; export const useId = () => "h" + Math.random().toString(36).slice(2, 7);
export const useTransition = () => [false, (f) => f()]; export const useContext = () => undefined;
export const createContext = (v) => ({ Provider: ({ children }) => children, v });
export const Suspense = ({ children }) => children; export const cache = (f) => f;
export default { useState, useEffect, useRef, useMemo, useCallback, Fragment };
