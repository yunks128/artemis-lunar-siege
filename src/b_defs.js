/* ---------------- definitions ---------------- */
const WMAX = 8, PMAX = 5, WORLD = 1500, BASE_R = 66, RUN_TIME = 900;

const WEAPONS = {
  rifle:{g:"➤", n:"w_rifle_n", d:"w_rifle_d", pair:"amp", L:{g:"⇶",n:"w_rifle_L",d:"w_rifle_Ld"}},
  drone:{g:"◍", n:"w_drone_n", d:"w_drone_d", pair:"opt", L:{g:"❈",n:"w_drone_L",d:"w_drone_Ld"}},
  mine :{g:"◉", n:"w_mine_n",  d:"w_mine_d",  pair:"cool",L:{g:"✸",n:"w_mine_L", d:"w_mine_Ld"}},
  lance:{g:"☀", n:"w_lance_n", d:"w_lance_d", pair:"opt", L:{g:"✷",n:"w_lance_L",d:"w_lance_Ld"}},
  nova :{g:"◎", n:"w_nova_n",  d:"w_nova_d",  pair:"core",L:{g:"⊛",n:"w_nova_L", d:"w_nova_Ld"}},
};
const PASSIVES = {
  boots:{g:"⇉", n:"p_boots_n", d:"p_boots_d"},
  core :{g:"⬢", n:"p_core_n",  d:"p_core_d"},
  mag  :{g:"⌾", n:"p_mag_n",   d:"p_mag_d"},
  cool :{g:"❄", n:"p_cool_n",  d:"p_cool_d"},
  amp  :{g:"⌁", n:"p_amp_n",   d:"p_amp_d"},
  plate:{g:"⬟", n:"p_plate_n", d:"p_plate_d"},
  opt  :{g:"◈", n:"p_opt_n",   d:"p_opt_d"},
  nano :{g:"⌬", n:"p_nano_n",  d:"p_nano_d"},
};
const ETYPE = {
  crawler:{r:10, hp:14,  spd:46,  dmg:7,  xp:1, c:"#b04cff", shape:0},
  skitter:{r:8,  hp:9,   spd:96,  dmg:5,  xp:1, c:"#35ff9e", shape:1},
  drifter:{r:13, hp:48,  spd:56,  dmg:10, xp:3, c:"#ff6fd8", shape:2},
  hulk   :{r:20, hp:130, spd:31,  dmg:18, xp:7, c:"#7a5cff", shape:3},
  spitter:{r:12, hp:34,  spd:36,  dmg:6,  xp:4, c:"#ffd166", shape:4, ranged:true},
};

/* roundRect fallback for older engines */
if(!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){
    r=Math.min(r||0,Math.abs(w)/2,Math.abs(h)/2);
    this.moveTo(x+r,y); this.arcTo(x+w,y,x+w,y+h,r); this.arcTo(x+w,y+h,x,y+h,r);
    this.arcTo(x,y+h,x,y,r); this.arcTo(x,y,x+w,y,r); this.closePath(); return this;
  };
}

/* ---------------- helpers ---------------- */
const rnd=(a,b)=>a+Math.random()*(b-a);
const rint=(a,b)=>Math.floor(rnd(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const dist2=(a,b,c,d)=>{const x=a-c,y=b-d;return x*x+y*y};
const TAU=Math.PI*2;
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

/* ---------------- audio (tiny synth, no assets) ---------------- */
let AC=null, MUTED=false;
function beep(freq,dur,type,vol,slide){
  if(MUTED) return;
  try{
    if(!AC) AC = new (window.AudioContext||window.webkitAudioContext)();
    if(AC.state==="suspended") AC.resume();
    const o=AC.createOscillator(), g=AC.createGain(), n=AC.currentTime;
    o.type=type||"square"; o.frequency.setValueAtTime(freq,n);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,slide),n+dur);
    g.gain.setValueAtTime(0,n);
    g.gain.linearRampToValueAtTime(vol||0.04,n+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,n+dur);
    o.connect(g); g.connect(AC.destination); o.start(n); o.stop(n+dur+0.02);
  }catch(e){}
}
const SFX={
  shot:()=>beep(700,0.05,"square",0.018,420),
  hit:()=>beep(220,0.045,"sawtooth",0.016,140),
  kill:()=>beep(150,0.09,"triangle",0.03,60),
  xp:()=>beep(1180,0.045,"sine",0.022,1500),
  boom:()=>beep(90,0.28,"sawtooth",0.05,32),
  lv:()=>{beep(520,0.1,"triangle",0.05);setTimeout(()=>beep(780,0.14,"triangle",0.05),90)},
  hurt:()=>beep(160,0.16,"sawtooth",0.05,70),
  boss:()=>{beep(80,0.7,"sawtooth",0.07,40);setTimeout(()=>beep(120,0.5,"square",0.045,60),260)},
  win:()=>{[523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,0.22,"triangle",0.06),i*130))},
  lose:()=>{[330,262,196,131].forEach((f,i)=>setTimeout(()=>beep(f,0.3,"sawtooth",0.05),i*170))},
};
