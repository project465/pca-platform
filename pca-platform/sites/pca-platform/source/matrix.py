# 직무 행렬이 실제로 몇 축을 쓰고 있는가.  python3 matrix.py job_matrix_me.csv
import sys, math
dims=['APS','ST','EI','VP','OPT','DD','EXE','CI']
rows=[]
for line in open(sys.argv[1] if len(sys.argv)>1 else 'job_matrix_me.csv',
                 encoding='utf-8-sig').read().splitlines()[1:]:
    p=line.split(','); rows.append((p[0],[float(x) for x in p[1:9]]))
names=[r[0] for r in rows]; V=[r[1] for r in rows]; n=len(V)
def corr(u,v):
    mu,mv=sum(u)/len(u),sum(v)/len(v)
    a=sum((x-mu)*(y-mv) for x,y in zip(u,v))
    b=math.sqrt(sum((x-mu)**2 for x in u)*sum((y-mv)**2 for y in v))
    return a/b if b else 0
print('축끼리의 상관 (|r| >= 0.7)')
for i in range(8):
    for j in range(i+1,8):
        r=corr([V[t][i] for t in range(n)],[V[t][j] for t in range(n)])
        if abs(r)>=0.7: print(f'  {dims[i]:4}~{dims[j]:4} {r:+.2f}')
cm=[sum(V[i][j] for i in range(n))/n for j in range(8)]
X=[[V[i][j]-cm[j] for j in range(8)] for i in range(n)]
C=[[sum(X[t][i]*X[t][j] for t in range(n)) for j in range(8)] for i in range(8)]
def eig(M):
    m=[r[:] for r in M]; p=len(m)
    for _ in range(300):
        off=max(((abs(m[i][j]),i,j) for i in range(p) for j in range(p) if i!=j))
        if off[0]<1e-9: break
        _,i,j=off
        th=0.5*math.atan2(2*m[i][j], m[i][i]-m[j][j]); c,s=math.cos(th),math.sin(th)
        for t in range(p):
            a,b=m[i][t],m[j][t]; m[i][t]=c*a+s*b; m[j][t]=-s*a+c*b
        for t in range(p):
            a,b=m[t][i],m[t][j]; m[t][i]=c*a+s*b; m[t][j]=-s*a+c*b
    return sorted((m[i][i] for i in range(p)), reverse=True)
ev=eig(C); tot=sum(ev); acc=0
print('\n직무가 실제로 퍼져 있는 방향')
for i,e in enumerate(ev):
    acc+=max(e,0)/tot
    print(f'  축{i+1} {max(e,0)/tot*100:5.1f}%  누적 {acc*100:5.1f}%')
def cc(a,b):
    ma,mb=sum(a)/8,sum(b)/8
    d=sum((x-ma)*(y-mb) for x,y in zip(a,b))
    return d/math.sqrt(sum((x-ma)**2 for x in a)*sum((y-mb)**2 for y in b))
cl=[[i] for i in range(n)]
print('\n직무가 붙는 순서 (거리 = 1 - 모양유사도)')
while len(cl)>1:
    best=(9,None,None)
    for i in range(len(cl)):
        for j in range(i+1,len(cl)):
            d=sum(1-cc(V[a],V[b]) for a in cl[i] for b in cl[j])/(len(cl[i])*len(cl[j]))
            if d<best[0]: best=(d,i,j)
    d,i,j=best
    print(f'  {d:5.3f}  {" ".join(names[x] for x in cl[i])} + {" ".join(names[x] for x in cl[j])}')
    cl[i]=cl[i]+cl[j]; cl.pop(j)
