#!/usr/bin/env python3
"""
단체 응시용 1인 1링크 생성기 — 기관 담당자에게 전달할 CSV를 만듭니다.

사용법
    python3 tools/make_links.py \
        --base   https://project465.github.io/pca-platform/ \
        --org    "한국대학교 공과대학" \
        --major  ME \
        --form   STANDARD \
        --count  120 \
        --out    한국대학교_공과대학_링크.csv

명단이 이미 있으면 --roster 로 붙입니다 (CSV: 이름,학번 형식, 헤더 있어도 됨).
    python3 tools/make_links.py ... --roster 명단.csv

출력 CSV 열
    번호 / 이름 / 학번 / 토큰 / 링크
토큰은 링크마다 다른 16자리 난수이며, 서버 연동 전에는 식별용으로만 쓰입니다.
서버를 붙인 뒤에는 이 토큰을 DB(cm_assessments.session_token)에 미리 넣고
발급·사용여부를 관리하세요.

주의: CSV는 엑셀에서 바로 열 수 있도록 UTF-8 BOM으로 저장합니다.
"""
import argparse, csv, secrets, sys
from urllib.parse import quote

ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'   # 사람이 옮겨적기 쉬운 문자만


def token(n=16):
    return ''.join(secrets.choice(ALPHABET) for _ in range(n))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True, help='플랫폼 주소 (끝에 / 포함)')
    ap.add_argument('--org', required=True, help='기관명 — 응시 화면에 표시됩니다')
    ap.add_argument('--major', default='ME')
    ap.add_argument('--form', default='STANDARD', choices=['QUICK', 'STANDARD', 'PRO'])
    ap.add_argument('--count', type=int, default=0, help='인원수 (roster 없을 때)')
    ap.add_argument('--roster', default=None, help='이름,학번 CSV')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()

    people = []
    if a.roster:
        with open(a.roster, encoding='utf-8-sig', newline='') as f:
            for row in csv.reader(f):
                if not row or not row[0].strip():
                    continue
                if row[0].strip() in ('이름', 'name', 'Name'):
                    continue
                people.append((row[0].strip(), row[1].strip() if len(row) > 1 else ''))
    else:
        if a.count <= 0:
            sys.exit('--count 또는 --roster 중 하나가 필요합니다.')
        people = [('', '')] * a.count

    base = a.base if a.base.endswith('/') else a.base + '/'
    seen = set()
    rows = []
    for i, (name, sid) in enumerate(people, 1):
        t = token()
        while t in seen:
            t = token()
        seen.add(t)
        url = '%s?major=%s&form=%s&t=%s&org=%s' % (base, a.major, a.form, t, quote(a.org))
        rows.append([i, name, sid, t, url])

    with open(a.out, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f)
        w.writerow(['번호', '이름', '학번', '토큰', '링크'])
        w.writerows(rows)

    print('기관   : %s' % a.org)
    print('학과   : %s / 상품 %s' % (a.major, a.form))
    print('발급   : %d건' % len(rows))
    print('저장   : %s' % a.out)
    print('\n예시 링크:\n  %s' % rows[0][4])


if __name__ == '__main__':
    main()
