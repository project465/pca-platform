#!/usr/bin/env python3
"""
학과 데이터 빌더 — Career Matri 계산엔진 xlsx → data/<code>.js

사용법
    python3 tools/build_major.py \
        --xlsx  Career_Matri_V2_0_Calculation_Engine.xlsx \
        --code  ME \
        --name  기계공학과 \
        --out   data/me.js

필요한 시트 (기계공학 파일과 동일한 형식이어야 합니다)
    04_<X>_QuestionBank_120   ID / Form / Type / Question / Rationale /
                              APS..CI / IC / CS / SQ / Evidence / Grad / Options
    05_Option_Scoring         QuestionID / Option / APS..SQ
    03_<X>_Job_Matrix         직무 / APS..CI / 대학원 연계성 / 대표 Evidence
    15_JOB_Evidence_Matrix    QuestionID / Question / <직무명들>

직무별 서술 콘텐츠(summary/tasks/scenes/projects/interview)는 xlsx에 없으므로
--content content/<code>.json 으로 따로 넣습니다. 형식은 content/me.json 참고.
없으면 빈 값으로 만들고 경고를 출력합니다.

검증에 실패하면 파일을 쓰지 않고 종료합니다.
"""
import argparse, json, re, sys, collections, warnings

warnings.filterwarnings('ignore')
try:
    import openpyxl
except ImportError:
    sys.exit('openpyxl이 필요합니다:  pip install openpyxl')

D8 = ['APS', 'ST', 'EI', 'VP', 'OPT', 'DD', 'EXE', 'CI']
WS3 = ['IC', 'CS', 'SQ']
ALL = D8 + WS3
DNA_LABELS = {'APS': '분석적 문제해결', 'ST': '구조적 사고', 'EI': '탐구·혁신', 'VP': '검증·정확성',
              'OPT': '개선·최적화', 'DD': '데이터·디지털', 'EXE': '실행·현장', 'CI': '협업·통합'}
STYLE_LABELS = {'IC': ['독립', '협력'], 'CS': ['도전', '안정'], 'SQ': ['속도', '품질']}
TIER = {'QUICK+STANDARD+PRO': 'QUICK', 'STANDARD+PRO': 'STANDARD', 'PRO': 'PRO', 'RESERVE': 'RESERVE'}

# 지원준비 문항(EVIDENCE가 아니라 Application Readiness로 쓰는 문항)
# 기계공학은 ME087~092. 다른 학과는 --apply 로 지정하세요.
DEFAULT_APPLY_RE = r'^\w+0(8[7-9]|9[0-2])$'


def sheet(wb, pattern):
    for ws in wb.worksheets:
        if re.search(pattern, ws.title):
            return ws
    sys.exit('시트를 찾을 수 없습니다: %s\n  있는 시트: %s' % (pattern, [w.title for w in wb.worksheets]))


def rows_of(ws):
    return [r for r in ws.iter_rows(values_only=True)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--xlsx', required=True)
    ap.add_argument('--code', required=True, help='학과 코드 (예: ME, EE)')
    ap.add_argument('--name', required=True, help='학과 이름 (예: 기계공학과)')
    ap.add_argument('--name-en', default='')
    ap.add_argument('--out', required=True)
    ap.add_argument('--content', default=None, help='직무 서술 콘텐츠 JSON')
    ap.add_argument('--apply', default=DEFAULT_APPLY_RE, help='지원준비 문항 ID 정규식')
    ap.add_argument('--version', default=None, help='기본값 <CODE>-2.0.0')
    a = ap.parse_args()

    ver = a.version or ('%s-2.0.0' % a.code)
    wb = openpyxl.load_workbook(a.xlsx, data_only=False)

    # ── 문항은행
    qrows = rows_of(sheet(wb, r'QuestionBank'))
    hdr = qrows[0]
    need = ['ID', 'Form', 'Type', 'Question']
    for c in need:
        if c not in hdr:
            sys.exit('문항 시트에 %s 열이 없습니다. 열: %s' % (c, hdr))

    questions, problems = [], []
    for r in qrows[1:]:
        rec = dict(zip(hdr, r))
        if not rec.get('ID'):
            continue
        qid, typ = str(rec['ID']).strip(), str(rec['Type']).strip()
        form = str(rec['Form']).strip()
        if form not in TIER:
            problems.append('%s: 알 수 없는 Form "%s"' % (qid, form))
            continue
        q = {'id': qid, 'tier': TIER[form], 'type': typ, 'text': str(rec['Question']).strip()}
        w = {d: float(rec[d]) for d in ALL if rec.get(d) not in (None, 0, '0')}
        if w:
            q['w'] = w
        opts = rec.get('Options')
        if typ == 'TRADEOFF':
            m = re.match(r'^A\s+(.*?)\s*/\s*B\s+(.*)$', q['text'])
            if not m:
                problems.append('%s: TRADEOFF 문항 형식이 "A ... / B ..." 가 아닙니다' % qid)
            else:
                q['text'] = '두 가지 중 지금 더 끌리는 쪽을 선택해 주세요.'
                q['options'] = {'A': m.group(1).strip(), 'B': m.group(2).strip()}
        elif opts and str(opts).strip() and str(opts).strip() != 'A/B':
            o = {}
            for p in str(opts).split('|'):
                p = p.strip()
                if len(p) > 2 and p[0] in 'ABCD' and p[1] == ' ':
                    o[p[0]] = p[2:].strip()
            if o:
                q['options'] = o
        if typ == 'EXPERIENCE':
            q['role'] = 'APPLY' if re.match(a.apply, qid) else 'EVIDENCE'
        questions.append(q)

    # ── 옵션 벡터
    orows = rows_of(sheet(wb, r'Option_Scoring'))
    oh = orows[0]
    optsc = collections.defaultdict(dict)
    for r in orows[1:]:
        rec = dict(zip(oh, r))
        if not rec.get('QuestionID'):
            continue
        vec = {d: float(rec[d]) for d in ALL if rec.get(d) not in (None, 0, '0')}
        optsc[str(rec['QuestionID']).strip()][str(rec['Option']).strip()] = vec
    for q in questions:
        if q['id'] in optsc:
            q['vec'] = optsc[q['id']]

    # ── 직무 매트릭스
    jrows = rows_of(sheet(wb, r'Job_Matrix$|_Job_Matrix'))
    jobs, jobname_order = [], []
    for r in jrows[1:]:
        if not r[0]:
            continue
        name = str(r[0]).strip()
        jobname_order.append(name)
        # 직무 코드는 콘텐츠 파일의 "code" 값을 우선 사용하고, 없으면 행 순서로 생성합니다.
        code = '%s_J%d' % (a.code, len(jobs) + 1)
        jobs.append({'code': code, 'name': name,
                     'v': {D8[i]: float(r[1 + i]) for i in range(8)},
                     'grad': r[9] if len(r) > 9 else None,
                     'evidence_examples': r[10] if len(r) > 10 else None})

    # ── 직무 서술 콘텐츠 (직무 코드도 여기서 가져옵니다)
    content = {}
    if a.content:
        content = json.load(open(a.content, encoding='utf-8'))
    for j in jobs:
        c = content.get(j['name'], {})
        if c.get('code'):
            j['code'] = c['code']

    # ── Evidence 매트릭스
    erows = rows_of(sheet(wb, r'Evidence_Matrix'))
    eh = erows[0]
    name2code = {j['name']: j['code'] for j in jobs}
    colmap = {}
    for i, hcell in enumerate(eh):
        if i >= 2 and hcell and str(hcell).strip() in name2code:
            colmap[i] = name2code[str(hcell).strip()]
    missing = [str(h).strip() for i, h in enumerate(eh) if i >= 2 and h and str(h).strip() not in name2code]
    if missing:
        problems.append('Evidence 매트릭스의 직무명이 Job Matrix와 다릅니다: %s' % missing)
    evw = {}
    for r in erows[1:]:
        if not r[0]:
            continue
        evw[str(r[0]).strip()] = {colmap[i]: float(r[i]) for i in colmap
                                  if r[i] not in (None, '') and float(r[i]) > 0}

    # ── 학과 공통 원고 (직무 이름이 아니라 '__major__' 키에 들어 있다)
    major_copy = content.get('__major__', {})

    # ── 직무 서술 콘텐츠 적용
    for j in jobs:
        c = content.get(j['name'], {})
        j['summary'] = c.get('summary', '')
        j['tasks'] = c.get('tasks', [])
        j['scenes'] = c.get('scenes', [])
        j['projects'] = c.get('projects', [])
        j['interview'] = c.get('interview', [])
        # 긴 결과지(STANDARD·PRO)가 쓰는 원고. 없으면 그 소절을 그리지 않는다.
        for k in ('field', 'overview', 'keywords', 'strengths', 'scenarios', 'roles',
                  'projects_long', 'resume_angle', 'resume_sentences', 'resume_caution',
                  'interview_long', 'venture', 'criteria', 'next30', 'narr'):
            if c.get(k):
                j[k] = c[k]
        if not (j['summary'] and len(j['tasks']) == 4 and len(j['scenes']) == 4
                and len(j['projects']) == 3 and len(j['interview']) == 3):
            problems.append('콘텐츠 누락: %s (summary / tasks 4 / scenes 4 / projects 3 / interview 3 필요)'
                            % j['name'])

    # ── 검증
    for q in questions:
        if q['type'] in ('SJT', 'PROBLEM'):
            if len(q.get('options', {})) != 4:
                problems.append('%s: 선택지 4개가 아닙니다' % q['id'])
            if len(q.get('vec', {})) != 4:
                problems.append('%s: 옵션 벡터 4개가 아닙니다' % q['id'])
        if q['type'] == 'TRADEOFF' and len(q.get('vec', {})) != 2:
            problems.append('%s: TRADEOFF 옵션 벡터 2개가 아닙니다' % q['id'])
        if q['type'] in ('LIKERT', 'FUTURE', 'CONSISTENCY') and not q.get('w'):
            problems.append('%s: 차원 가중치가 없습니다' % q['id'])
        if q['type'] == 'EXPERIENCE' and q['id'] not in evw:
            problems.append('%s: Evidence 가중치가 없습니다' % q['id'])

    tiers = collections.Counter(q['tier'] for q in questions)
    for tier, expect in (('QUICK', 28), ('STANDARD', 40), ('PRO', 24)):
        if tiers.get(tier, 0) != expect:
            problems.append('%s 문항 수가 %d개입니다 (기대 %d개)' % (tier, tiers.get(tier, 0), expect))

    print('학과      : %s (%s)' % (a.name, a.code))
    print('문항      : %d  %s' % (len(questions), dict(tiers)))
    print('유형      : %s' % dict(collections.Counter(q['type'] for q in questions)))
    print('직무      : %d  %s' % (len(jobs), [j['code'] for j in jobs]))
    print('Evidence  : %d문항' % len(evw))

    if problems:
        print('\n검증 실패 — 파일을 쓰지 않았습니다:')
        for p in problems:
            print('  ✗', p)
        sys.exit(1)

    data = {
        'code': a.code, 'name': a.name, 'name_en': a.name_en,
        'question_bank_version': ver, 'job_matrix_version': ver,
        'dna': D8, 'dna_labels': DNA_LABELS,
        'style': WS3, 'style_labels': STYLE_LABELS,
        'jobs': jobs, 'questions': questions, 'evidence_weights': evw,
    }
    # 학과 공통 원고 (8축 설명·성향별 부담 국면). 없으면 그 소절을 그리지 않는다.
    for k in ('dna_desc', 'style_load'):
        if major_copy.get(k):
            data[k] = major_copy[k]
    body = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    out = ('/* PCA Platform — %s 데이터셋 (자동 생성)\n'
           '   생성: tools/build_major.py  출처: %s\n'
           '   직접 수정하지 말고 원본 xlsx를 고친 뒤 다시 생성하세요. */\n'
           'window.PCA_DATA = window.PCA_DATA || {};\n'
           'window.PCA_DATA.%s = %s;\n') % (a.name, a.xlsx, a.code, body)
    open(a.out, 'w', encoding='utf-8').write(out)
    print('\n✓ %s (%,d bytes)'.replace(',', '') % (a.out, len(out)))
    print('  다음: index.html에 <script src="%s"></script> 추가 후'
          ' data/majors.js에서 %s의 status를 ready로 변경' % (a.out, a.code))


if __name__ == '__main__':
    main()
