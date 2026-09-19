(function(){
  function state(){try{return JSON.parse(localStorage.getItem("certpulse-state")||'{"attempts":[]}')}catch(e){return {attempts:[]}}}
  function save(s){localStorage.setItem("certpulse-state",JSON.stringify(s))}
  function escape(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
  function learner(cert){
    const attempts=state().attempts.filter(a=>a.certification===cert), domains={};
    attempts.flatMap(a=>a.questions||[]).forEach(q=>{if(!domains[q.domain])domains[q.domain]={c:0,t:0};domains[q.domain].t++;if(q.correct)domains[q.domain].c++});
    return {attempts,domains};
  }
  function readiness(cert){
    const x=learner(cert), scores=x.attempts.map(a=>a.score||0);
    if(!scores.length)return 0;
    const recent=scores.slice(-5), avg=recent.reduce((a,b)=>a+b,0)/recent.length;
    const domain=Object.values(x.domains).map(d=>d.c/d.t);
    const coverage=Math.min(1,domain.length/6);
    return Math.round(avg*.7+(domain.length?Math.min(...domain)*100:avg)*.2+coverage*10);
  }
  window.renderDashboard=function(){
    const el=document.getElementById("dashboard"); if(!el||!window.examsReady)return;
    const s=state(), attempts=s.attempts||[], total=attempts.reduce((n,a)=>n+(a.questions?.length||0),0), correct=attempts.reduce((n,a)=>n+(a.correct||0),0);
    const allDomains={};
    attempts.flatMap(a=>a.questions||[]).forEach(q=>{if(!allDomains[q.domain])allDomains[q.domain]={c:0,t:0};allDomains[q.domain].t++;if(q.correct)allDomains[q.domain].c++});
    const rows=Object.entries(allDomains).sort((a,b)=>a[1].c/a[1].t-b[1].c/b[1].t);
    const certs=Object.keys(window.exams||{});
    const cert=certs.sort((a,b)=>readiness(a)-readiness(b))[0]||certs[0];
    const weak=rows[0]?.[0]||"your weak areas";
    const ready=cert?readiness(cert):0;
    el.innerHTML='<div class="dashboard-head"><div><div class="eyebrow">ADAPTIVE LEARNING ENGINE</div><h2>Your certification signal.</h2><p>Every attempt feeds the next practice set. CertPulse prioritizes weak domains instead of serving the same random quiz forever.</p></div><button class="ghost-button" onclick="window.resetCertPulse()">Reset progress</button></div>'+
      '<div class="stats-grid"><div class="stat-card"><span>Attempts</span><strong>'+attempts.length+'</strong></div><div class="stat-card"><span>Questions</span><strong>'+total+'</strong></div><div class="stat-card"><span>Accuracy</span><strong>'+(total?Math.round(correct/total*100):0)+'%</strong></div><div class="stat-card"><span>Readiness</span><strong>'+ready+'%</strong></div></div>'+
      '<div class="dashboard-grid"><div class="dashboard-panel"><div class="panel-title">Knowledge map</div>'+
      (rows.length?rows.slice(0,10).map(([d,v])=>{const p=Math.round(v.c/v.t*100);return '<div class="domain-row"><div><span>'+escape(d)+'</span><strong>'+p+'%</strong></div><small>'+v.t+' answered</small><div class="mini-track"><i style="width:'+p+'%"></i></div></div>'}).join(""):'<div class="empty-state">Take a mock to build your knowledge map.</div>')+
      '</div><div class="dashboard-panel"><div class="panel-title">Next recommended</div><div class="recommend-card"><span class="recommend-kicker">ADAPTIVE PRACTICE</span><strong>'+escape(cert||"Start your first mock")+'</strong><p>Weakest signal: <b>'+escape(weak)+'</b>. Targeted questions will be weighted toward this area.</p>'+(cert?'<button class="start-button" onclick="window.startAdaptive(''+cert+'')">Start adaptive →</button>':'')+'</div><div class="panel-title recent-title">Recent attempts</div>'+
      (attempts.length?attempts.slice(-4).reverse().map(a=>'<div class="attempt-row"><div><strong>'+escape(a.certification)+'</strong><small>'+new Date(a.date).toLocaleDateString()+' · '+a.questions.length+' questions</small></div><b>'+a.score+'%</b></div>').join(""):'<div class="empty-state">No attempts yet.</div>')+
      '</div></div>';
  };
  window.resetCertPulse=function(){if(confirm("Reset all CertPulse learning progress on this browser?")){localStorage.removeItem("certpulse-state");window.renderDashboard()}};
  window.startAdaptive=function(cert){
    if(!window.examsReady)return;
    const qs=(window.exams[cert]?.questions||[]).slice(), x=learner(cert);
    qs.sort((a,b)=>{
      const ad=x.domains[a[6]],bd=x.domains[b[6]];
      const aw=ad?1+(1-ad.c/ad.t)*5:1.5, bw=bd?1+(1-bd.c/bd.t)*5:1.5;
      return bw-aw || Math.random()-.5;
    });
    const attempts=x.attempts, avg=attempts.length?attempts.slice(-3).reduce((n,a)=>n+a.score,0)/Math.min(3,attempts.length):0;
    const targetDifficulty=avg>=85?"Hard":avg>=65?"Medium":"Easy";
    const matching=qs.filter(q=>q[5]===targetDifficulty), rest=qs.filter(q=>q[5]!==targetDifficulty);
    const selected=[...matching,...rest].slice(0,20);
    window.attemptSaved=false;window.currentKey=cert;window.current={...window.exams[cert],difficulty:"Adaptive · "+targetDifficulty,type:"Mixed",questions:selected};
    window.index=0;window.answers=Array(selected.length).fill(null);window.seconds=2700;
    document.getElementById("cards").hidden=true;document.getElementById("dashboard").hidden=true;document.getElementById("practice").hidden=false;
    window.startTimer();window.render();
  };
  window.practiceSimilar=function(){
    const q=window.current?.questions?.[window.index];if(!q)return;
    const pool=(window.exams[window.currentKey]?.questions||[]).filter(x=>x[6]===q[6]&&x[10]!==q[10]).sort(()=>Math.random()-.5).slice(0,5);
    if(!pool.length)return;
    window.current={...window.current,difficulty:"Focused",type:"Concept practice",questions:pool};window.index=0;window.answers=Array(pool.length).fill(null);window.seconds=900;window.startTimer();window.render();
  };
  window.backToCerts=function(){clearInterval(window.timerId);document.getElementById("practice").hidden=true;document.getElementById("cards").hidden=false;document.getElementById("dashboard").hidden=false;window.renderDashboard()};
  const originalBuild=window.buildCards;
  function enhanceCards(){
    if(!window.examsReady)return;
    const cards=document.getElementById("cards");
    cards.innerHTML=Object.entries(window.exams).map(([k,e])=>'<article class="cert-card"><div class="card-top"><span class="cert-code">'+escape(k)+'</span><span class="bank-count">'+e.questions.length+' questions</span></div><h2>'+escape(e.name)+'</h2><p>Adaptive mocks, scenarios, architecture questions and hands-on terminal tasks.</p><div class="exam-settings"><label>Difficulty<select id="difficulty-'+k+'"><option>Any</option><option>Easy</option><option>Medium</option><option>Hard</option></select></label><label>Question style<select id="type-'+k+'"><option>Any</option><option>MCQ</option><option>Scenario</option><option>Terminal</option><option>Architecture</option><option>Troubleshooting</option></select></label></div><div class="card-actions"><button class="start-button secondary-start" onclick="start(''+k+'',document.getElementById(\'difficulty-'+k+'\').value,document.getElementById(\'type-'+k+'\').value)">Custom mock</button><button class="start-button" onclick="startAdaptive(''+k+'')">Adaptive mock →</button></div></article>').join("");
  }
  function boot(){if(window.examsReady){enhanceCards();window.renderDashboard()}}
  window.addEventListener("certpulse-ready",boot);
  setTimeout(boot,800);
})();