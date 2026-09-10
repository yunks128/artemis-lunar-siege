/* ---------------- canvas ---------------- */
const cv=document.getElementById("c"), cx=cv.getContext("2d",{alpha:false});
let W=0,H=0,DPR=1,ZOOM=1;
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  W=window.innerWidth; H=window.innerHeight;
  cv.width=Math.round(W*DPR); cv.height=Math.round(H*DPR);
  cv.style.width=W+"px"; cv.style.height=H+"px";
  cx.setTransform(DPR,0,0,DPR,0,0);
  ZOOM = clamp(Math.min(W,H)/620, 1, 1.45);
}
window.addEventListener("resize",resize); resize();

/* ---------------- state ---------------- */
let G=null, RUNNING=false, PAUSED=false, MODE="menu";
const CRATERS=[], STARS=[];
for(let i=0;i<70;i++) CRATERS.push({x:rnd(-WORLD,WORLD),y:rnd(-WORLD,WORLD),r:rnd(18,95),a:rnd(0,TAU)});
for(let i=0;i<160;i++) STARS.push({x:Math.random(),y:Math.random(),s:rnd(.4,1.5),t:rnd(0,TAU)});

function newGame(){
  G={
    t:0, spawnT:0, kills:0, shake:0, flash:0,
    base:{hp:140,max:140},
    p:{x:0,y:170,vx:0,vy:0,r:13,hp:130,max:130,spd:184,lv:1,xp:0,need:7,
       inv:0,face:-Math.PI/2,dmg:1,area:1,cd:1,mag:88,armor:0,regen:0,walk:0},
    weapons:{}, passives:{},
    E:[], B:[], EB:[], orbs:[], mines:[], fx:[], beams:[], shocks:[],
    drones:0, droneA:0,
    quizPool:shuffle(QUIZ.map((_,i)=>i)), quizRight:0, quizWrong:0,
    boss:null, harvDone:false, monarchDone:false, monSpawned:false,
    phase:"", phaseT:0, banner:"", bannerT:0, end:null
  };
  addWeapon("rifle");
}
function addWeapon(id){ G.weapons[id]={lv:1,t:0,leg:false}; }

/* ---------------- stats ---------------- */
function recalc(){
  const p=G.p, pa=G.passives;
  const L=k=>pa[k]||0;
  p.spd = 184*(1+0.17*L("boots"));
  p.max = 130 + 30*L("core");
  p.mag = 88*(1+0.46*L("mag"));
  p.cd  = Math.max(0.32, 1-0.13*L("cool"));
  p.dmg = 1+0.21*L("amp");
  p.armor = Math.min(0.6, 0.13*L("plate"));
  p.area = 1+0.21*L("opt");
  p.regen = 1.2*L("nano");
  if(p.hp>p.max) p.hp=p.max;
}

/* ---------------- weapon tuning ---------------- */
function wstat(id){
  const w=G.weapons[id], lv=w.lv, p=G.p, leg=w.leg;
  switch(id){
    case "rifle": return {cd:Math.max(.11,(.56-.045*lv)*p.cd*(leg?.75:1)), dmg:(13+4.8*lv)*(leg?2.8:1)*p.dmg,
      n:1+Math.floor(lv/2)+(leg?2:0), pierce:leg?99:Math.floor(lv/3), sp:600+20*lv, rad:(leg?8:6)*p.area};
    case "drone": return {count:Math.min(9,2+Math.floor((lv+1)/2)+(leg?2:0)), dmg:(9+3.4*lv)*(leg?2.4:1)*p.dmg,
      rad:(68+6.5*lv)*p.area, rot:(2.4+.09*lv)*(leg?1.4:1), size:(10+.9*lv)*p.area, burn:leg};
    case "mine":  return {cd:Math.max(.40,(1.75-.15*lv)*p.cd), dmg:(26+11*lv)*(leg?2.0:1)*p.dmg,
      rad:(58+6*lv)*p.area, chain:leg};
    case "lance": return {cd:Math.max(.55,(2.25-.19*lv)*p.cd), dmg:(32+14*lv)*p.dmg,
      w:(15+2.6*lv)*p.area, len:(450+28*lv)*p.area, beams:leg?4:(lv>=5?2:1), spin:leg};
    case "nova":  return {cd:Math.max(.80,(2.9-.21*lv)*p.cd), dmg:(20+9.5*lv)*(leg?1.9:1)*p.dmg,
      rad:(115+18*lv)*p.area, pull:leg};
  }
}

/* ---------------- spawning ---------------- */
function scale(){ return 1 + G.t/110 + Math.pow(G.t/380,1.7); }
function spawnPos(){
  const a=Math.random()*TAU, d=Math.max(W,H)/ZOOM*0.62+rnd(60,220);
  return {x:clamp(G.p.x+Math.cos(a)*d,-WORLD,WORLD), y:clamp(G.p.y+Math.sin(a)*d,-WORLD,WORLD)};
}
function mkEnemy(type,pos,mult){
  const d=ETYPE[type], s=scale()*(mult||1), P=pos||spawnPos();
  const toBase = Math.random()<0.34;
  G.E.push({x:P.x,y:P.y,r:d.r,type:type,c:d.c,shape:d.shape,ranged:!!d.ranged,
    hp:d.hp*s, max:d.hp*s, spd:d.spd*(1+Math.min(.45,G.t/1400))*rnd(.9,1.1),
    dmg:d.dmg*(1+G.t/900), xp:d.xp, kx:0,ky:0, hit:0, at:rnd(0,2), burn:0, a:rnd(0,TAU),
    sd:rnd(0,TAU), walk:rnd(0,TAU), bob:rnd(0,TAU),
    target:toBase?"base":"player", boss:false});
}
function spawnWave(dt){
  if(G.boss && G.boss.kind==="monarch") { G.spawnT-=dt; if(G.spawnT<=0){G.spawnT=2.2; for(let i=0;i<4;i++) mkEnemy("skitter");} return; }
  G.spawnT -= dt;
  const rate = clamp(1.15 - G.t/780, 0.20, 1.15);
  if(G.spawnT>0) return;
  G.spawnT = rate;
  const T=G.t, pool=["crawler"];
  if(T>70) pool.push("skitter");
  if(T>160) pool.push("skitter","crawler");
  if(T>250) pool.push("drifter");
  if(T>330) pool.push("spitter");
  if(T>420) pool.push("hulk","drifter");
  if(T>620) pool.push("hulk","spitter","drifter");
  const n = 1 + Math.floor(T/210) + (Math.random()<0.3?1:0);
  for(let i=0;i<n;i++){ if(G.E.length<420) mkEnemy(pick(pool)); }
  // packs
  if(T>120 && Math.random()<0.16){
    const P=spawnPos(), tp = T>420?"skitter":"crawler";
    for(let i=0;i<8;i++) mkEnemy(tp,{x:P.x+rnd(-46,46),y:P.y+rnd(-46,46)});
  }
}
function spawnBoss(kind){
  const P=spawnPos();
  const hp = kind==="harvester" ? 1800*(1+G.t/1200) : 8000;
  G.boss={kind:kind, x:P.x,y:P.y, r:kind==="harvester"?42:58,
    hp:hp, max:hp, spd:kind==="harvester"?52:44, hit:0, at:2, ct:4, dash:0, ang:0, phase:1,
    name:kind==="harvester"?"boss_harvester":"boss_monarch"};
  G.shake=18; SFX.boss();
  banner(kind==="harvester"?"ph_4":"ph_6");
}
function banner(k){ G.banner=k; G.bannerT=4; }

/* ---------------- combat helpers ---------------- */
function damageEnemy(e,amt){
  e.hp-=amt; e.hit=0.12;
  if(e.hp<=0){ killEnemy(e); return true; }
  return false;
}
function killEnemy(e){
  e.dead=true; G.kills++;
  for(let i=0;i<(e.xp>3?3:2);i++) G.fx.push({x:e.x,y:e.y,vx:rnd(-70,70),vy:rnd(-70,70),l:.35,m:.35,c:e.c,s:rnd(2,4)});
  G.orbs.push({x:e.x,y:e.y,v:e.xp,vx:rnd(-30,30),vy:rnd(-30,30),l:26});
  if(Math.random()<0.012) G.orbs.push({x:e.x,y:e.y,heal:true,vx:0,vy:0,l:22});
  if(G.kills%12===0) SFX.kill();
}
function damageBoss(amt){
  const b=G.boss; if(!b) return;
  b.hp-=amt; b.hit=0.1;
  if(b.hp<=0){
    G.shake=26; SFX.boom();
    for(let i=0;i<70;i++) G.fx.push({x:b.x,y:b.y,vx:rnd(-300,300),vy:rnd(-300,300),l:.9,m:.9,c:"#b04cff",s:rnd(2,6)});
    if(b.kind==="harvester"){
      G.harvDone=true;
      for(let i=0;i<26;i++) G.orbs.push({x:b.x+rnd(-40,40),y:b.y+rnd(-40,40),v:5,vx:rnd(-60,60),vy:rnd(-60,60),l:30});
      G.orbs.push({x:b.x,y:b.y,heal:true,vx:0,vy:0,l:40});
      G.boss=null; banner("ph_5");
    } else { G.monarchDone=true; G.boss=null; finish("win"); }
  }
}
function hitPlayer(amt){
  const p=G.p; if(p.inv>0) return;
  p.hp -= amt*(1-p.armor); p.inv=0.85; G.shake=Math.max(G.shake,7); G.flash=0.28; SFX.hurt();
  const d=document.getElementById("dmgtoast"); d.classList.add("hit"); setTimeout(()=>d.classList.remove("hit"),160);
  if(p.hp<=0){ p.hp=0; finish("lose_p"); }
}
function damageBase(amt){
  G.base.hp -= amt;
  if(G.base.hp<=0){ G.base.hp=0; finish("lose_b"); }
}
function explode(x,y,r,dmg,color,chain){
  G.shocks.push({x:x,y:y,r:0,max:r,l:.34,m:.34,c:color||"#ff8c42"});
  SFX.boom();
  for(const e of G.E){
    if(e.dead) continue;
    if(dist2(e.x,e.y,x,y) < (r+e.r)*(r+e.r)){
      const a=Math.atan2(e.y-y,e.x-x); e.kx+=Math.cos(a)*230; e.ky+=Math.sin(a)*230;
      const died = damageEnemy(e,dmg);
      if(died && chain && Math.random()<0.30) explode(e.x,e.y,r*0.72,dmg*0.55,"#ffd166",false);
    }
  }
  const b=G.boss;
  if(b && dist2(b.x,b.y,x,y) < (r+b.r)*(r+b.r)) damageBoss(dmg);
  for(let i=0;i<14;i++) G.fx.push({x:x,y:y,vx:rnd(-200,200),vy:rnd(-200,200),l:.4,m:.4,c:color||"#ff8c42",s:rnd(2,5)});
}
function nearest(x,y,maxD){
  let best=null,bd=maxD?maxD*maxD:Infinity;
  for(const e of G.E){ if(e.dead) continue; const d=dist2(e.x,e.y,x,y); if(d<bd){bd=d;best=e} }
  const b=G.boss;
  if(b){ const d=dist2(b.x,b.y,x,y); if(d<bd){bd=d;best=b} }
  return best;
}

/* ---------------- weapon firing ---------------- */
function fireWeapons(dt){
  const p=G.p;
  for(const id in G.weapons){
    const w=G.weapons[id];
    if(id==="drone") continue;
    w.t-=dt; if(w.t>0) continue;
    const s=wstat(id);
    w.t=s.cd;
    if(id==="rifle"){
      const tgt=nearest(p.x,p.y,720);
      if(!tgt){ w.t=0.12; continue; }
      const base=Math.atan2(tgt.y-p.y,tgt.x-p.x);
      for(let i=0;i<s.n;i++){
        const a = base + (i-(s.n-1)/2)*0.14;
        G.B.push({x:p.x,y:p.y,vx:Math.cos(a)*s.sp,vy:Math.sin(a)*s.sp,r:s.rad,dmg:s.dmg,
          pierce:s.pierce,l:1.5,hitSet:[],c:w.leg?"#ffd166":"#cfe6ff",leg:w.leg});
      }
      SFX.shot();
    }
    else if(id==="mine"){
      G.mines.push({x:p.x-Math.cos(p.face)*22,y:p.y-Math.sin(p.face)*22,arm:.45,l:11,
        rad:s.rad,dmg:s.dmg,chain:s.chain,pulse:0});
    }
    else if(id==="lance"){
      const tgt=nearest(p.x,p.y,900);
      const base = tgt?Math.atan2(tgt.y-p.y,tgt.x-p.x):p.face;
      for(let i=0;i<s.beams;i++){
        const a = base + i*(TAU/s.beams);
        G.beams.push({x:p.x,y:p.y,a:a,len:s.len,w:s.w,dmg:s.dmg,l:.30,m:.30,
          spin:s.spin?2.2:0,hitSet:[]});
      }
      beep(340,0.22,"sawtooth",0.03,900);
    }
    else if(id==="nova"){
      G.shocks.push({x:p.x,y:p.y,r:0,max:s.rad,l:.36,m:.36,c:w.leg?"#b04cff":"#4aa3ff",
        dmg:s.dmg,pull:s.pull,follow:true,hitSet:[]});
      beep(180,0.3,"sine",0.045,700);
    }
  }
  // orbiting drones
  const dw=G.weapons.drone;
  if(dw){
    const s=wstat("drone");
    G.droneA += s.rot*dt;
    for(let i=0;i<s.count;i++){
      const a=G.droneA + i*(TAU/s.count);
      const dx=p.x+Math.cos(a)*s.rad, dy=p.y+Math.sin(a)*s.rad;
      for(const e of G.E){
        if(e.dead||e.dcd>0) continue;
        if(dist2(e.x,e.y,dx,dy) < (s.size+e.r)*(s.size+e.r)){
          damageEnemy(e,s.dmg); e.dcd=0.32;
          if(s.burn) e.burn=Math.max(e.burn,1.6);
          const ang=Math.atan2(e.y-dy,e.x-dx); e.kx+=Math.cos(ang)*110; e.ky+=Math.sin(ang)*110;
        }
      }
      const b=G.boss;
      if(b && dist2(b.x,b.y,dx,dy)<(s.size+b.r)*(s.size+b.r)){
        if(!b.dcd||b.dcd<=0){ damageBoss(s.dmg); b.dcd=0.3; }
      }
    }
  }
}
