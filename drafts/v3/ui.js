// =============================================================================
//  2D pixel layer: font, icons, HUD, rhythm ring, portrait expressions.
//  Draws straight into an RGBA buffer (Uint8ClampedArray) of the final frame.
// =============================================================================
'use strict';
const UI={};
UI.GLYPH={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',P:'110101110100100',Q:'010101101110011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111','0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110','4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010','8':'111101111101111','9':'111101111001110',':':'000010000010000','!':'010010010000010','+':'000010111010000','.':'000000000000010','-':'000000111000000','?':'110001010000010','/':'001001010100100',' ':'000000000000000',"'":'010010000000000',',':'000000000010100','"':'101101000000000','(':'010100100100010',')':'010001001001010','&':'010101010101011','#':'101111101111101','~':'000011110000000','*':'101010101000000'};
function hexc(h){ return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]; }
class Canvas2 {
  constructor(buf,w,h){ this.b=buf; this.w=w; this.h=h; }
  px(x,y,c,a=1){ x|=0; y|=0; if(x<0||y<0||x>=this.w||y>=this.h) return; const i=(y*this.w+x)*4, b=this.b;
    if(a>=1){ b[i]=c[0]; b[i+1]=c[1]; b[i+2]=c[2]; } else { b[i]+= (c[0]-b[i])*a; b[i+1]+=(c[1]-b[i+1])*a; b[i+2]+=(c[2]-b[i+2])*a; } }
  get(x,y){ const i=(y*this.w+x)*4; return [this.b[i],this.b[i+1],this.b[i+2]]; }
  rect(x,y,w,h,c,a=1){ for(let j=y;j<y+h;j++) for(let i=x;i<x+w;i++) this.px(i,j,c,a); }
  box(x,y,w,h,c){ for(let i=x;i<x+w;i++){ this.px(i,y,c); this.px(i,y+h-1,c); } for(let j=y;j<y+h;j++){ this.px(x,j,c); this.px(x+w-1,j,c); } }
  line(x0,y0,x1,y1,c){ x0|=0;y0|=0;x1|=0;y1|=0; const dx=Math.abs(x1-x0), dy=-Math.abs(y1-y0), sx=x0<x1?1:-1, sy=y0<y1?1:-1; let e=dx+dy;
    for(;;){ this.px(x0,y0,c); if(x0===x1&&y0===y1)break; const e2=2*e; if(e2>=dy){e+=dy;x0+=sx;} if(e2<=dx){e+=dx;y0+=sy;} } }
  text(str,x,y,c,shadow){ str=String(str).toUpperCase(); let cx=x;
    for(const ch of str){ const g=UI.GLYPH[ch]||UI.GLYPH['?'];
      for(let j=0;j<5;j++) for(let i=0;i<3;i++) if(g[j*3+i]==='1'){ if(shadow) this.px(cx+i+1,y+j+1,shadow); }
      for(let j=0;j<5;j++) for(let i=0;i<3;i++) if(g[j*3+i]==='1') this.px(cx+i,y+j,c);
      cx+=4; } return cx; }
  textOutlined(str,x,y,c,ol){ for(const [ox,oy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]]) this.text(str,x+ox,y+oy,ol); this.text(str,x,y,c); }
  sprite(rows,x,y,map,flip=false){ rows.forEach((r,j)=>{ for(let i=0;i<r.length;i++){ const ch=flip? r[r.length-1-i] : r[i]; const c=map[ch]; if(c) this.px(x+i,y+j,c); } }); }
  ring(cx,cy,r,c,thick=1){ for(let a=0;a<Math.PI*2;a+=0.5/Math.max(r,1)){ for(let t=0;t<thick;t++) this.px(Math.round(cx+Math.cos(a)*(r-t)), Math.round(cy+Math.sin(a)*(r-t)*0.82), c); } }
  copyFrom(src,sw,sh,dx,dy){ for(let y=0;y<sh;y++) for(let x=0;x<sw;x++){ const s=(y*sw+x)*4; if(src[s+3]===0) continue; this.px(dx+x,dy+y,[src[s],src[s+1],src[s+2]]); } }
}
UI.HEART=['.kk.kk.','khhkhhk','khhhhhk','.khhhk.','..khk..','...k...'];
UI.ICONS={
  lube:['..kkk..','..kwk..','.kkkkk.','.kpppk.','.kpwpk.','.kpppk.','.kpppk.','.kkkkk.'],
  condom:['.kkkkk.','k.....k','k.kkk.k','k.kpk.k','k.kpk.k','k.kpk.k','k..k..k','.kkkkk.'],
  broom:['.....kk','....kk.','...kk..','..kk...','.kwwk..','kwwwwk.','kwkwk..','.k.k...'],
  water:['...k...','..kwk..','.kwwwk.','kwwbwwk','kwbbbwk','kwwbwwk','.kwwwk.','..kkk..'],
  cam:['.......','kkkkkkk','kwwwwwk','kwkkkwk','kwkbkwk','kwkkkwk','kwwwwwk','kkkkkkk'],
  pose:['..kk...','..kk...','.kkkk..','k.kk.k.','..kk...','.k..k..','k....k.','.......'],
  shop:['.kkkkk.','k.....k','kkkkkkk','kwwwwwk','kwkkkwk','kwkpkwk','kwkkkwk','kkkkkkk'],
};

// ---------------------------------------------------------- expressions -----
// patterns are drawn centred on the projected eye / mouth points of the 3D head
UI.EYES={
  // anime-ish 7px eyes. k ink, w white, i iris, h heart pink, b brow
  6:{ eye:['.kkkkkk','kkwwiik','.wwwiiw'], brow:['bbbbbb.','......b'], browDy:-5 },            // bored, half-lidded, side-eye
  3:{ eye:['..kkk..','.kwwwk.','kwwiwwk','kwwkwwk','.kwwwk.','..kkk..'], brow:['..bbbb','.b....','b.....'], browDy:-6 },  // wide, pinprick, worried
  0:{ eye:['.hh.hh.','hhhhhhh','hhhhhhh','.hhhhh.','..hhh..','...h...'], brow:['.bbbbb.','b.....b'], browDy:-6 },        // heart eyes
};
UI.MOUTH={
  6:['......k','.kkkkk.'],
  3:['.k...k..','k.k.k.k.','...k...k'],
  0:['kkkkkkkk','kwwwwwwk','khhhhhhk','.khhhhk.','..kkkk..'],
};
UI.LINES={
  6:[["THIS DOES NOTHING","FOR ME. AT ALL."],["IS SHE DONE YET?","I HAVE BRUNCH."],["WOW. A VAGINA.","SO... WET? EW."]],
  5:[["OK IT'S WARM.","STILL GAY THO."],["WHY IS IT GRIPPING","ME LIKE THAT"]],
  4:[["WAIT. HOLD ON.","DO THAT AGAIN."],["THIS IS JUST","A PHASE. RIGHT?"]],
  3:[["WHY IS IT SO WARM??","THIS IS JUST A PHASE"],["MY BOYFRIEND CAN'T","KNOW ABOUT THIS"]],
  2:[["OH FUCK. OH FUCK.","PUSSY'S SO GOOD"],["I'M NEVER GOING","TO BRUNCH AGAIN"]],
  1:[["BRO I THINK I'M","STRAIGHT NOW BRO"],["DELETE GRINDR.","DELETE IT NOW."]],
  0:[["BRO. PUSSY IS SO","MUCH BETTER. LOCK IN"],["CREATINE. FOOTBALL.","PUSSY. THAT'S IT."]],
};
UI.drawExpression=function(c, stage, eyes, mouth, P, t){
  const st = stage>=5?6: stage>=2?3:0;
  const map={ k:P.ink, w:[250,248,244], b:P.brow, h:P.heart, p:P.ink, i:[86,120,190] };
  const E=UI.EYES[st];
  eyes.forEach((e,idx)=>{ const flip=idx===1; const ex=Math.round(e[0]), ey=Math.round(e[1]);
    const ew=E.eye[0].length, eh=E.eye.length; c.sprite(E.eye, ex-Math.floor(ew/2), ey-Math.floor(eh/2), map, flip);
    c.sprite(E.brow, ex-3, ey+E.browDy+ (st===0? Math.round(Math.sin(t*9)) : 0), map, flip); });
  const M=UI.MOUTH[st]; const mw=M[0].length; c.sprite(M, Math.round(mouth[0])-Math.floor(mw/2), Math.round(mouth[1])-Math.floor(M.length/2), map);
  // blush + sweat as he breaks
  const bl = st===6?0 : st===3?0.5 : 0.75;
  for(const e of eyes) for(let y=2;y<5;y++) for(let x=-3;x<3;x++){ const X=Math.round(e[0])+x+(e===eyes[0]?-1:1), Y=Math.round(e[1])+y; if(((X+Y)&1) && bl>0.4 || ((X*3+Y)%4===0 && bl>0)) c.px(X,Y,P.blush, 0.85); }
  if(st<=3){ const sx=Math.round(eyes[1][0])+6, sy=Math.round(eyes[1][1])-6+(Math.floor(t*3)%3);
    c.sprite(['.k.','kwk','kwk','.k.'], sx, sy, map); }
};
UI.speech=function(c,x,y,lines,P){
  const w=Math.max(...lines.map(l=>l.length))*4+5, h=lines.length*7+4;
  c.rect(x,y,w,h,P.ink); c.rect(x+1,y+1,w-2,h-2,P.paper);
  c.px(x+3,y+h,P.ink); c.px(x+4,y+h,P.paper); c.px(x+3,y+h+1,P.ink); c.px(x+4,y+h-1,P.paper);
  lines.forEach((l,i)=>c.text(l,x+3,y+3+i*7,P.ink));
};
UI.hud=function(c, s, P){
  // score banner
  for(let x=0;x<96;x++) for(let y=3;y<13;y++) if(x<62 || ((x+y)&1)===0 && x<62+(96-x)*0.5) c.px(x,y,P.uiD);
  c.text('SCORE: '+s.score,4,6,P.paper);
  for(let i=0;i<5;i++) c.sprite(UI.HEART,4+i*9,16,{k:P.ink,h:i<s.hearts?P.heart:P.uiD});
  if(s.combo){ c.textOutlined('+'+s.combo[0],5,27,P.paper,P.ink); c.textOutlined('X'+s.combo[1]+' COMBO',5,34,P.paper,P.ink); }
  // kinsey meter: 6 -> 0
  const kx=c.w-78, ky=4; c.rect(kx-2,ky-2,76,19,P.uiD);
  c.text('KINSEY',kx,ky,P.paper);
  c.text(String(s.kinsey),kx+66,ky,P.heart);
  for(let i=0;i<6;i++){ const lit = i < 6-s.kinsey; c.rect(kx+i*12,ky+8,10,5, lit?P.heart:P.uiM); if(!lit) c.rect(kx+i*12+1,ky+9,8,3,P.uiD); }
  // tool sidebar
  const tools=['lube','condom','broom','water','pose','cam','shop'];
  tools.forEach((n,i)=>{ const x=c.w-13, y=30+i*13; c.rect(x-1,y-1,12,12,P.ink); c.rect(x,y,10,10, i===s.toolHot?P.heart:P.uiM);
    c.sprite(UI.ICONS[n],x+2,y+1,{k:P.ink,w:P.paper,p:P.heart,b:[90,150,230]}); });
  // new lover button
  const bx=Math.round(c.w/2-28), by=c.h-14; c.rect(bx,by,56,11,P.ink); c.rect(bx+1,by+1,54,9,P.uiD); c.text('NEW LOVER',bx+10,by+3,P.paper);
};
// rhythm ring: shrinks onto the hips, lands on the slam
UI.rhythm=function(c, cx, cy, phaseToHit, P, judge){
  // target ring frames the action (never covers it); the pulse ring collapses onto it on the beat
  const r0=21, r=r0+phaseToHit*30;
  for(let a=0;a<Math.PI*2;a+=Math.PI/8){ const x=Math.round(cx+Math.cos(a)*r0), y=Math.round(cy+Math.sin(a)*r0*0.82);
    c.px(x,y,P.paper); c.px(x+Math.sign(Math.cos(a)),y,P.paper); }
  if(phaseToHit>0.03) c.ring(cx,cy,r,P.heart,1);
  if(judge) c.textOutlined(judge, Math.round(cx-judge.length*2), Math.round(cy-r0-12), P.paper, P.ink);
};
