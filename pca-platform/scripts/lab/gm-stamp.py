"""본문 PDF 의 쪽마다 덧판(머리말·섹션명·쪽 번호)을 겹친다."""
import sys
from pypdf import PdfReader, PdfWriter
body, over, out = sys.argv[1:4]
b, o = PdfReader(body), PdfReader(over)
w = PdfWriter()
for i, pg in enumerate(b.pages):
    if i < len(o.pages):
        pg.merge_page(o.pages[i])
    w.add_page(pg)
w.add_metadata({"/Title": "CareerMatri PRO 진로·취업 분석 리포트", "/Creator": "CareerMatri"})
with open(out, "wb") as f:
    w.write(f)
