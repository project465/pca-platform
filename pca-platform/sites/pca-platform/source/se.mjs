import fs from 'fs';
const R='/tmp/claude-0/-home-user-pca-platform/9d86716b-6303-5380-b673-309c67deb299/scratchpad/up/platform/';
global.window={};
eval(fs.readFileSync(R+'data/me.js','utf8'));
eval(fs.readFileSync(R+'assets/engine.js','utf8'));
const E=window.PCAEngine, M=window.PCA_DATA.ME, dims=M.dna, style=M.style, all=dims.concat(style);
const LIK=new Set(['LIKERT','FUTURE','CONSISTENCY']);
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)));};
const rnd=()=>Math.random()*2-1;

function answers(qs, target, noise){
  const z={}; all.forEach(d=>z[d]=((target[d]??50)-50)/50); const a={};
  for(const q of qs){
    if(LIK.has(q.type)){ let s=0,n=0; for(const[k,w] of Object.entries(q.w||{})){s+=w*(z[k]??0);n+=Math.abs(w);}
      a[q.id]=Math.max(1,Math.min(5,Math.round(3+(n?s/n:0)*2+rnd()*noise))); }
    else if(q.type==='EXPERIENCE'){ a[q.id]=Math.max(0,Math.min(3,Math.round(1.5+rnd()*1.5))); }
    else { let best=null,bv=-1e9; for(const[o,vec] of Object.entries(q.vec||{})){ let s=0;
        for(const d of all) s+=Number(vec[d]||0)*(z[d]??0); s+=rnd()*noise*8; if(s>bv){bv=s;best=o;} } a[q.id]=best; }
  }
  return a;
}
// 문항을 복원추출해 다시 채점 → FIT 이 얼마나 흔들리는가
function boot(form, N, B, noise){
  const qs=E.questionsFor(M,form);
  const ses=[], gaps=[], g1=[];
  for(let i=0;i<N;i++){
    const job=M.jobs[Math.floor(Math.random()*M.jobs.length)];
    const t={}; dims.forEach(d=>t[d]=job.v[d]); style.forEach(d=>t[d]=50+rnd()*25);
    const ans=answers(qs,t,noise);
    const base=E.score(M,form,ans);
    gaps.push(base.jobs[0].fit-base.jobs[1].fit);
    const per={}; M.jobs.forEach(j=>per[j.code]=[]);
    for(let b=0;b<B;b++){
      const sub={}; const pick=[];
      for(let k=0;k<qs.length;k++) pick.push(qs[Math.floor(Math.random()*qs.length)]);
      // 같은 문항이 여러 번 뽑혀도 응답은 하나이므로, 뽑힌 문항만 남긴 부분집합으로 채점
      const ids=new Set(pick.map(q=>q.id));
      const fake={...M, questions:M.questions.filter(q=>ids.has(q.id)||!qs.find(x=>x.id===q.id))};
      for(const q of qs) if(ids.has(q.id)) sub[q.id]=ans[q.id];
      const r=E.score(fake, form, sub);
      r.jobs.forEach(j=>per[j.code].push(j.fit));
    }
    ses.push(mean(M.jobs.map(j=>sd(per[j.code]))));
    // 1위와 겹치는 직무 수 (1 SE 밴드)
    const se=mean(M.jobs.map(j=>sd(per[j.code])));
    g1.push(base.jobs.filter(j=>base.jobs[0].fit-j.fit<=se).length);
  }
  return { se:+mean(ses).toFixed(2), gap:+mean(gaps).toFixed(2), band1:+mean(g1).toFixed(2) };
}
for(const f of ['QUICK','STANDARD','PRO']) console.log(f, JSON.stringify(boot(f, 120, 25, 0.6)));
