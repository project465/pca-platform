export function redirect(to) { const e = new Error("NEXT_REDIRECT " + to); e.digest = "NEXT_REDIRECT;" + to; throw e; }
export function permanentRedirect(to) { return redirect(to); }
export function notFound() { const e = new Error("NEXT_NOT_FOUND"); e.digest = "NEXT_NOT_FOUND"; throw e; }
export const useRouter = () => ({ push() {}, replace() {}, refresh() {}, back() {} });
export const usePathname = () => "/"; export const useSearchParams = () => new URLSearchParams();
