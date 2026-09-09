/* ---------------- input ---------------- */
const KEY={};
let touch=null;
addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  KEY[k]=true;
  if(k==="escape"||k==="p"){ if(RUNNING&&!G.end&&MODE==="play") togglePause(); }
  if(MODE==="levelup" && (k==="1"||k==="2"||k==="3")) chooseCard(+k-1);
  if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
},{passive:false});
addEventListener("keyup",e=>{KEY[e.key.toLowerCase()]=false});
addEventListener("blur",()=>{for(const k in KEY)KEY[k]=false});

cv.addEventListener("pointerdown",e=>{ touch={sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY,id:e.pointerId};
  cv.setPointerCapture(e.pointerId); });
cv.addEventListener("pointermove",e=>{ if(touch&&touch.id===e.pointerId){touch.x=e.clientX;touch.y=e.clientY;} });
const endT=e=>{ if(touch&&touch.id===e.pointerId) touch=null; };
cv.addEventListener("pointerup",endT); cv.addEventListener("pointercancel",endT);

function inputVec(){
  let ix=0,iy=0;
  if(KEY.w||KEY.arrowup) iy-=1;
  if(KEY.s||KEY.arrowdown) iy+=1;
  if(KEY.a||KEY.arrowleft) ix-=1;
  if(KEY.d||KEY.arrowright) ix+=1;
  if(touch){
    const dx=touch.x-touch.sx, dy=touch.y-touch.sy, m=Math.hypot(dx,dy);
    if(m>10){ const k=Math.min(1,m/70); ix+=dx/m*k; iy+=dy/m*k; }
  }
  const m=Math.hypot(ix,iy);
  return m>1?{x:ix/m,y:iy/m}:{x:ix,y:iy};
}

/* ---------------- separation grid ---------------- */
const CELL=44, grid=new Map();
function gkey(x,y){ return ((x/CELL)|0)+","+((y/CELL)|0); }
function buildGrid(){
  grid.clear();
  for(const e of G.E){ if(e.dead) continue; const k=gkey(e.x,e.y); let a=grid.get(k); if(!a){a=[];grid.set(k,a)} a.push(e); }
}
function separate(e){
  const gx=(e.x/CELL)|0, gy=(e.y/CELL)|0;
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){
    const a=grid.get((gx+i)+","+(gy+j)); if(!a) continue;
    for(const o of a){
      if(o===e||o.dead) continue;
      const dx=e.x-o.x, dy=e.y-o.y, rr=e.r+o.r, d2=dx*dx+dy*dy;
      if(d2>0.01 && d2<rr*rr){ const d=Math.sqrt(d2), f=(rr-d)/d*0.5; e.x+=dx*f; e.y+=dy*f; }
    }
  }
}

/* ---------------- main update ---------------- */
function update(dt){
  const p=G.p;
  G.t += dt;
  if(G.shake>0) G.shake=Math.max(0,G.shake-dt*36);
  if(G.flash>0) G.flash-=dt;
  if(G.bannerT>0) G.bannerT-=dt;

  // phase banners
  const ph=phaseKey();
  if(ph!==G.phase){ G.phase=ph; if(ph!=="ph_4"&&ph!=="ph_6") banner(ph); }

  // boss triggers
  if(!G.harvDone && !G.boss && G.t>=600 && !G.harvSpawned){ G.harvSpawned=true; spawnBoss("harvester"); }
  if(!G.monSpawned && G.t>=RUN_TIME){ G.monSpawned=true; if(G.boss){G.boss=null} spawnBoss("monarch"); }

  // player movement
  const v=inputVec();
  const acc=1500, fr=Math.pow(0.0008,dt);
  p.vx += v.x*acc*dt; p.vy += v.y*acc*dt;
  p.vx*=fr; p.vy*=fr;
  const sp=Math.hypot(p.vx,p.vy), mx=p.spd;
  if(sp>mx){ p.vx=p.vx/sp*mx; p.vy=p.vy/sp*mx; }
  p.x+=p.vx*dt; p.y+=p.vy*dt;
  p.x=clamp(p.x,-WORLD,WORLD); p.y=clamp(p.y,-WORLD,WORLD);
  if(sp>8){ p.face=Math.atan2(p.vy,p.vx); p.walk+=dt*sp*0.05; }
  // keep player out of the base module
  const bd=Math.hypot(p.x,p.y);
  if(bd<BASE_R-4){ const a=Math.atan2(p.y,p.x)||0; p.x=Math.cos(a)*(BASE_R-4); p.y=Math.sin(a)*(BASE_R-4); }
  if(p.inv>0) p.inv-=dt;
  if(p.regen>0 && p.hp<p.max) p.hp=Math.min(p.max,p.hp+p.regen*dt);

  spawnWave(dt);
  fireWeapons(dt);
  buildGrid();

  /* --- enemies --- */
  for(const e of G.E){
    if(e.dead) continue;
    if(e.dcd>0) e.dcd-=dt;
    if(e.hit>0) e.hit-=dt;
    if(e.burn>0){ e.burn-=dt; if(damageEnemy(e,26*dt)) continue; }
    const tx = e.target==="base"?0:p.x, ty = e.target==="base"?0:p.y;
    let a=Math.atan2(ty-e.y,tx-e.x);
    e.a=a;
    if(e.ranged){
      const d=Math.hypot(p.x-e.x,p.y-e.y);
      e.at-=dt;
      if(d<430){
        if(d<270){ a+=Math.PI; }
        else { a += Math.sin(G.t*2+e.x)*0.5; }
        if(e.at<=0){ e.at=2.4;
          const sa=Math.atan2(p.y-e.y,p.x-e.x);
          G.EB.push({x:e.x,y:e.y,vx:Math.cos(sa)*210,vy:Math.sin(sa)*210,r:6,dmg:e.dmg,l:4,c:"#ffd166"});
        }
      }
    }
    e.x += (Math.cos(a)*e.spd + e.kx)*dt;
    e.y += (Math.sin(a)*e.spd + e.ky)*dt;
    e.kx*=Math.pow(0.001,dt); e.ky*=Math.pow(0.001,dt);
    separate(e);
    // touch player
    if(dist2(e.x,e.y,p.x,p.y) < (e.r+p.r)*(e.r+p.r)){
      hitPlayer(e.dmg);
      const ka=Math.atan2(e.y-p.y,e.x-p.x); e.kx+=Math.cos(ka)*300; e.ky+=Math.sin(ka)*300;
    }
    // touch base
    const db=Math.hypot(e.x,e.y);
    if(db < BASE_R+e.r){
      damageBase(e.dmg*0.42*dt);
      const ba=Math.atan2(e.y,e.x); e.x=Math.cos(ba)*(BASE_R+e.r); e.y=Math.sin(ba)*(BASE_R+e.r);
      if(Math.random()<dt*6) G.fx.push({x:e.x,y:e.y,vx:rnd(-60,60),vy:rnd(-60,60),l:.3,m:.3,c:"#4aa3ff",s:2});
    }
  }
  // cull
  if(G.E.length>0) G.E=G.E.filter(e=>!e.dead && (e.target==="base" || dist2(e.x,e.y,p.x,p.y)<2600*2600));

  /* --- boss --- */
  const b=G.boss;
  if(b){
    if(b.hit>0) b.hit-=dt;
    if(b.dcd>0) b.dcd-=dt;
    const ang=Math.atan2(p.y-b.y,p.x-b.x);
    b.ang=ang;
    if(b.kind==="harvester"){
      b.dash-=dt;
      if(b.dash<=0 && Math.hypot(p.x-b.x,p.y-b.y)<520){ b.dash=4.2; b.dashV=6; }
      const mul = b.dashV>0 ? 3.4 : 1;
      if(b.dashV>0) b.dashV-=dt*8;
      b.x+=Math.cos(ang)*b.spd*mul*dt; b.y+=Math.sin(ang)*b.spd*mul*dt;
      b.ct-=dt;
      if(b.ct<=0){ b.ct=3.4;
        for(let i=0;i<5;i++) mkEnemy("crawler",{x:b.x+rnd(-50,50),y:b.y+rnd(-50,50)},1.2);
      }
    } else {
      b.phase = b.hp/b.max<0.3?3 : b.hp/b.max<0.62?2 : 1;
      const spd=b.spd*(b.phase===3?1.5:b.phase===2?1.2:1);
      b.x+=Math.cos(ang)*spd*dt; b.y+=Math.sin(ang)*spd*dt;
      b.at-=dt;
      if(b.at<=0){
        b.at = b.phase===3?1.5:b.phase===2?2.2:3.0;
        const n = b.phase===3?18:b.phase===2?12:8, off=Math.random()*TAU;
        for(let i=0;i<n;i++){ const a2=off+i*(TAU/n);
          G.EB.push({x:b.x,y:b.y,vx:Math.cos(a2)*190,vy:Math.sin(a2)*190,r:8,dmg:14,l:5,c:"#b04cff"});
        }
        beep(110,0.25,"sawtooth",0.04,60);
      }
      b.ct-=dt;
      if(b.ct<=0){ b.ct=5; for(let i=0;i<6;i++) mkEnemy(pick(["skitter","drifter"]),{x:b.x+rnd(-70,70),y:b.y+rnd(-70,70)},1.3); }
    }
    b.x=clamp(b.x,-WORLD,WORLD); b.y=clamp(b.y,-WORLD,WORLD);
    if(dist2(b.x,b.y,p.x,p.y)<(b.r+p.r)*(b.r+p.r)) hitPlayer(22);
    if(Math.hypot(b.x,b.y)<BASE_R+b.r) damageBase(14*dt);
  }

  /* --- player bullets --- */
  for(const bl of G.B){
    bl.x+=bl.vx*dt; bl.y+=bl.vy*dt; bl.l-=dt;
    if(bl.l<=0){ bl.dead=true; continue; }
    for(const e of G.E){
      if(e.dead||bl.dead) continue;
      if(bl.hitSet.indexOf(e)>=0) continue;
      if(dist2(e.x,e.y,bl.x,bl.y)<(e.r+bl.r)*(e.r+bl.r)){
        damageEnemy(e,bl.dmg);
        const a=Math.atan2(bl.vy,bl.vx); e.kx+=Math.cos(a)*130; e.ky+=Math.sin(a)*130;
        G.fx.push({x:bl.x,y:bl.y,vx:rnd(-60,60),vy:rnd(-60,60),l:.18,m:.18,c:bl.c,s:2});
        bl.hitSet.push(e);
        if(bl.pierce-- <= 0){ bl.dead=true; break; }
      }
    }
    const bo=G.boss;
    if(bo && !bl.dead && bl.hitSet.indexOf(bo)<0 && dist2(bo.x,bo.y,bl.x,bl.y)<(bo.r+bl.r)*(bo.r+bl.r)){
      damageBoss(bl.dmg); bl.hitSet.push(bo);
      if(bl.pierce-- <= 0) bl.dead=true;
    }
  }
  if(G.B.length) G.B=G.B.filter(x=>!x.dead);

  /* --- enemy bullets --- */
  for(const bl of G.EB){
    bl.x+=bl.vx*dt; bl.y+=bl.vy*dt; bl.l-=dt;
    if(bl.l<=0){ bl.dead=true; continue; }
    if(dist2(bl.x,bl.y,p.x,p.y)<(bl.r+p.r)*(bl.r+p.r)){ hitPlayer(bl.dmg); bl.dead=true; }
    else if(Math.hypot(bl.x,bl.y)<BASE_R){ damageBase(bl.dmg*0.5); bl.dead=true; }
  }
  if(G.EB.length) G.EB=G.EB.filter(x=>!x.dead);

  /* --- mines --- */
  for(const m of G.mines){
    m.l-=dt; if(m.arm>0){m.arm-=dt;continue}
    m.pulse+=dt;
    let go = m.l<=0;
    if(!go) for(const e of G.E){ if(!e.dead && dist2(e.x,e.y,m.x,m.y)<(e.r+16)*(e.r+16)){ go=true;break } }
    if(!go && G.boss && dist2(G.boss.x,G.boss.y,m.x,m.y)<(G.boss.r+18)*(G.boss.r+18)) go=true;
    if(go){ m.dead=true; explode(m.x,m.y,m.rad,m.dmg,"#ff8c42",m.chain); }
  }
  if(G.mines.length) G.mines=G.mines.filter(x=>!x.dead);

  /* --- beams --- */
  for(const bm of G.beams){
    bm.l-=dt; if(bm.l<=0){bm.dead=true;continue}
    if(bm.spin) bm.a+=bm.spin*dt;
    bm.x=p.x; bm.y=p.y;
    const ca=Math.cos(bm.a), sa=Math.sin(bm.a);
    const test=(o)=>{
      if(bm.hitSet.indexOf(o)>=0) return;
      const rx=o.x-bm.x, ry=o.y-bm.y;
      const proj=rx*ca+ry*sa;
      if(proj<0||proj>bm.len) return;
      const perp=Math.abs(-rx*sa+ry*ca);
      if(perp>bm.w/2+o.r) return;
      bm.hitSet.push(o);
      if(o===G.boss) damageBoss(bm.dmg); else damageEnemy(o,bm.dmg);
    };
    for(const e of G.E){ if(!e.dead) test(e); }
    if(G.boss) test(G.boss);
  }
  if(G.beams.length) G.beams=G.beams.filter(x=>!x.dead);

  /* --- shockwaves --- */
  for(const s of G.shocks){
    s.l-=dt; if(s.l<=0){s.dead=true;continue}
    if(s.follow){ s.x=p.x; s.y=p.y; }
    s.r = s.max*(1-s.l/s.m);
    if(s.dmg){
      for(const e of G.E){
        if(e.dead||s.hitSet.indexOf(e)>=0) continue;
        if(dist2(e.x,e.y,s.x,s.y)<(s.r+e.r)*(s.r+e.r)){
          s.hitSet.push(e); damageEnemy(e,s.dmg);
          const a=Math.atan2(e.y-s.y,e.x-s.x);
          const k=s.pull?-300:260; e.kx+=Math.cos(a)*k; e.ky+=Math.sin(a)*k;
        }
      }
      if(G.boss && s.hitSet.indexOf(G.boss)<0 && dist2(G.boss.x,G.boss.y,s.x,s.y)<(s.r+G.boss.r)*(s.r+G.boss.r)){
        s.hitSet.push(G.boss); damageBoss(s.dmg);
      }
    }
  }
  if(G.shocks.length) G.shocks=G.shocks.filter(x=>!x.dead);

  /* --- orbs --- */
  for(const o of G.orbs){
    o.l-=dt; if(o.l<=0){o.dead=true;continue}
    const d=Math.hypot(p.x-o.x,p.y-o.y);
    if(d<p.mag){ const a=Math.atan2(p.y-o.y,p.x-o.x), s=Math.max(140,520-d*2);
      o.vx+=Math.cos(a)*s*dt*6; o.vy+=Math.sin(a)*s*dt*6; }
    o.x+=o.vx*dt; o.y+=o.vy*dt; o.vx*=Math.pow(.2,dt); o.vy*=Math.pow(.2,dt);
    if(d<p.r+9){
      o.dead=true;
      if(o.heal){ p.hp=Math.min(p.max,p.hp+22); beep(880,0.14,"sine",0.04,1300); }
      else { gainXP(o.v); }
    }
  }
  if(G.orbs.length) G.orbs=G.orbs.filter(x=>!x.dead);

  /* --- particles --- */
  for(const f of G.fx){ f.l-=dt; if(f.l<=0){f.dead=true;continue} f.x+=f.vx*dt; f.y+=f.vy*dt; f.vx*=Math.pow(.1,dt); f.vy*=Math.pow(.1,dt); }
  if(G.fx.length) G.fx=G.fx.filter(x=>!x.dead);
}

function phaseKey(){
  const T=G.t;
  if(G.monSpawned) return "ph_6";
  if(T>=600) return "ph_5";
  if(T>=540) return "ph_4";
  if(T>=300) return "ph_3";
  if(T>=120) return "ph_2";
  return "ph_1";
}
function gainXP(v){
  const p=G.p; p.xp+=v; SFX.xp();
  while(p.xp>=p.need){
    p.xp-=p.need; p.lv++;
    p.need = Math.round(7 + p.lv*3.6 + p.lv*p.lv*0.45);
    G.pendingLv=(G.pendingLv||0)+1;
  }
  if(G.pendingLv && MODE==="play") openLevelUp();
}
