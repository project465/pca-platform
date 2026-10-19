# -*- coding: utf-8 -*-
"""Human Review 패키지에 개인정보 · 인증정보 · 비밀키가 없는지 센다.

  python3 scripts/lab/r31_secrets.py docs/metri/review/r31 docs/metri/R31_BIZ_GOLD_MASTER_HUMAN_REVIEW.md

글자 파일(md · txt · json · log · csv)을 전부 읽고, PDF 는 pdftotext 로 꺼낸 글자를 본다.
걸리면 종료코드 1. 시험용 주소(`*.test.invalid` · `*.example.*`)와 `noreply@anthropic.com` 은
개인정보가 아니라 뺀다. 결과는 `checks/privacy-scan.txt` 에 적는다.
"""
import os, re, subprocess, sys

root = sys.argv[1]; extra = sys.argv[2:]
RULES = [
    ("이메일 주소", re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")),
    ("전화번호", re.compile(r"\b0\d{1,2}-\d{3,4}-\d{4}\b")),
    ("주민등록번호 꼴", re.compile(r"\b\d{6}-[1-4]\d{6}\b")),
    ("DB 연결 문자열", re.compile(r"postgres(ql)?://[^\s'\"]+")),
    ("비밀번호 값", re.compile(r"(password|passwd|pw|비밀번호)\s*[:=]\s*[^\s,·()]{4,}", re.I)),
    ("API 키/토큰", re.compile(r"\b(sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,})\b")),
    ("JWT", re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b")),
    ("비밀 환경변수 값", re.compile(r"\b(AUTH_SECRET|NEXTAUTH_SECRET|STAGING_BASIC_AUTH|OPS_TOKEN|PORTONE_API_SECRET|MAIL_PASS)\s*=\s*\S+")),
    ("긴 16진 열쇠", re.compile(r"\b[0-9a-f]{40,}\b")),
]
ALLOW_EMAIL = re.compile(r"@(test\.invalid|example\.(com|org|net)|anthropic\.com)$")

def texts():
    for d, _, fs in os.walk(root):
        for f in fs:
            p = os.path.join(d, f)
            if f.endswith((".md", ".txt", ".json", ".log", ".csv")):
                yield p, open(p, encoding="utf-8", errors="ignore").read()
            elif f.endswith(".pdf"):
                try: yield p, subprocess.run(["pdftotext", "-layout", p, "-"], capture_output=True, text=True).stdout
                except FileNotFoundError: yield p, ""
    for p in extra:
        yield p, open(p, encoding="utf-8", errors="ignore").read()

hits = []; nfiles = 0
for p, t in texts():
    nfiles += 1
    for name, rx in RULES:
        for m in rx.finditer(t):
            v = m.group(0)
            if name == "이메일 주소" and ALLOW_EMAIL.search(v): continue
            if name == "긴 16진 열쇠" and re.search(r"sha256|지문|digest", t[max(0, m.start()-80):m.start()], re.I): continue
            hits.append((name, os.path.relpath(p), v[:60]))

png = sum(1 for d, _, fs in os.walk(root) for f in fs if f.endswith(".png"))
lines = [f"# 개인정보 · 인증정보 · 비밀키 검사 (파일 {nfiles}벌 글자 + PNG {png}장)", "",
         "규칙: 이메일 · 전화 · 주민번호 · DB 연결 문자열 · 비밀번호 값 · API 키 · JWT · 비밀 환경변수 값 · 긴 16진 열쇠.",
         "시험용 주소(`*.test.invalid`)와 커밋 서명(`noreply@anthropic.com`)은 뺀다. PNG 는 글자로 셀 수 없어 사람이 본다:",
         "캡처에 서는 이름은 `검수용 학생`·`E2E 학생`, 아이디는 `zzr31…` 꼴의 시험용이고 비밀번호는 화면에 서지 않는다.", ""]
if hits:
    lines.append(f"걸림 {len(hits)}")
    for n, p, v in hits: lines.append(f"- {n} · `{p}` · `{v}`")
else:
    lines.append("걸림 0 — 개인정보 · 인증정보 · 비밀키가 글자로 들어 있지 않다.")
os.makedirs(os.path.join(root, "checks"), exist_ok=True)
open(os.path.join(root, "checks", "privacy-scan.txt"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
print("\n".join(lines))
sys.exit(1 if hits else 0)
