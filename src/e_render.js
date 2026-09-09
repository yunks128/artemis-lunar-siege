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

/* --- creature shading helpers --- */
function hex2rgb(h){
  if(h[0]==="#") return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const m=h.match(/-?\d+/g); return [+m[0],+m[1],+m[2]];   // also accepts shade()'s rgb(...) output
}
function shade(h,f){ const c=hex2rgb(h); const m=(v)=>Math.round(clamp(f<0?v*(1+f):v+(255-v)*f,0,255));
  return "rgb("+m(c[0])+","+m(c[1])+","+m(c[2])+")"; }
function tint(h,a){ const c=hex2rgb(h); return "rgba("+c[0]+","+c[1]+","+c[2]+","+a+")"; }
/* body gradient: lit from upper-left, dark underside — reads as volume, not a flat decal */
function bodyGrad(r,c){
  const g=cx.createLinearGradient(-r*.6,-r*.9,r*.5,r);
  g.addColorStop(0,shade(c,.42)); g.addColorStop(.45,c); g.addColorStop(1,shade(c,-.55));
  return g;
}
function leg(x1,y1,x2,y2,x3,y3,w,col){
  cx.strokeStyle=col; cx.lineCap="round"; cx.lineJoin="round"; cx.lineWidth=w;
  cx.beginPath(); cx.moveTo(x1,y1); cx.lineTo(x2,y2); cx.lineTo(x3,y3); cx.stroke();
}
function eyes(n,y,sp,rr,col,glow){
  cx.shadowColor=glow; cx.shadowBlur=8; cx.fillStyle=col;
  for(let i=0;i<n;i++){ const x=(i-(n-1)/2)*sp;
    cx.beginPath(); cx.ellipse(x,y,rr,rr*1.25,0,0,TAU); cx.fill(); }
  cx.shadowBlur=0;
}

function drawEnemy(e){
  const hit=e.hit>0, r=e.r, c=e.c, w=e.walk, hover=e.shape===2||e.shape===4;
  // contact shadow — tighter and darker for walkers, wide and soft for hoverers
  const lift = hover ? 4+Math.sin(G.t*1.6+e.bob)*2.5 : Math.abs(Math.sin(w))*1.6;
  cx.save(); cx.translate(e.x,e.y);
  cx.fillStyle="rgba(0,0,0,"+(hover?.28:.45)+")";
  cx.beginPath(); cx.ellipse(0,r*.5+lift*.5,r*(hover?1.0:.85)*(1+lift*.02),r*.34,0,0,TAU); cx.fill();
  cx.translate(0,-lift);
  cx.rotate(e.a+Math.PI/2);
  if(e.burn>0 && !hit){ cx.shadowColor="#ff8c42"; cx.shadowBlur=14; }
  const body = hit ? "#ffffff" : null;      // white-out on hit, else shaded
  const fill = body || bodyGrad(r,c);
  const dark = body || shade(c,-.5), lite = body || shade(c,.35);

  switch(e.shape){
    case 0: { // crawler — armored beetle, six legs, segmented carapace
      const st=Math.sin(w), st2=Math.sin(w+Math.PI);
      for(let s=-1;s<=1;s+=2){
        for(let i=0;i<3;i++){
          const ph=(i%2?st:st2), by=-r*.45+i*r*.55;
          leg(s*r*.55,by, s*(r*1.25+ph*r*.18),by+r*.15, s*(r*1.15+ph*r*.4),by+r*.7, Math.max(1.6,r*.16), dark);
        }
      }
      cx.fillStyle=fill;                     // abdomen
      cx.beginPath(); cx.ellipse(0,r*.2,r*.82,r*1.0,0,0,TAU); cx.fill();
      cx.fillStyle=body||shade(c,-.25);      // carapace seam plates
      for(let i=0;i<3;i++){ cx.globalAlpha=.5;
        cx.beginPath(); cx.ellipse(0,r*.0+i*r*.38,r*(.78-i*.13),r*.16,0,0,TAU); cx.fill(); }
      cx.globalAlpha=1;
      cx.fillStyle=body||lite;               // head plate
      cx.beginPath(); cx.moveTo(0,-r*1.3); cx.lineTo(r*.62,-r*.5); cx.lineTo(0,-r*.2); cx.lineTo(-r*.62,-r*.5);
      cx.closePath(); cx.fill();
      leg(-r*.3,-r*1.15,-r*.55,-r*1.6,-r*.35,-r*1.85,1.5,dark);   // mandibles
      leg( r*.3,-r*1.15, r*.55,-r*1.6, r*.35,-r*1.85,1.5,dark);
      if(!hit) eyes(2,-r*.62,r*.46,r*.13,"#ffe08a","#ff9b3d");
      break;
    }
    case 1: { // skitter — long-limbed sprinter, four legs, whipping tail
      const st=Math.sin(w*1.6), st2=Math.sin(w*1.6+Math.PI);
      for(let s=-1;s<=1;s+=2){
        leg(s*r*.35,-r*.3, s*(r*1.5+st*r*.5),-r*.9, s*(r*1.1+st*r*.7), r*.25, Math.max(1.4,r*.14), dark);
        leg(s*r*.35, r*.3, s*(r*1.5+st2*r*.5), r*.4, s*(r*1.1+st2*r*.7), r*1.2, Math.max(1.4,r*.14), dark);
      }
      cx.strokeStyle=dark; cx.lineWidth=Math.max(1.4,r*.2); cx.lineCap="round";  // tail
      cx.beginPath(); cx.moveTo(0,r*.7);
      cx.quadraticCurveTo(Math.sin(w*1.6)*r*.9,r*1.4, Math.sin(w*1.6+1)*r*1.1,r*2.1); cx.stroke();
      cx.fillStyle=fill;                     // thin thorax
      cx.beginPath(); cx.ellipse(0,0,r*.52,r*1.05,0,0,TAU); cx.fill();
      cx.fillStyle=body||lite;               // narrow head
      cx.beginPath(); cx.moveTo(0,-r*1.55); cx.lineTo(r*.44,-r*.75); cx.lineTo(-r*.44,-r*.75);
      cx.closePath(); cx.fill();
      cx.strokeStyle=dark; cx.lineWidth=1.2;  // antennae
      cx.beginPath(); cx.moveTo(-r*.2,-r*1.4); cx.lineTo(-r*.7,-r*2.1);
      cx.moveTo(r*.2,-r*1.4); cx.lineTo(r*.7,-r*2.1); cx.stroke();
      if(!hit) eyes(2,-r*1.05,r*.34,r*.11,"#c8ffe8","#35ff9e");
      break;
    }
    case 2: { // drifter — hovering bell with trailing tendrils, translucent membrane
      const pulse=1+Math.sin(G.t*2.2+e.bob)*.09;
      cx.strokeStyle=tint(hit?"#ffffff":c,.45); cx.lineCap="round";
      for(let i=0;i<7;i++){                   // tendrils drift behind
        const off=(i-3)*r*.24, sw=Math.sin(G.t*2.4+i*.8+e.sd);
        cx.lineWidth=Math.max(1,r*.1*(1-Math.abs(i-3)*.15));
        cx.beginPath(); cx.moveTo(off*.7,r*.4);
        cx.quadraticCurveTo(off+sw*r*.3,r*1.2, off*1.3+sw*r*.6,r*2.0); cx.stroke();
      }
      cx.save(); cx.scale(pulse,1/pulse);
      const g=cx.createRadialGradient(-r*.3,-r*.5,r*.1,0,0,r*1.15);   // gelatinous bell
      g.addColorStop(0,hit?"#ffffff":tint(shade(c,.5),.95));
      g.addColorStop(.6,hit?"#ffffff":tint(c,.75));
      g.addColorStop(1,hit?"#ffffff":tint(shade(c,-.4),.55));
      cx.fillStyle=g;
      cx.beginPath(); cx.ellipse(0,0,r*1.0,r*.92,0,Math.PI,TAU);       // dome
      cx.bezierCurveTo(r*.9,r*.55,-r*.9,r*.55,-r*1.0,0); cx.fill();
      cx.strokeStyle=tint(hit?"#ffffff":shade(c,.4),.6); cx.lineWidth=1.4;  // membrane ribs
      for(let i=-2;i<=2;i++){ cx.beginPath();
        cx.moveTo(i*r*.3,-r*.85+Math.abs(i)*r*.12); cx.lineTo(i*r*.38,r*.42); cx.stroke(); }
      cx.restore();
      if(!hit){ cx.fillStyle=tint("#ffffff",.75); cx.shadowColor=c; cx.shadowBlur=10;  // inner core
        cx.beginPath(); cx.arc(0,-r*.1,r*.26,0,TAU); cx.fill(); cx.shadowBlur=0; }
      break;
    }
    case 3: { // hulk — plated quadruped brute, shoulder armor, glowing core seam
      const st=Math.sin(w*.7), st2=Math.sin(w*.7+Math.PI);
      for(let s=-1;s<=1;s+=2){                // thick pistoning legs
        leg(s*r*.6,-r*.25, s*(r*1.05+st*r*.12),-r*.1+st*r*.1, s*(r*.95), r*.6, Math.max(3,r*.26), dark);
        leg(s*r*.6, r*.45, s*(r*1.05+st2*r*.12), r*.6+st2*r*.1, s*(r*.95), r*1.1, Math.max(3,r*.26), dark);
      }
      cx.fillStyle=fill;                      // torso block
      cx.beginPath(); cx.roundRect(-r*.82,-r*.95,r*1.64,r*1.95,r*.3); cx.fill();
      cx.fillStyle=body||shade(c,.28);        // shoulder pauldrons
      for(let s=-1;s<=1;s+=2){ cx.beginPath();
        cx.roundRect(s<0?-r*1.12:r*.32,-r*.85,r*.8,r*.85,r*.22); cx.fill(); }
      cx.fillStyle=body||shade(c,-.62);       // plate gaps
      cx.fillRect(-r*.8,-r*.12,r*1.6,r*.13); cx.fillRect(-r*.8,r*.42,r*1.6,r*.13);
      if(!hit){                               // reactor seam down the chest
        cx.shadowColor="#ff6b3d"; cx.shadowBlur=12; cx.fillStyle="#ffb46b";
        cx.beginPath(); cx.roundRect(-r*.12,-r*.55,r*.24,r*1.1,r*.1); cx.fill(); cx.shadowBlur=0;
      }
      cx.fillStyle=body||lite;                // sunken head
      cx.beginPath(); cx.roundRect(-r*.42,-r*1.35,r*.84,r*.55,r*.18); cx.fill();
      if(!hit) eyes(3,-r*1.08,r*.28,r*.09,"#ff9b6b","#ff4757");
      break;
    }
    case 4: { // spitter — bloated acid sac, visible fluid level, charging muzzle
      const charge=clamp(1-e.at/2.4,0,1), squish=1+Math.sin(G.t*1.8+e.bob)*.06;
      cx.strokeStyle=dark; cx.lineCap="round";  // stubby dangling legs
      for(let i=0;i<4;i++){ const a=Math.PI*.25+i*Math.PI*.5, sw=Math.sin(G.t*2+i+e.sd)*.25;
        cx.lineWidth=Math.max(1.4,r*.13);
        cx.beginPath(); cx.moveTo(Math.cos(a)*r*.5,Math.sin(a)*r*.5+r*.2);
        cx.lineTo(Math.cos(a+sw)*r*1.0,Math.sin(a+sw)*r*.9+r*.75); cx.stroke(); }
      cx.save(); cx.scale(1/squish,squish);
      cx.fillStyle=fill;                        // sac
      cx.beginPath(); cx.ellipse(0,r*.12,r*.92,r*.98,0,0,TAU); cx.fill();
      if(!hit){                                 // acid pooled in the bottom of the sac
        cx.save(); cx.beginPath(); cx.ellipse(0,r*.12,r*.86,r*.92,0,0,TAU); cx.clip();
        cx.fillStyle=tint(shade(c,.45),.55+charge*.35);
        cx.fillRect(-r,r*.12+r*.5-charge*r*1.1,r*2,r*2); cx.restore();
      }
      cx.strokeStyle=body||shade(c,-.5); cx.lineWidth=1.3;   // sac veins
      for(let i=0;i<4;i++){ const a=-1.1+i*.75;
        cx.beginPath(); cx.moveTo(Math.cos(a)*r*.15,Math.sin(a)*r*.15+r*.1);
        cx.quadraticCurveTo(Math.cos(a)*r*.7,Math.sin(a)*r*.7+r*.1,Math.cos(a)*r*.88,Math.sin(a)*r*.9+r*.1);
        cx.stroke(); }
      cx.restore();
      cx.fillStyle=body||shade(c,-.3);          // muzzle
      cx.beginPath(); cx.moveTo(-r*.3,-r*.7); cx.lineTo(r*.3,-r*.7);
      cx.lineTo(r*.16,-r*1.3); cx.lineTo(-r*.16,-r*1.3); cx.closePath(); cx.fill();
      if(!hit && charge>.55){                   // muzzle glows as the shot charges
        cx.shadowColor="#ffd166"; cx.shadowBlur=6+charge*12; cx.fillStyle="#fff3c4";
        cx.beginPath(); cx.arc(0,-r*1.3,r*.16*charge,0,TAU); cx.fill(); cx.shadowBlur=0;
      }
      if(!hit) eyes(2,-r*.5,r*.4,r*.1,"#fff3c4","#ffd166");
      break;
    }
  }
  cx.shadowBlur=0;
  cx.restore();
  if(e.hp<e.max && e.max>25){
    const bw=e.r*2, bh=2.5;
    cx.fillStyle="rgba(0,0,0,.6)"; cx.fillRect(e.x-bw/2,e.y-e.r-8-lift,bw,bh);
    cx.fillStyle="#ff4757"; cx.fillRect(e.x-bw/2,e.y-e.r-8-lift,bw*Math.max(0,e.hp/e.max),bh);
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
