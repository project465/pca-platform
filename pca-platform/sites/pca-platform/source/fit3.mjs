import fs from 'fs';
const R='/tmp/claude-0/-home-user-pca-platform/9d86716b-6303-5380-b673-309c67deb299/scratchpad/up/platform/';
global.window={};
eval(fs.readFileSync(R+'data/me.js','utf8'));
eval(fs.readFileSync(R+'assets/engine.js','utf8'));
const E=window.PCAEngine, M=window.PCA_DATA.ME, dims=M.dna, style=M.style, all=dims.concat(style);
const LIK=new Set(['LIKERT','FUTURE','CONSISTENCY']);
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))||1;};
const rnd=()=>Math.random()*2-1;
const clamp=(n,lo=0,hi=100)=>Math.max(lo,Math.min(hi,n));

// 직무 행렬의 열 평균/표준편차 — "이 직무가 남들보다 유난히 요구하는 것"
const colM={}, colS={};
dims.forEach(d=>{ const col=M.jobs.map(j=>j.v[d]); colM[d]=mean(col); colS[d]=sd(col); });

function cos(a,b){ let d=0,p=0,q=0; for(let i=0;i<a.length;i++){d+=a[i]*b[i];p+=a[i]*a[i];q+=b[i]*b[i];}
  return (p&&q)? d/Math.sqrt(p*q) : 0; }

const MODES={
  absdiff: (p,j)=> clamp(100 - mean(dims.map(d=>Math.abs(p[d]-j[d])))),
  shape:   (p,j)=>{ const pm=mean(dims.map(d=>p[d])), jm=mean(dims.map(d=>j[d]));
    return clamp(50+50*cos(dims.map(d=>p[d]-pm), dims.map(d=>j[d]-jm))); },
  contrast:(p,j)=>{ const pm=mean(dims.map(d=>p[d]));
    return clamp(50+50*cos(dims.map(d=>p[d]-pm), dims.map(d=>j[d]-colM[d]))); },
  zcontrast:(p,j)=>{ const pv=dims.map(d=>p[d]), pm=mean(pv), ps=sd(pv);
    return clamp(50+50*cos(dims.map(d=>(p[d]-pm)/ps), dims.map(d=>(j[d]-colM[d])/colS[d]))); },
};

function answers(qs,target,noise){
  const z={}; all.forEach(d=>z[d]=((target[d]??50)-50)/50); const a={};
  for(const q of qs){
    if(LIK.has(q.type)){ let s=0,n=0; for(const[k,w] of Object.entries(q.w||{})){s+=w*(z[k]??0);n+=Math.abs(w);}
      a[q.id]=Math.max(1,Math.min(5,Math.round(3+(n?s/n:0)*2+rnd()*noise))); }
    else if(q.type==='EXPERIENCE'){ a[q.id]=2; }
    else { let best=null,bv=-1e9; for(const[o,vec] of Object.entries(q.vec||{})){ let s=0;
        for(const d of all) s+=Number(vec[d]||0)*(z[d]??0); s+=rnd()*noise*8; if(s>bv){bv=s;best=o;} } a[q.id]=best; }
  }
  return a;
}
function dnaOf(form, ans){ const r=E.score(M,form,ans); return r.career_dna; }

function evaluate(form, mode, N, noise){
  const qs=E.questionsFor(M,form); const f=MODES[mode];
  let hit=0, tot=0; const cnt={}; const per={}; const reach={};
  // 잡음 0 도달 가능성
  for(const job of M.jobs){
    const ans=answers(qs, job.v, 0); const p=dnaOf(form, ans);
    const rank=M.jobs.map(j=>({n:j.name, s:f(p,j.v)})).sort((a,b)=>b.s-a.s);
    reach[job.name]= rank[0].n===job.name ? '1위' : `${rank.findIndex(x=>x.n===job.name)+1}위(${rank[0].n})`;
  }
  for(const job of M.jobs){ per[job.name]=0;
    for(let i=0;i<N;i++){
      const t={}; dims.forEach(d=>t[d]=job.v[d]); style.forEach(d=>t[d]=50+rnd()*25);
      const p=dnaOf(form, answers(qs,t,noise));
      const best=M.jobs.map(j=>({n:j.name,s:f(p,j.v)})).sort((a,b)=>b.s-a.s)[0].n;
      cnt[best]=(cnt[best]||0)+1; tot++;
      if(best===job.name){hit++; per[job.name]++;}
    }
  }
  const share=Object.values(cnt).map(v=>v/tot);
  return { mode, 되찾기:+(hit/tot*100).toFixed(1),
    도달못함: Object.entries(reach).filter(([,v])=>v!=='1위').map(([k,v])=>k+'→'+v),
    최대편중:+(Math.max(...share)*100).toFixed(1),
    직무별: Object.fromEntries(Object.entries(per).map(([k,v])=>[k,+(v/N*100).toFixed(0)])) };
}
for(const form of ['QUICK','STANDARD']){
  console.log('\n##### '+form+'  (직무당 150명, 잡음 0.6)');
  for(const m of ['absdiff','shape','contrast','zcontrast']){
    const r=evaluate(form,m,150,0.6);
    console.log(`${m.padEnd(10)} 되찾기 ${String(r.되찾기).padStart(5)}%  최대편중 ${String(r.최대편중).padStart(5)}%  도달못함 ${r.도달못함.length}`);
    if(r.도달못함.length) console.log('           '+r.도달못함.join(' · '));
    console.log('           '+JSON.stringify(r.직무별));
  }
}
