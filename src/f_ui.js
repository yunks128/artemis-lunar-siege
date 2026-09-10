/* ---------------- DOM helpers ---------------- */
const $ = id => document.getElementById(id);
const LAYERS = ["menu","manual","levelup","quiz","pause","over","ranks"];
function show(id){
  LAYERS.forEach(l=>$(l).classList.toggle("on", l===id));
  $("hud").classList.toggle("on", id===null || id==="levelup" || id==="quiz" || id==="pause");
  $("lang").classList.toggle("hidden", id===null || id==="levelup" || id==="quiz");
  $("foot").classList.toggle("hidden", id===null || id==="levelup" || id==="quiz" || id==="pause");
}
function fmt(s){ s=Math.max(0,Math.floor(s)); return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0"); }

/* ---------------- language ---------------- */
function applyLang(){
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i]").forEach(el=>{ el.innerHTML = t(el.dataset.i); });
  $("man-ctl").innerHTML = t("man_ctl").map(x=>"<li>"+x+"</li>").join("");
  $("man-tip").innerHTML = t("man_tip").map(x=>"<li>"+x+"</li>").join("");
  $("man-lore").innerHTML = t("man_lore").map(x=>"<li>"+x+"</li>").join("");
  $("man-wep").innerHTML = Object.keys(WEAPONS).map(k=>{
    const w=WEAPONS[k];
    return "<div class='wk'><div class='g'>"+w.g+"</div><div><div class='t'>"+t(w.n)+"</div><div class='d'>"+t(w.d)+"</div></div></div>";
  }).join("");
  $("foot").innerHTML = LANG==="en"
    ? "ARTEMIS: LUNAR SIEGE · original work · MIT licensed"
    : "ARTEMIS: LUNAR SIEGE · 오리지널 작품 · MIT 라이선스";
  document.querySelectorAll("#lang button").forEach(b=>b.classList.toggle("sel", b.dataset.l===LANG));
  if(MODE==="levelup") renderCards();
  if(MODE==="quiz" && QZ){ renderQuiz(); if(QZ.done) replayQuizAnswer(); }
  if(MODE==="over") renderOver();
  if(MODE==="ranks") renderRanks();
  if(RUNNING) syncHUD();
}
document.querySelectorAll("#lang button").forEach(b=>{
  b.onclick=()=>{ LANG=b.dataset.l; applyLang(); };
});

/* ---------------- HUD ---------------- */
function syncHUD(){
  const p=G.p, b=G.base;
  const shown = G.monSpawned ? G.t : Math.min(G.t,RUN_TIME);
  $("clock").textContent = fmt(shown);
  $("clock").classList.toggle("warn", G.t>=540);
  $("phase").textContent = t(phaseKey());
  const bp = Math.max(0,b.hp/b.max);
  $("basefill").style.width = (bp*100)+"%";
  $("basefill").classList.toggle("hurt", bp<0.35);
  $("basepct").textContent = Math.ceil(bp*100)+"%";
  const hf=$("hpfill"); const hr=Math.max(0,p.hp/p.max);
  hf.style.width=(hr*100)+"%"; hf.classList.toggle("low",hr<0.3);
  $("xpfill").style.width = (p.xp/p.need*100)+"%";
  $("lvv").textContent = p.lv;
  $("klv").textContent = G.kills;
  const bb=$("bossbar");
  if(G.boss){ bb.classList.add("on");
    $("bossname").textContent=t(G.boss.name);
    $("bossfill").style.width=Math.max(0,G.boss.hp/G.boss.max*100)+"%";
  } else bb.classList.remove("on");
  // loadout chips
  let html="";
  for(const id in G.weapons){ const w=G.weapons[id], d=WEAPONS[id];
    html+="<div class='chip"+(w.leg?" leg":"")+"'><span class='g'>"+(w.leg?d.L.g:d.g)+"</span><span class='lv'>"+(w.leg?"★":w.lv)+"</span></div>"; }
  for(const id in G.passives){ const d=PASSIVES[id];
    html+="<div class='chip'><span class='g'>"+d.g+"</span><span class='lv'>"+G.passives[id]+"</span></div>"; }
  $("loadout").innerHTML=html;
}

/* ---------------- level up cards ---------------- */
let CARDS=[];
function buildCards(){
  const pool=[], wKeys=Object.keys(G.weapons), pKeys=Object.keys(G.passives);
  // legendary first (always offered when available)
  for(const id of wKeys){
    const w=G.weapons[id];
    if(!w.leg && w.lv>=WMAX && (G.passives[WEAPONS[id].pair]||0)>=3){
      pool.push({k:"leg",id:id,pri:1});
    }
  }
  for(const id of wKeys){ const w=G.weapons[id]; if(!w.leg && w.lv<WMAX) pool.push({k:"wup",id:id}); }
  if(wKeys.length<5) for(const id in WEAPONS){ if(!G.weapons[id]) pool.push({k:"wnew",id:id}); }
  for(const id of pKeys){ if(G.passives[id]<PMAX) pool.push({k:"pup",id:id}); }
  if(pKeys.length<6) for(const id in PASSIVES){ if(!(id in G.passives)) pool.push({k:"pnew",id:id}); }
  const legs=pool.filter(x=>x.k==="leg"), rest=shuffle(pool.filter(x=>x.k!=="leg"));
  let out=legs.slice(0,1).concat(rest).slice(0,3);
  while(out.length<3){
    out.push(Math.random()<0.5?{k:"srep"}:{k:"sbase"});
  }
  return out;
}
function cardView(c){
  if(c.k==="leg"){ const d=WEAPONS[c.id];
    return {cls:"leg",g:d.L.g,kind:t("kind_leg"),nm:t(d.L.n),ds:t(d.L.d),to:t("to_max")}; }
  if(c.k==="wup"){ const d=WEAPONS[c.id], w=G.weapons[c.id];
    return {cls:"",g:d.g,kind:t("kind_up"),nm:t(d.n),ds:t(d.d),to:t("to_lv",{a:w.lv,b:w.lv+1})}; }
  if(c.k==="wnew"){ const d=WEAPONS[c.id];
    return {cls:"new",g:d.g,kind:t("kind_new"),nm:t(d.n),ds:t(d.d),to:t("to_new")}; }
  if(c.k==="pup"){ const d=PASSIVES[c.id], lv=G.passives[c.id];
    return {cls:"",g:d.g,kind:t("kind_up"),nm:t(d.n),ds:t(d.d),to:t("to_lv",{a:lv,b:lv+1})}; }
  if(c.k==="pnew"){ const d=PASSIVES[c.id];
    return {cls:"new",g:d.g,kind:t("kind_new"),nm:t(d.n),ds:t(d.d),to:t("to_new")}; }
  if(c.k==="srep") return {cls:"heal",g:"✚",kind:t("kind_sup"),nm:t("s_repair_n"),ds:t("s_repair_d"),to:""};
  return {cls:"heal",g:"⌂",kind:t("kind_sup"),nm:t("s_base_n"),ds:t("s_base_d"),to:""};
}
function renderCards(){
  $("lu-h").textContent = t("lu_head",{n:G.p.lv});
  $("cards").innerHTML = CARDS.map((c,i)=>{
    const v=cardView(c);
    return "<div class='card "+v.cls+"' data-k='"+i+"'><div class='key'>"+(i+1)+"</div>"+
      "<div class='glyph'>"+v.g+"</div><div class='kind'>"+v.kind+"</div>"+
      "<div class='nm'>"+v.nm+"</div><div class='ds'>"+v.ds+"</div>"+
      (v.to?"<div class='to'>"+v.to+"</div>":"")+"</div>";
  }).join("");
  $("cards").querySelectorAll(".card").forEach(el=>{ el.onclick=()=>chooseCard(+el.dataset.k); });
}
function openLevelUp(){
  MODE="levelup"; PAUSED=true; SFX.lv();
  if(quizDue()){ openQuiz(); return; }
  CARDS=buildCards(); renderCards(); show("levelup");
}
function chooseCard(i){
  if(MODE!=="levelup") return;
  const c=CARDS[i]; if(!c) return;
  if(c.k==="leg"){ G.weapons[c.id].leg=true; }
  else if(c.k==="wup"){ G.weapons[c.id].lv++; }
  else if(c.k==="wnew"){ addWeapon(c.id); }
  else if(c.k==="pup"){ G.passives[c.id]++; }
  else if(c.k==="pnew"){ G.passives[c.id]=1; if(c.id==="core") G.p.hp+=30; }
  else if(c.k==="srep"){ G.p.hp=Math.min(G.p.max,G.p.hp+70); }
  else if(c.k==="sbase"){ G.base.hp=Math.min(G.base.max,G.base.hp+G.base.max*0.25); }
  if(c.k==="pup"&&c.id==="core") G.p.hp+=30;
  recalc();
  beep(660,0.1,"triangle",0.04,880);
  G.pendingLv--;
  if(G.pendingLv>0){ CARDS=buildCards(); renderCards(); return; }
  MODE="play"; PAUSED=false; show(null); syncHUD();
}

/* ---------------- Artemis dossier quiz ----------------
   Sometimes a level-up opens with a question instead. Answer it right and the
   uplink grants a second module pick on top of the level you already earned. */
let QZ=null;
function quizDue(){
  return G.p.lv>=3 && G.quizPool.length>0 && Math.random()<0.5;
}
function openQuiz(){
  MODE="quiz"; PAUSED=true;
  QZ={ i:G.quizPool.pop(), done:false };
  QZ.order=shuffle(QUIZ[QZ.i].a.map((_,n)=>n));
  renderQuiz(); show("quiz");
  beep(880,0.09,"triangle",0.04,1180);
}
function renderQuiz(){
  const q=QUIZ[QZ.i];
  $("qz-h").textContent=t("qz_head");
  $("qz-s").textContent=t("qz_sub");
  $("qz-q").textContent=q.q[LANG];
  $("qz-a").innerHTML=QZ.order.map((n,i)=>
    "<button class='qa' data-n='"+n+"'><span class='qk'>"+(i+1)+"</span>"+q.a[n][LANG]+"</button>").join("");
  $("qz-a").querySelectorAll(".qa").forEach(el=>{ el.onclick=()=>answerQuiz(+el.dataset.n); });
  $("qz-f").className="qz-f";
  $("qz-f").innerHTML="";
  $("qz-next").classList.add("hidden");
  $("qz-next").textContent=t("qz_next");
}
function answerQuiz(n){
  if(MODE!=="quiz"||!QZ||QZ.done) return;
  const q=QUIZ[QZ.i], ok=(n===q.c);
  QZ.done=true; QZ.ok=ok; QZ.pick=n;
  $("qz-a").querySelectorAll(".qa").forEach(el=>{
    const v=+el.dataset.n;
    el.classList.add(v===q.c?"ok":(v===n?"no":"mute"));
    el.onclick=null;
  });
  if(ok){ G.quizRight++; G.pendingLv++; SFX.lv(); }
  else { G.quizWrong++; beep(170,0.24,"sawtooth",0.045,80); }
  $("qz-f").className="qz-f on "+(ok?"ok":"no");
  $("qz-f").innerHTML="<div class='v'>"+t(ok?"qz_ok":"qz_no")+"</div>"+
                      "<div class='x'>"+q.f[LANG]+"</div>";
  $("qz-next").classList.remove("hidden");
}
function replayQuizAnswer(){
  // language switched mid-question: rebuild the answered state without re-scoring
  const q=QUIZ[QZ.i];
  $("qz-a").querySelectorAll(".qa").forEach(el=>{
    const v=+el.dataset.n;
    el.classList.add(v===q.c?"ok":(v===QZ.pick?"no":"mute"));
    el.onclick=null;
  });
  $("qz-f").className="qz-f on "+(QZ.ok?"ok":"no");
  $("qz-f").innerHTML="<div class='v'>"+t(QZ.ok?"qz_ok":"qz_no")+"</div>"+
                      "<div class='x'>"+q.f[LANG]+"</div>";
  $("qz-next").classList.remove("hidden");
}
function closeQuiz(){
  if(MODE!=="quiz"||!QZ||!QZ.done) return;
  QZ=null;
  MODE="levelup"; CARDS=buildCards(); renderCards(); show("levelup");
}

/* ---------------- flow ---------------- */
function startGame(){
  newGame(); recalc();
  RUNNING=true; PAUSED=false; MODE="play"; G.pendingLv=0;
  show(null); syncHUD(); banner("ph_1");
  beep(440,0.12,"triangle",0.05,660);
}
function togglePause(){
  if(MODE==="play"){ MODE="pause"; PAUSED=true; show("pause"); }
  else if(MODE==="pause"){ MODE="play"; PAUSED=false; show(null); }
}
function finish(kind){
  if(G.end) return;
  G.end=kind; RUNNING=false; PAUSED=true; MODE="over";
  if(kind==="win") SFX.win(); else SFX.lose();
  RANK_SAVED=false; RANK_NEW=null;
  $("rk-row").classList.remove("hidden"); $("rk-note").classList.add("hidden");
  $("rk-name").value = lastName();
  renderOver(); show("over");
}
function renderOver(){
  const win=G.end==="win";
  $("res-t").textContent = win?t("win_t"):(G.end==="lose_p"?t("lose_p"):t("lose_b"));
  $("res-t").className = "res-t "+(win?"win":"lose");
  $("res-s").textContent = win?t("win_s"):(G.end==="lose_p"?t("lose_ps"):t("lose_bs"));
  $("r-time").textContent = fmt(Math.min(G.t,RUN_TIME));
  $("r-kills").textContent = G.kills;
  $("r-level").textContent = G.p.lv;
  $("r-base").textContent = Math.max(0,Math.ceil(G.base.hp/G.base.max*100))+"%";
  const asked=G.quizRight+G.quizWrong;
  $("r-quiz").textContent = asked ? G.quizRight+"/"+asked : "—";
  $("r-score").textContent = scoreRun().toLocaleString();
  $("rk-save").textContent = t("rk_save");
  $("rk-name").placeholder = t("rk_ph");
}

$("btn-start").onclick = startGame;
$("btn-again").onclick = startGame;
$("btn-manual").onclick = ()=>{ MODE="manual"; show("manual"); };
$("btn-manual-back").onclick = ()=>{ MODE="menu"; show("menu"); };
$("btn-resume").onclick = togglePause;
$("btn-quit").onclick = ()=>{ RUNNING=false; MODE="menu"; show("menu"); };
$("qz-next").onclick = closeQuiz;
$("rk-save").onclick = submitScore;
$("rk-name").onkeydown = e=>{ if(e.key==="Enter"){ e.preventDefault(); submitScore(); } };
$("btn-ranks").onclick = ()=>openRanks("menu");
$("btn-ranks-over").onclick = ()=>openRanks("over");
$("rk-back").onclick = closeRanks;
$("rk-clear").onclick = clearRanks;
$("btn-menu").onclick = ()=>{ MODE="menu"; show("menu"); };
$("pausebtn").onclick = togglePause;
document.addEventListener("visibilitychange",()=>{ if(document.hidden && MODE==="play") togglePause(); });

/* ---------------- rankings ----------------
   Scores live in this browser's localStorage — there is no server behind the
   static site, so a board is per-device. Every read/write is guarded: private
   windows and blocked site data make localStorage throw rather than return null. */
const RANK_KEY="artemis.scores.v2", RANK_NAME_KEY="artemis.lastname", RANK_MAX=25;
function scoreRun(){
  const secs=Math.min(G.t,RUN_TIME), win=G.end==="win";
  return Math.round(
      secs*10                                   // time held
    + G.kills*5                                 // hostiles cleared
    + G.p.lv*25                                 // uplink level
    + Math.max(0,G.base.hp/G.base.max)*100*10   // base left standing
    + G.quizRight*50                            // dossier answers
    + (win?3000:0));                            // mission complete
}
function loadRanks(){
  try{
    const raw=localStorage.getItem(RANK_KEY);
    const a=raw?JSON.parse(raw):[];
    return Array.isArray(a)?a.filter(x=>x&&typeof x.score==="number"):[];
  }catch(e){ return []; }
}
function saveRanks(a){
  try{ localStorage.setItem(RANK_KEY,JSON.stringify(a.slice(0,RANK_MAX))); return true; }
  catch(e){ return false; }
}
function lastName(){ try{ return localStorage.getItem(RANK_NAME_KEY)||""; }catch(e){ return ""; } }
function submitScore(){
  if(RANK_SAVED) return;
  const el=$("rk-name");
  const nm=(el.value||"").trim().slice(0,14) || t("rk_anon");
  try{ localStorage.setItem(RANK_NAME_KEY,nm); }catch(e){}
  const entry={ name:nm, score:scoreRun(), t:Math.round(Math.min(G.t,RUN_TIME)), kills:G.kills,
                lv:G.p.lv, base:Math.max(0,Math.round(G.base.hp/G.base.max*100)),
                quiz:G.quizRight, win:G.end==="win", at:Date.now(), id:Math.random().toString(36).slice(2) };
  const all=loadRanks().concat([entry]).sort((a,b)=>b.score-a.score);
  const stored=saveRanks(all);
  RANK_SAVED=true; RANK_NEW=entry.id;
  $("rk-row").classList.add("hidden");
  $("rk-note").textContent = stored ? t("rk_saved",{n:entry.name}) : t("rk_nostore");
  $("rk-note").classList.remove("hidden");
  beep(760,0.12,"triangle",0.05,1020);
  openRanks("over");
}
let RANK_SAVED=false, RANK_NEW=null, RANK_BACK="menu";
function openRanks(from){
  RANK_BACK=from||"menu"; MODE="ranks";
  renderRanks(); show("ranks");
}
function renderRanks(){
  $("rk-h").textContent=t("rk_title");
  $("rk-back").textContent=t("btn_back");
  const all=loadRanks();
  $("rk-clear").classList.toggle("hidden", all.length===0);
  $("rk-clear").textContent=t("rk_clear");
  if(!all.length){ $("rk-list").innerHTML="<div class='rk-empty'>"+t("rk_empty")+"</div>"; return; }
  $("rk-list").innerHTML =
    "<div class='rk-r rk-head'><span class='p'>#</span><span class='n'>"+t("rk_name")+"</span>"+
      "<span class='c'>"+t("rk_time")+"</span><span class='c'>"+t("rk_kills")+"</span>"+
      "<span class='c'>"+t("rk_lv")+"</span><span class='c'>"+t("rk_quiz")+"</span>"+
      "<span class='s'>"+t("rk_score")+"</span></div>" +
    all.map((e,i)=>
      "<div class='rk-r"+(e.id===RANK_NEW?" me":"")+(e.win?" win":"")+"'>"+
        "<span class='p'>"+(i+1)+"</span>"+
        "<span class='n'>"+esc(e.name)+(e.win?"<b class='wtag'>"+t("rk_held")+"</b>":"")+"</span>"+
        "<span class='c'>"+fmt(e.t)+"</span><span class='c'>"+e.kills+"</span>"+
        "<span class='c'>"+e.lv+"</span><span class='c'>"+(e.quiz||0)+"</span>"+
        "<span class='s'>"+e.score.toLocaleString()+"</span></div>").join("");
}
function esc(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function clearRanks(){
  if(!$("rk-clear").classList.contains("armed")){
    $("rk-clear").classList.add("armed"); $("rk-clear").textContent=t("rk_sure"); return;
  }
  try{ localStorage.removeItem(RANK_KEY); }catch(e){}
  RANK_NEW=null; $("rk-clear").classList.remove("armed"); renderRanks();
}
function closeRanks(){
  if(RANK_BACK==="over"){ MODE="over"; show("over"); }
  else { MODE="menu"; show("menu"); }
}

/* ---------------- loop ---------------- */
let last=performance.now(), hudT=0;
function frame(now){
  requestAnimationFrame(frame);
  let dt=(now-last)/1000; last=now;
  if(dt>0.05) dt=0.05;
  if(RUNNING && !PAUSED && G && !G.end){
    update(dt);
    hudT-=dt; if(hudT<=0){ hudT=0.08; syncHUD(); }
  }
  if(G) render();
  else idleRender();
}
function idleRender(){
  cx.fillStyle="#07090f"; cx.fillRect(0,0,W,H);
  const tt=performance.now()/1000;
  for(const s of STARS){
    cx.globalAlpha=0.18+0.32*Math.abs(Math.sin(tt*0.6+s.t));
    cx.fillStyle="#9fb4cc"; cx.fillRect(s.x*W,s.y*H,s.s,s.s);
  }
  cx.globalAlpha=1;
  // slow lunar horizon arc
  cx.strokeStyle="rgba(74,163,255,.10)"; cx.lineWidth=2;
  cx.beginPath(); cx.arc(W/2,H*1.65,Math.max(W,H)*0.85,Math.PI*1.15,Math.PI*1.85); cx.stroke();
}
applyLang(); show("menu"); requestAnimationFrame(frame);
