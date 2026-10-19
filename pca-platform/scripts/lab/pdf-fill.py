#!/usr/bin/env python3
"""쪽마다 글자가 세로로 어디까지 찼는지(%) 와 글자 수. python3 scripts/lab/pdf-fill.py x.pdf"""
import subprocess, sys, re
pdf=sys.argv[1]
bbox=subprocess.run(["pdftotext","-bbox",pdf,"-"],capture_output=True,text=True).stdout
out=[]
for i,pg in enumerate(bbox.split("<page")[1:],1):
    h=float(re.search(r'height="([\d.]+)"',pg).group(1)); top=h*0.047; bot=h*0.955; low=top; n=0
    for m in re.finditer(r'yMax="([\d.]+)"',pg):
        y=float(m.group(1)); n+=1
        if top<y<bot and y>low: low=y
    out.append((i,round((low-top)/(bot-top)*100),n))
print(" · ".join(f"p{i} {f}% ({n}w)" for i,f,n in out))
