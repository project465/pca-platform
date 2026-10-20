// harness-only: 요청마다의 세션·쿠키를 담는 자리
import { AsyncLocalStorage } from "node:async_hooks";
export const als = new AsyncLocalStorage();
globalThis.__kusAls = als;
