/* ---------------- rendering ---------------- */
let camX=0,camY=0;
function render(){
  const p=G.p;
  camX = p.x; camY = p.y;
  let sx=0, sy=0;
  if(G.shake>0){ sx=rnd(-G.shake,G.shake); sy=rnd(-G.shake,G.shake); }
  const hw = W/(2*ZOOM), hh = H/(2*ZOOM);

  cx.fillStyle="#07090f"; cx.fillRect(0,0,W,H);

  // starfield (parallax, screen-space)
  cx.save();
  for(const s of STARS){
    const px=((s.x*W - camX*0.05)%W+W)%W, py=((s.y*H - camY*0.05)%H+H)%H;
    cx.globalAlpha=0.25+0.35*Math.abs(Math.sin(G.t*0.7+s.t));
    cx.fillStyle="#9fb4cc"; cx.fillRect(px,py,s.s,s.s);
  }
  cx.restore();

  cx.save();
  cx.translate(W/2+sx, H/2+sy); cx.scale(ZOOM,ZOOM); cx.translate(-camX,-camY);
  const L=camX-hw-80, R=camX+hw+80, T=camY-hh-80, B=camY+hh+80;

  // regolith ground
  cx.fillStyle="#0d1017";
  cx.fillRect(-WORLD-200,-WORLD-200,(WORLD+200)*2,(WORLD+200)*2);
  // grid
  cx.strokeStyle="#131722"; cx.lineWidth=1; cx.beginPath();
  const gs=110;
  for(let x=Math.floor(L/gs)*gs;x<R;x+=gs){ cx.moveTo(x,T); cx.lineTo(x,B); }
  for(let y=Math.floor(T/gs)*gs;y<B;y+=gs){ cx.moveTo(L,y); cx.lineTo(R,y); }
  cx.stroke();
  // craters
  for(const c of CRATERS){
    if(c.x<L-c.r||c.x>R+c.r||c.y<T-c.r||c.y>B+c.r) continue;
    cx.beginPath(); cx.arc(c.x,c.y,c.r,0,TAU);
    cx.fillStyle="#0a0d13"; cx.fill();
    cx.strokeStyle="#171c27"; cx.lineWidth=2; cx.stroke();
    cx.beginPath(); cx.arc(c.x-c.r*.12,c.y-c.r*.12,c.r*.62,0,TAU);
    cx.strokeStyle="#121620"; cx.lineWidth=1; cx.stroke();
  }
  // world boundary
  cx.strokeStyle="#242b3a"; cx.lineWidth=3; cx.setLineDash([16,12]);
  cx.strokeRect(-WORLD,-WORLD,WORLD*2,WORLD*2); cx.setLineDash([]);

  drawBase();

  // orbs
  for(const o of G.orbs){
    if(o.heal){
      cx.fillStyle="#35ff9e"; cx.globalAlpha=0.9;
      cx.beginPath(); cx.arc(o.x,o.y,7,0,TAU); cx.fill();
      cx.globalAlpha=1; cx.fillStyle="#04140c"; cx.font="bold 9px monospace";
      cx.textAlign="center"; cx.textBaseline="middle"; cx.fillText("+",o.x,o.y+.5);
    } else {
      const s=o.v>3?5:3.4;
      cx.fillStyle="#35c8ff"; cx.globalAlpha=0.85;
      cx.beginPath(); cx.moveTo(o.x,o.y-s); cx.lineTo(o.x+s,o.y); cx.lineTo(o.x,o.y+s); cx.lineTo(o.x-s,o.y); cx.fill();
      cx.globalAlpha=1;
    }
  }
  cx.globalAlpha=1;

  // mines
  for(const m of G.mines){
    if(m.arm>0) continue;
    const pu=0.5+0.5*Math.sin(m.pulse*7);
    cx.strokeStyle="rgba(255,140,66,"+(0.16+0.16*pu)+")"; cx.lineWidth=1.5;
    cx.beginPath(); cx.arc(m.x,m.y,m.rad,0,TAU); cx.stroke();
    cx.fillStyle="#ff8c42"; cx.beginPath(); cx.arc(m.x,m.y,5.5,0,TAU); cx.fill();
    cx.fillStyle="rgba(255,209,102,"+pu+")"; cx.beginPath(); cx.arc(m.x,m.y,2.4,0,TAU); cx.fill();
  }

  // enemies
  for(const e of G.E){
    if(e.x<L||e.x>R||e.y<T||e.y>B) continue;
    drawEnemy(e);
  }
  if(G.boss) drawBoss(G.boss);

  // beams
  for(const bm of G.beams){
    const a=bm.l/bm.m;
    cx.save(); cx.translate(bm.x,bm.y); cx.rotate(bm.a);
    const grd=cx.createLinearGradient(0,0,bm.len,0);
    grd.addColorStop(0,"rgba(255,214,120,"+(0.85*a)+")");
    grd.addColorStop(.5,"rgba(255,160,60,"+(0.55*a)+")");
    grd.addColorStop(1,"rgba(255,120,40,0)");
    cx.fillStyle=grd; cx.fillRect(0,-bm.w/2,bm.len,bm.w);
    cx.fillStyle="rgba(255,255,255,"+(0.8*a)+")"; cx.fillRect(0,-bm.w/7,bm.len*0.96,bm.w*2/7);
    cx.restore();
  }
  // shockwaves
  for(const s of G.shocks){
    const a=s.l/s.m;
    cx.strokeStyle=s.c; cx.globalAlpha=a*0.85; cx.lineWidth=3+7*a;
    cx.beginPath(); cx.arc(s.x,s.y,s.r,0,TAU); cx.stroke();
    cx.globalAlpha=a*0.12; cx.fillStyle=s.c; cx.beginPath(); cx.arc(s.x,s.y,s.r,0,TAU); cx.fill();
    cx.globalAlpha=1;
  }
  // bullets
  for(const b of G.B){
    cx.save(); cx.translate(b.x,b.y); cx.rotate(Math.atan2(b.vy,b.vx));
    cx.fillStyle=b.c; cx.globalAlpha=.35; cx.fillRect(-14,-b.r*.5,14,b.r);
    cx.globalAlpha=1; cx.beginPath(); cx.ellipse(0,0,b.r*1.5,b.r,0,0,TAU); cx.fill();
    if(b.leg){ cx.strokeStyle="#fff"; cx.lineWidth=1; cx.stroke(); }
    cx.restore();
  }
  for(const b of G.EB){
    cx.fillStyle=b.c; cx.beginPath(); cx.arc(b.x,b.y,b.r,0,TAU); cx.fill();
    cx.globalAlpha=.3; cx.beginPath(); cx.arc(b.x,b.y,b.r*2,0,TAU); cx.fill(); cx.globalAlpha=1;
  }

  drawDrones();
  drawPlayer();

  // particles
  for(const f of G.fx){
    cx.globalAlpha=Math.max(0,f.l/f.m); cx.fillStyle=f.c;
    cx.fillRect(f.x-f.s/2,f.y-f.s/2,f.s,f.s);
  }
  cx.globalAlpha=1;

  // offscreen boss / base arrows
  drawMarkers(hw,hh);
  cx.restore();

  // vignette + hit flash
  if(G.flash>0){ cx.fillStyle="rgba(255,71,87,"+(G.flash*0.22)+")"; cx.fillRect(0,0,W,H); }
  const vg=cx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.34,W/2,H/2,Math.max(W,H)*0.78);
  vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(0,0,0,0.62)");
  cx.fillStyle=vg; cx.fillRect(0,0,W,H);

  // banner
  if(G.bannerT>0 && G.banner){
    const a=Math.min(1,G.bannerT/0.6)*Math.min(1,(4-G.bannerT)/0.3);
    cx.globalAlpha=clamp(a,0,1);
    cx.textAlign="center"; cx.textBaseline="middle";
    cx.font="700 13px ui-monospace,monospace";
    const bt=t(G.banner).toUpperCase(), by=H*0.74, bw=cx.measureText(bt).width;
    cx.fillStyle="rgba(4,6,10,.72)";
    cx.beginPath(); cx.roundRect(W/2-bw/2-16, by-15, bw+32, 30, 15); cx.fill();
    cx.strokeStyle = (G.banner==="ph_4"||G.banner==="ph_6")?"rgba(255,71,87,.5)":"rgba(74,163,255,.4)";
    cx.lineWidth=1; cx.stroke();
    cx.fillStyle = (G.banner==="ph_4"||G.banner==="ph_6")?"#ff4757":"#4aa3ff";
    cx.fillText(bt, W/2, by+1);
    cx.globalAlpha=1;
  }
}

function drawBase(){
  const hp=G.base.hp/G.base.max;
  const pulse=0.5+0.5*Math.sin(G.t*1.6);
  cx.save();
  // shield glow
  const g=cx.createRadialGradient(0,0,BASE_R*0.5,0,0,BASE_R*2.1);
  g.addColorStop(0,"rgba(74,163,255,"+(0.13*hp+0.03)+")");
  g.addColorStop(1,"rgba(74,163,255,0)");
  cx.fillStyle=g; cx.beginPath(); cx.arc(0,0,BASE_R*2.1,0,TAU); cx.fill();
  // pad
  cx.beginPath(); cx.arc(0,0,BASE_R,0,TAU);
  cx.fillStyle="#101520"; cx.fill();
  cx.strokeStyle = hp>0.35?"rgba(74,163,255,.75)":"rgba(255,71,87,.8)"; cx.lineWidth=2.5; cx.stroke();
  cx.beginPath(); cx.arc(0,0,BASE_R-11,0,TAU);
  cx.strokeStyle="rgba(74,163,255,.18)"; cx.lineWidth=1; cx.stroke();
  // habitat modules
  cx.fillStyle="#1a2130"; cx.strokeStyle="#2f3c52"; cx.lineWidth=1.5;
  for(let i=0;i<3;i++){
    const a=i*(TAU/3)+0.5, R=34;
    cx.save(); cx.translate(Math.cos(a)*R,Math.sin(a)*R); cx.rotate(a);
    cx.beginPath(); cx.roundRect(-16,-10,32,20,5); cx.fill(); cx.stroke();
    cx.restore();
  }
  // relay mast
  cx.strokeStyle="#43536e"; cx.lineWidth=2.5;
  cx.beginPath(); cx.moveTo(0,6); cx.lineTo(0,-30); cx.stroke();
  cx.beginPath(); cx.arc(0,-34,7,Math.PI*0.15,Math.PI*0.85,true);
  cx.strokeStyle=hp>0.35?"#4aa3ff":"#ff4757"; cx.lineWidth=2.5; cx.stroke();
  cx.fillStyle=hp>0.35?"rgba(74,163,255,"+(0.35+0.6*pulse)+")":"rgba(255,71,87,"+(0.4+0.6*pulse)+")";
  cx.beginPath(); cx.arc(0,-34,3,0,TAU); cx.fill();
  // signal rings
  const rr=(G.t*46)%BASE_R;
  cx.globalAlpha=0.28*(1-rr/BASE_R); cx.strokeStyle="#4aa3ff"; cx.lineWidth=1.5;
  cx.beginPath(); cx.arc(0,-34,rr,0,TAU); cx.stroke(); cx.globalAlpha=1;
  cx.restore();
}

function drawPlayer(){
  const p=G.p;
  cx.save(); cx.translate(p.x,p.y);
  if(p.inv>0 && Math.floor(p.inv*20)%2===0) cx.globalAlpha=0.4;
  // shadow / dust
  cx.fillStyle="rgba(0,0,0,.45)"; cx.beginPath(); cx.ellipse(0,4,13,7,0,0,TAU); cx.fill();
  cx.rotate(p.face+Math.PI/2);
  // pack
  cx.fillStyle="#8d99ab"; cx.beginPath(); cx.roundRect(-8,2,16,9,3); cx.fill();
  // suit body
  cx.fillStyle="#e8eef6"; cx.beginPath(); cx.arc(0,0,11,0,TAU); cx.fill();
  cx.strokeStyle="#aab6c6"; cx.lineWidth=1.5; cx.stroke();
  // limbs bob
  const bob=Math.sin(p.walk)*3;
  cx.fillStyle="#dfe7f1";
  cx.beginPath(); cx.roundRect(-13,-3+bob,5,9,2.5); cx.fill();
  cx.beginPath(); cx.roundRect(8,-3-bob,5,9,2.5); cx.fill();
  // visor
  cx.fillStyle="#ff8c42"; cx.beginPath(); cx.ellipse(0,-3.5,7,5,0,0,TAU); cx.fill();
  cx.fillStyle="rgba(255,255,255,.55)"; cx.beginPath(); cx.ellipse(-2.4,-5,2.4,1.5,0,0,TAU); cx.fill();
  cx.restore();
  cx.globalAlpha=1;
  // magnet ring hint
  cx.strokeStyle="rgba(53,200,255,.07)"; cx.lineWidth=1;
  cx.beginPath(); cx.arc(p.x,p.y,p.mag,0,TAU); cx.stroke();
}

function drawDrones(){
  const w=G.weapons.drone; if(!w) return;
  const s=wstat("drone"), p=G.p;
  cx.strokeStyle=w.leg?"rgba(255,140,66,.22)":"rgba(74,163,255,.13)"; cx.lineWidth=1;
  cx.beginPath(); cx.arc(p.x,p.y,s.rad,0,TAU); cx.stroke();
  for(let i=0;i<s.count;i++){
    const a=G.droneA+i*(TAU/s.count);
    const x=p.x+Math.cos(a)*s.rad, y=p.y+Math.sin(a)*s.rad;
    cx.save(); cx.translate(x,y); cx.rotate(a+G.t*4);
    if(w.leg){
      cx.fillStyle="rgba(255,140,66,.28)"; cx.beginPath(); cx.arc(0,0,s.size*1.5,0,TAU); cx.fill();
      cx.fillStyle="#ffd166";
    } else cx.fillStyle="#8fd0ff";
    cx.beginPath();
    for(let k=0;k<3;k++){ const aa=k*(TAU/3); const r=s.size;
      if(k===0) cx.moveTo(Math.cos(aa)*r,Math.sin(aa)*r); else cx.lineTo(Math.cos(aa)*r,Math.sin(aa)*r); }
    cx.closePath(); cx.fill();
    cx.restore();
  }
}

function drawEnemy(e){
  const hit=e.hit>0;
  cx.save(); cx.translate(e.x,e.y);
  cx.fillStyle="rgba(0,0,0,.4)"; cx.beginPath(); cx.ellipse(0,e.r*.45,e.r*.9,e.r*.45,0,0,TAU); cx.fill();
  cx.rotate(e.a+Math.PI/2);
  const c = hit?"#ffffff":e.c;
  if(e.burn>0 && !hit){ cx.shadowColor="#ff8c42"; cx.shadowBlur=12; }
  cx.fillStyle=c;
  const r=e.r;
  switch(e.shape){
    case 0: // crawler — chevron
      cx.beginPath(); cx.moveTo(0,-r*1.15); cx.lineTo(r,r*.6); cx.lineTo(0,r*.15); cx.lineTo(-r,r*.6);
      cx.closePath(); cx.fill(); break;
    case 1: // skitter — dart
      cx.beginPath(); cx.moveTo(0,-r*1.5); cx.lineTo(r*.75,r*.9); cx.lineTo(-r*.75,r*.9);
      cx.closePath(); cx.fill(); break;
    case 2: // drifter — hex
      cx.beginPath();
      for(let i=0;i<6;i++){const a=i*TAU/6; const rr=r*(i%2?1:1.2);
        i?cx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):cx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr)}
      cx.closePath(); cx.fill(); break;
    case 3: // hulk — heavy block
      cx.beginPath(); cx.roundRect(-r,-r,r*2,r*2,r*.35); cx.fill();
      cx.fillStyle="rgba(0,0,0,.35)"; cx.beginPath(); cx.roundRect(-r*.45,-r*.5,r*.9,r,3); cx.fill(); break;
    case 4: // spitter — orb + spikes
      cx.beginPath(); cx.arc(0,0,r*.8,0,TAU); cx.fill();
      cx.strokeStyle=c; cx.lineWidth=2;
      for(let i=0;i<5;i++){const a=i*TAU/5+G.t;
        cx.beginPath(); cx.moveTo(Math.cos(a)*r*.8,Math.sin(a)*r*.8);
        cx.lineTo(Math.cos(a)*r*1.35,Math.sin(a)*r*1.35); cx.stroke();}
      break;
  }
  cx.shadowBlur=0;
  cx.restore();
  if(e.hp<e.max && e.max>25){
    const w=e.r*2, h=2.5;
    cx.fillStyle="rgba(0,0,0,.6)"; cx.fillRect(e.x-w/2,e.y-e.r-8,w,h);
    cx.fillStyle="#ff4757"; cx.fillRect(e.x-w/2,e.y-e.r-8,w*Math.max(0,e.hp/e.max),h);
  }
  if(e.target==="base"){
    cx.strokeStyle="rgba(255,71,87,.30)"; cx.lineWidth=1;
    cx.beginPath(); cx.arc(e.x,e.y,e.r+4,0,TAU); cx.stroke();
  }
}

function drawBoss(b){
  const hit=b.hit>0, r=b.r;
  cx.save(); cx.translate(b.x,b.y);
  const g=cx.createRadialGradient(0,0,r*.4,0,0,r*2.4);
  g.addColorStop(0,"rgba(176,76,255,.26)"); g.addColorStop(1,"rgba(176,76,255,0)");
  cx.fillStyle=g; cx.beginPath(); cx.arc(0,0,r*2.4,0,TAU); cx.fill();
  cx.rotate(b.ang+Math.PI/2);
  cx.fillStyle=hit?"#fff":(b.kind==="harvester"?"#8a3fd0":"#b04cff");
  if(b.kind==="harvester"){
    cx.beginPath();
    for(let i=0;i<8;i++){ const a=i*TAU/8, rr=r*(i%2?0.72:1.15);
      i?cx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):cx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr); }
    cx.closePath(); cx.fill();
    cx.fillStyle=hit?"#fff":"#35ff9e";
    cx.beginPath(); cx.arc(0,-r*.25,r*.28,0,TAU); cx.fill();
  } else {
    // monarch — crowned mass with rotating limbs
    cx.save(); cx.rotate(G.t*0.6);
    cx.strokeStyle=hit?"#fff":"#7a2fb8"; cx.lineWidth=6;
    for(let i=0;i<6;i++){ const a=i*TAU/6;
      cx.beginPath(); cx.moveTo(0,0);
      cx.quadraticCurveTo(Math.cos(a)*r*1.3,Math.sin(a)*r*1.3,Math.cos(a+.5)*r*1.9,Math.sin(a+.5)*r*1.9);
      cx.stroke(); }
    cx.restore();
    cx.fillStyle=hit?"#fff":"#b04cff";
    cx.beginPath(); cx.arc(0,0,r,0,TAU); cx.fill();
    cx.fillStyle="#04070c"; cx.beginPath(); cx.arc(0,-r*.2,r*.42,0,TAU); cx.fill();
    cx.fillStyle=hit?"#fff":"#ff4757";
    for(let i=0;i<3;i++){ cx.beginPath(); cx.arc((i-1)*r*.34,-r*.24,r*.11,0,TAU); cx.fill(); }
    if(b.phase===3){ cx.strokeStyle="rgba(255,71,87,.6)"; cx.lineWidth=2;
      cx.beginPath(); cx.arc(0,0,r*1.35+Math.sin(G.t*8)*4,0,TAU); cx.stroke(); }
  }
  cx.restore();
}

function drawMarkers(hw,hh){
  const p=G.p;
  const targets=[{x:0,y:0,c:"#4aa3ff"}];
  if(G.boss) targets.push({x:G.boss.x,y:G.boss.y,c:"#b04cff"});
  for(const tg of targets){
    if(Math.abs(tg.x-camX)<hw-46 && Math.abs(tg.y-camY)<hh-46) continue;
    const a=Math.atan2(tg.y-p.y,tg.x-p.x);
    const rx=Math.min(hw,hh)*0.80;
    const px=p.x+Math.cos(a)*rx, py=p.y+Math.sin(a)*rx;
    cx.save(); cx.translate(px,py); cx.rotate(a);
    cx.fillStyle=tg.c; cx.globalAlpha=.75;
    cx.beginPath(); cx.moveTo(11,0); cx.lineTo(-7,7); cx.lineTo(-7,-7); cx.closePath(); cx.fill();
    cx.restore(); cx.globalAlpha=1;
  }
}
