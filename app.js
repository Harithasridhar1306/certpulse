let exams={};
let examsReady=false;

async function loadExamBank(){
  cards?.setAttribute("aria-busy","true");
  if(cards)cards.innerHTML='<div class="loading-bank">Loading certification question bank…</div>';
  try{
    const response=await fetch("./data/exams.json?v=2",{cache:"no-store"});
    if(!response.ok)throw new Error("Question bank request failed: "+response.status);
    const raw=await response.json();
    exams=Object.fromEntries(Object.entries(raw).map(([cert,exam])=>[cert,{
      ...exam,
      questions:exam.questions.map(q=>[q.question,q.options,q.correctAnswer,q.explanation,
        String(q.type||"").replace(/^./,x=>x.toUpperCase()),String(q.difficulty||"").replace(/^./,x=>x.toUpperCase()),
        q.domain,q.reference?.url||"",q.reference?.title||"",null,q.id,q.skills||[],q.terminalSpec||null])
    }]));
    examsReady=true;
    return exams;
  }catch(err){
    console.error("CertPulse question bank failed to load:",err);
    if(cards)cards.innerHTML='<div class="empty-state">The question bank could not be loaded. Refresh the page and try again.</div>';
    throw err;
  }finally{
    cards?.removeAttribute("aria-busy");
  }
}

const cards=document.getElementById("cards");

document.getElementById("cards");

function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function buildCards(){cards.innerHTML=Object.entries(exams).map(([k,e])=>`<article class="cert-card"><span class="cert-code">${k}</span><h2>${e.name}</h2><p>${e.questions.length}-question bank · choose difficulty and question style before starting.</p><div class="exam-settings"><label>Difficulty<select id="difficulty-${k}"><option>Any</option><option>Easy</option><option>Medium</option><option>Hard</option></select></label><label>Question style<select id="type-${k}"><option>Any</option><option>MCQ</option><option>Scenario</option><option>Terminal</option><option>Architecture</option></select></label></div><button class="start-button" onclick="start('${k}',document.getElementById('difficulty-${k}').value,document.getElementById('type-${k}').value)">Start practice →</button></article>`).join("")}
function start(k,difficulty="Any",type="Any"){attemptSaved=false;currentKey=k;const previous=lastExamQuestions;current={...exams[k],difficulty,type,questions:createExam(k,previous,difficulty,type)};if(!current.questions.length){alert("No questions are available yet.");return}lastExamQuestions=current.questions.map(q=>q[0]);index=0;answers=Array(current.questions.length).fill(null);seconds=2700;cards.hidden=true;document.getElementById("practice").hidden=false;startTimer();render()}
function startTimer(){clearInterval(timerId);updateTimer();timerId=setInterval(()=>{seconds--;updateTimer();if(seconds<=0){clearInterval(timerId);finish()}},1000)}
function updateTimer(){const m=String(Math.floor(seconds/60)).padStart(2,"0"),s=String(seconds%60).padStart(2,"0");const el=document.getElementById("timer");el.textContent=m+":"+s;el.classList.toggle("warning",seconds<=300)}
function render(){const q=current.questions[index];document.getElementById("title").textContent=`${current.name} · ${current.difficulty} · ${current.type}`;document.getElementById("progress").textContent=`Question ${index+1} of ${current.questions.length}`;document.getElementById("question-type").textContent=`${q[4]} · ${q[5]} · ${q[6]}`;document.getElementById("score-live").textContent=`${answers.filter(x=>x!==null).length} answered`;document.getElementById("progress-bar").style.width=((index+1)/current.questions.length*100)+"%";document.getElementById("question").innerHTML=`<div class="question-text">${escapeHtml(q[0])}</div>`;if(q[4]==="Terminal"){document.getElementById("options").innerHTML=`<div class="terminal-playground"><div class="terminal-head"><span>manifest.yaml</span><span>Write → Check → Continue</span></div><textarea id="manifest-editor" spellcheck="false" placeholder="apiVersion: v1\nkind: Pod\nmetadata:\n  name: ..."></textarea><button class="check-button" onclick="checkTerminal()">Check manifest →</button><div id="terminal-result"></div></div>`}else{document.getElementById("options").innerHTML=q[1].map((x,i)=>`<button class="option ${answers[index]===i?"selected":""}" onclick="choose(${i})"><span class="option-letter">${String.fromCharCode(65+i)}</span><span>${escapeHtml(x)}</span></button>`).join("")}if(q[4]!=="Terminal"){document.getElementById("ai-tutor").innerHTML="";document.getElementById("ai-tutor").className="ai-tutor";document.getElementById("ai-tutor").insertAdjacentHTML("beforeend",`<button id="ai-button" class="ai-button" onclick="askAITutor()">✦ Ask AI Tutor</button>`)}else{document.getElementById("ai-tutor").innerHTML="";document.getElementById("ai-tutor").className="ai-tutor"}document.getElementById("next-button").textContent=index===current.questions.length-1?"Submit exam →":"Next question →"}
function checkTerminal(){const q=current.questions[index],spec=q[9],raw=document.getElementById("manifest-editor").value.trim();if(!raw){showTerminal("Write your YAML first.","bad");return}const has=function(s){return raw.toLowerCase().indexOf(String(s).toLowerCase())>=0};const checks=[];checks.push(["apiVersion",/apiVersion\\s*:/i.test(raw)]);checks.push(["kind",has("kind: "+spec.kind)]);checks.push(["metadata.name",has("name: "+spec.name)]);if(spec.image)checks.push(["image",has("image: "+spec.image)]);if(spec.port)checks.push(["port",has("containerPort: "+spec.port)||has("port: "+spec.port)]);if(spec.targetPort)checks.push(["targetPort",has("targetPort: "+spec.targetPort)]);if(spec.replicas)checks.push(["replicas",has("replicas: "+spec.replicas)]);if(spec.selector)checks.push(["selector",has(spec.selector)]);if(spec.templateLabel)checks.push(["template label",has(spec.templateLabel)]);if(spec.dataKey)checks.push(["data key",has(spec.dataKey)]);if(spec.dataValue)checks.push(["data value",has(spec.dataValue)]);if(spec.stringDataKey)checks.push(["stringData key",has(spec.stringDataKey)]);if(spec.stringDataValue)checks.push(["stringData value",has(spec.stringDataValue)]);if(spec.serviceType)checks.push(["service type",has("type: "+spec.serviceType)]);if(spec.policyType)checks.push(["policy type",has("policyTypes")&&has(spec.policyType)]);if(spec.denyAllIngress)checks.push(["deny-all ingress",/ingress\\s*:\\s*\\[\\s*\\]/i.test(raw)]);if(spec.command)checks.push(["command",has(spec.command)]);if(spec.schedule)checks.push(["schedule",has(spec.schedule)]);if(spec.envKey)checks.push(["env key",has(spec.envKey)]);if(spec.envValue)checks.push(["env value",has(spec.envValue)]);if(spec.readinessPath)checks.push(["readiness path",has(spec.readinessPath)]);if(spec.readinessPort)checks.push(["readiness port",has(spec.readinessPort)]);const passed=checks.filter(function(x){return x[1]}).length;const ok=passed===checks.length;answers[index]=ok?0:null;showTerminal((ok?"✓ Manifest checks passed. ":"Some required fields are missing. ")+passed+"/"+checks.length+" checks passed.",ok?"good":"bad")}
function showTerminal(msg,kind){const el=document.getElementById("terminal-result");if(el){el.className=kind;el.textContent=msg}}

let aiGenerator=null,aiLoading=false;
async function getAITutor(){
  if(aiGenerator)return aiGenerator;
  if(aiLoading)return null;
  aiLoading=true;
  showAI("Preparing AI Tutor…","loading");
  try{
    const mod=await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2");
    mod.env.allowLocalModels=false;
    mod.env.useBrowserCache=true;
    const model="HuggingFaceTB/SmolLM2-1.7B-Instruct";
    const progress_callback=(p)=>{
      if(p&&p.status==="progress"&&typeof p.progress==="number"){
        showAI("Downloading AI model… "+Math.round(p.progress)+"%","loading");
      }
    };
    if("gpu" in navigator){
      try{
        aiGenerator=await mod.pipeline("text-generation",model,{
          device:"webgpu",
          dtype:"q4f16",
          progress_callback
        });
      }catch(webgpuError){
        console.warn("WebGPU model load failed; trying WASM q4 fallback:",webgpuError);
        aiGenerator=await mod.pipeline("text-generation",model,{
          device:"wasm",
          dtype:"q4",
          progress_callback
        });
      }
    }else{
      aiGenerator=await mod.pipeline("text-generation",model,{
        device:"wasm",
        dtype:"q4",
        progress_callback
      });
    }
    showAI("AI Tutor ready ✓","good");
    return aiGenerator;
  }catch(err){
    console.error("AI Tutor load failed:",err);
    showAI("AI Tutor could not load. Open DevTools → Console for the exact error, then try again.","bad");
    return null;
  }finally{aiLoading=false}
}
async function askAITutor(){
  const q=current.questions[index],selected=answers[index];
  if(selected===null){showAI("Choose an answer first, then ask the AI tutor.","bad");return}
  const button=document.getElementById("ai-button");
  if(button){button.disabled=true;button.textContent="Thinking…"}
  const gen=await getAITutor();
  if(!gen){if(button){button.disabled=false;button.textContent="✦ Ask AI Tutor"}return}
  const selectedText=q[4]==="Terminal"?"Kubernetes manifest submission":q[1][selected];
  const correctText=q[4]==="Terminal"?"Manifest requirements":q[1][q[2]];
  const referenceExplanation=q[3]||"";
  const messages=[
    {role:"system",content:"You are a certification tutor rewriting a verified explanation. The reference explanation is authoritative. Do not invent technical facts or discuss unrelated topics. Return exactly four short labeled lines and STOP. Use these labels: Correct answer:, Why:, Your answer:, Exam tip:. Never repeat words or phrases unnecessarily. The Exam tip must be specific to the question, not generic advice. Maximum 70 words."},
    {role:"user",content:"Question: "+q[0]+"\nLearner answer: "+selectedText+"\nCorrect answer: "+correctText+"\nVerified explanation: "+referenceExplanation+"\n\nRewrite the verified explanation for this learner. Keep the technical meaning unchanged. If the learner is wrong, explain why in one sentence. Return only the four labeled lines."}
  ];
  try{
    const out=await gen(messages,{max_new_tokens:110,temperature:.2,do_sample:true,repetition_penalty:1.2,no_repeat_ngram_size:4,return_full_text:false});
    let text="";
    if(Array.isArray(out)&&out[0]){
      const g=out[0].generated_text;
      if(Array.isArray(g)) text=g[g.length-1]?.content||"";
      else text=String(g||"");
    }
    text=cleanTutorOutput(text);
    showAI(isUsableTutorOutput(text)?text:fallbackTutorExplanation(q,selected),"good");
  }catch(err){
    console.error("AI Tutor inference failed:",err);
    showAI("The local AI model hit an error. You can continue with the built-in explanation and official reference.","bad");
  }finally{
    if(button){button.disabled=false;button.textContent="✦ Ask AI Tutor"}
  }
}
function cleanTutorOutput(text){
  return String(text||"").replace(/<\\|[^>]+\\|>/g,"").replace(/\\s+/g," ").trim();
}
function isUsableTutorOutput(text){
  if(!text || text.length<30 || text.length>700) return false;
  const lower=text.toLowerCase();
  if(!["correct answer:","why:","your answer:","exam tip:"].every(x=>lower.includes(x))) return false;
  const words=lower.match(/[a-z][a-z'-]*/g)||[];
  if(words.length<12) return false;
  const counts={};
  for(const w of words) counts[w]=(counts[w]||0)+1;
  if(Object.values(counts).some(n=>n>=8)) return false;
  return true;
}
function fallbackTutorExplanation(q,selected){
  const correct=q[4]==="Terminal"?"the required manifest":q[1][q[2]];
  const explanation=q[3]||"Review the built-in explanation for the key concept.";
  const isCorrect=selected===q[2];
  const tip=getExamTip(q,correct);
  return "Correct answer: "+correct+"\n\nWhy: "+explanation+"\n\nYour answer: "+(isCorrect?"This matches the correct concept.":"Your answer is different from the concept described by the question.")+"\n\nExam tip: "+tip;
}
function getExamTip(q,correct){
  const text=(q[0]+" "+correct).toLowerCase();
  if(text.includes("persistentvolumeclaim")||text.includes("storage requirement")) return "PVC = a request for storage; the PV is the storage resource that satisfies that request.";
  if(text.includes("service")&&text.includes("stable network")) return "Service = a stable network endpoint for a group of Pods; Pod IPs can change.";
  if(text.includes("deployment")&&text.includes("replica")) return "Deployment = manages replicated Pods and maintains the desired replica count.";
  if(text.includes("configmap")) return "ConfigMap = non-sensitive configuration data; use Secret for sensitive values.";
  if(text.includes("secret")) return "Secret = sensitive configuration such as passwords or tokens; ConfigMap is for non-sensitive data.";
  if(text.includes("networkpolicy")) return "NetworkPolicy controls which Pod traffic is allowed or denied.";
  if(text.includes("cronjob")) return "CronJob = creates Jobs on a schedule; look for recurring execution.";
  if(text.includes("job")) return "Job = runs a workload to completion rather than continuously serving traffic.";
  if(text.includes("readiness")) return "Readiness probe = whether a Pod is ready to receive traffic; liveness is about restarting an unhealthy container.";
  return "Match the resource to its responsibility: ask what the object is designed to provide or control.";
}
function showAI(msg,kind){const el=document.getElementById("ai-tutor");if(el){el.className="ai-tutor "+kind;el.innerHTML="<strong>✦ AI Tutor</strong><p>"+escapeHtml(msg)+"</p>"}}
function choose(i){answers[index]=i;render()}
function next(){if(answers[index]===null){alert("Please choose an answer first.");return}if(index<current.questions.length-1){index++;render()}else finish()}
function finish(){if(attemptSaved)return;clearInterval(timerId);recordAttempt();const correct=answers.reduce((n,a,i)=>n+(a===current.questions[i][2]?1:0),0);const pct=Math.round(correct/current.questions.length*100);document.getElementById("progress-bar").style.width="100%";document.getElementById("score-live").textContent=`${correct}/${current.questions.length} correct`;document.getElementById("question").innerHTML=`<div class="result"><div class="eyebrow">MOCK EXAM COMPLETE</div><div class="result-score">${pct}%</div><p>You got <strong>${correct} of ${current.questions.length}</strong> questions correct.</p></div>`;document.getElementById("options").innerHTML=`<div class="review">${current.questions.map((q,i)=>{const ok=answers[i]===q[2],ref=[q[8],q[7]];return `<div class="review-item"><strong>Q${i+1}. ${escapeHtml(q[0])}</strong><p class="${ok?"correct":"incorrect"}">${ok?"✓ Correct":"✗ Incorrect"} · Your answer: ${answers[i]===null?"Not answered":(q[4]==="Terminal"?"Manifest submission":escapeHtml(q[1][answers[i]]))}</p><p><strong>Correct answer:</strong> ${escapeHtml(q[1][q[2]])}</p><div class="answer-explanation"><strong>Why this answer?</strong><p>${escapeHtml(q[3])}</p></div><div class="question-reference"><strong>📚 Reference</strong><p><a href="${ref[1]}" target="_blank" rel="noopener noreferrer">${escapeHtml(ref[0])} ↗</a></p></div></div>`}).join("")}</div>`;document.getElementById("next-button").textContent="Retake exam";document.getElementById("next-button").onclick=()=>start(currentKey,current.difficulty,current.type)}
function backToCerts(){clearInterval(timerId);document.getElementById("practice").hidden=true;cards.hidden=false;document.getElementById("next-button").onclick=next}
loadExamBank().then(()=>{buildCards();renderDashboard()}).catch(()=>{});

function getState(){
  try{return JSON.parse(localStorage.getItem("certpulse-state")||'{"attempts":[]}')}catch(e){return {attempts:[]}}
}
function saveState(s){localStorage.setItem("certpulse-state",JSON.stringify(s))}
function renderDashboard(){
  if(!dashboard)return;
  const s=getState(), attempts=s.attempts||[];
  const total=attempts.reduce((n,a)=>n+(a.questions?.length||0),0);
  const correct=attempts.reduce((n,a)=>n+(a.correct||0),0);
  const avg=attempts.length?Math.round(attempts.reduce((n,a)=>n+a.score,0)/attempts.length):0;
  const domains={};
  attempts.flatMap(a=>a.questions||[]).forEach(q=>{
    if(!domains[q.domain])domains[q.domain]={correct:0,total:0};
    domains[q.domain].total++;
    if(q.correct)domains[q.domain].correct++;
  });
  const rows=Object.entries(domains).sort((a,b)=>a[1].correct/a[1].total-b[1].correct/b[1].total).slice(0,8);
  const weak=rows[0]?.[0]||"your next concept";
  const recent=attempts.slice(-4).reverse();
  dashboard.innerHTML='<div class="dashboard-head"><div><div class="eyebrow">YOUR LEARNING LOOP</div><h2>Know what to practice next.</h2><p>CertPulse uses your mistakes, domains and question history to shape the next mock.</p></div><button class="ghost-button" onclick="resetProgress()">Reset progress</button></div>'+
  '<div class="stats-grid"><div class="stat-card"><span>Attempts</span><strong>'+attempts.length+'</strong></div><div class="stat-card"><span>Questions</span><strong>'+total+'</strong></div><div class="stat-card"><span>Avg score</span><strong>'+avg+'%</strong></div><div class="stat-card"><span>Accuracy</span><strong>'+(total?Math.round(correct/total*100):0)+'%</strong></div></div>'+
  '<div class="dashboard-grid"><div class="dashboard-panel"><div class="panel-title">Knowledge map</div>'+
  (rows.length?rows.map(([d,v])=>{const p=Math.round(v.correct/v.total*100);return '<div class="domain-row"><div><span>'+escapeHtml(d)+'</span><strong>'+p+'%</strong></div><small>'+v.total+' answered</small><div class="mini-track"><i style="width:'+p+'%"></i></div></div>'}).join(""):'<div class="empty-state">Complete a mock to build your knowledge map.</div>')+
  '</div><div class="dashboard-panel"><div class="panel-title">Next recommended</div><div class="recommend-card"><span class="recommend-kicker">ADAPTIVE PRACTICE</span><strong>Focus on '+escapeHtml(weak)+'</strong><p>'+ (rows.length?'Your weakest tracked domain gets extra weight.':'Take your first mock and CertPulse will start learning.')+'</p><button class="start-button" onclick="startRecommended()">Start adaptive →</button></div><div class="panel-title recent-title">Recent attempts</div>'+
  (recent.length?recent.map(a=>'<div class="attempt-row"><div><strong>'+escapeHtml(a.certification)+'</strong><small>'+new Date(a.date).toLocaleDateString()+' · '+a.questions.length+' questions</small></div><b>'+a.score+'%</b></div>').join(""):'<div class="empty-state">No attempts yet.</div>')+
  '</div></div>';
}
function resetProgress(){if(confirm("Reset all CertPulse learning progress on this browser?")){localStorage.removeItem("certpulse-state");renderDashboard()}}
function learnerStats(cert){
  const qs=getState().attempts.filter(a=>a.certification===cert).flatMap(a=>a.questions||[]);
  const d={};qs.forEach(q=>{if(!d[q.domain])d[q.domain]={c:0,t:0};d[q.domain].t++;if(q.correct)d[q.domain].c++});
  return d;
}
function adaptiveQuestions(k,count){
  const all=exams[k].questions.slice();
  const stats=learnerStats(k);
  return all.map(q=>({q,w:stats[q[6]]?1+(1-stats[q[6]].c/stats[q[6]].t)*4:1.25})).sort((a,b)=>b.w-a.w||Math.random()-.5).map(x=>x.q).slice(0,count);
}
function startAdaptive(k){
  attemptSaved=false;currentKey=k;current={...exams[k],difficulty:"Adaptive",type:"Adaptive",questions:adaptiveQuestions(k,20)};
  index=0;answers=Array(current.questions.length).fill(null);seconds=2700;cards.hidden=true;dashboard.hidden=true;document.getElementById("practice").hidden=false;document.getElementById("next-button").onclick=next;startTimer();render();
}
function startRecommended(){
  const keys=Object.keys(exams);if(!keys.length)return;
  const attempts=getState().attempts;
  const k=keys.sort((a,b)=>attempts.filter(x=>x.certification===a).length-attempts.filter(x=>x.certification===b).length)[0];
  startAdaptive(k);
}
function buildCards(){
  cards.innerHTML=Object.entries(exams).map(([k,e])=>'<article class="cert-card"><div class="card-top"><span class="cert-code">'+k+'</span><span class="bank-count">'+e.questions.length+' questions</span></div><h2>'+escapeHtml(e.name)+'</h2><p>Adaptive mocks, scenarios, architecture questions and hands-on terminal tasks.</p><div class="exam-settings"><label>Difficulty<select id="difficulty-'+k+'"><option value="Any">Any</option><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option></select></label><label>Question style<select id="type-'+k+'"><option value="Any">Any</option><option value="MCQ">MCQ</option><option value="Scenario">Scenario</option><option value="Terminal">Terminal</option><option value="Architecture">Architecture</option><option value="Troubleshooting">Troubleshooting</option></select></label></div><div class="card-actions"><button class="start-button secondary-start" onclick="start('+JSON.stringify(k)+',document.getElementById(\'difficulty-'+k+'\').value,document.getElementById(\'type-'+k+'\').value)">Custom mock</button><button class="start-button" onclick="startAdaptive('+JSON.stringify(k)+')">Adaptive mock →</button></div></article>').join("");
}
function recordAttempt(){
  if(attemptSaved)return;
  const correct=answers.reduce((n,a,i)=>n+(a===current.questions[i][2]?1:0),0);
  const s=getState();s.attempts.push({date:new Date().toISOString(),certification:currentKey,score:Math.round(correct/current.questions.length*100),correct,questions:current.questions.map((q,i)=>({id:q[10],domain:q[6],type:q[4],difficulty:q[5],correct:answers[i]===q[2]}))});s.attempts=s.attempts.slice(-50);saveState(s);attemptSaved=true;renderDashboard();
}
function choose(i){answers[index]=i;render();if(answers[index]!==current.questions[index][2]){const box=document.getElementById("ai-tutor");if(box)box.insertAdjacentHTML("beforeend",'<button class="similar-button" onclick="practiceSimilar()">↻ Practice this concept</button>')}}
function practiceSimilar(){
  const q=current.questions[index],pool=exams[currentKey].questions.filter(x=>x[6]===q[6]&&x[10]!==q[10]);
  if(!pool.length)return;
  current={...current,difficulty:"Focused",type:"Adaptive",questions:pool.sort(()=>Math.random()-.5).slice(0,5)};index=0;answers=Array(5).fill(null);seconds=900;startTimer();render();
}
