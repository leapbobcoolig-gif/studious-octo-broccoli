// =============================================================================
//  Bedroom engine v3: skinned MakeHuman bodies (CC0) + procedural genitals,
//  rasterised to a G-buffer with a shadow map, then turned into pixel art.
//  Units: metres. +y up, +z toward the camera (foot of the bed), bed top y=0.
// =============================================================================
'use strict';

// ------------------------------------------------------------------ math ----
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const len=a=>Math.hypot(a[0],a[1],a[2]), norm=a=>mul(a,1/(len(a)||1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const lerp3=(a,b,t)=>add(a,mul(sub(b,a),t));
const mixf=(a,b,t)=>a+(b-a)*t, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(e0,e1,x)=>{ const t=clamp((x-e0)/(e1-e0),0,1); return t*t*(3-2*t); };
const I3=[1,0,0,0,1,0,0,0,1];
const m3v=(M,v)=>[M[0]*v[0]+M[1]*v[1]+M[2]*v[2], M[3]*v[0]+M[4]*v[1]+M[5]*v[2], M[6]*v[0]+M[7]*v[1]+M[8]*v[2]];
const m3mul=(A,B)=>{ const o=new Array(9); for(let r=0;r<3;r++) for(let c=0;c<3;c++) o[r*3+c]=A[r*3]*B[c]+A[r*3+1]*B[3+c]+A[r*3+2]*B[6+c]; return o; };
const m3cols=(a,b,c)=>[a[0],b[0],c[0], a[1],b[1],c[1], a[2],b[2],c[2]];
const orthoTo=(v,axis)=>norm(sub(v, mul(axis, dot(v,axis))));
// rotation taking rest frame (dir d0, reference r0) onto (d1, r1)
function frameRot(d0,r0,d1,r1){
  const a0=norm(d0), b0=orthoTo(r0,a0), c0=cross(a0,b0);
  const a1=norm(d1), b1=orthoTo(r1,a1), c1=cross(a1,b1);
  const R=new Array(9);
  for(let r=0;r<3;r++) for(let c=0;c<3;c++) R[r*3+c]=a1[r]*a0[c]+b1[r]*b0[c]+c1[r]*c0[c];
  return R;
}
function axisAngle(axis,ang){ const [x,y,z]=norm(axis), c=Math.cos(ang), s=Math.sin(ang), t=1-c;
  return [t*x*x+c, t*x*y-s*z, t*x*z+s*y, t*x*y+s*z, t*y*y+c, t*y*z-s*x, t*x*z-s*y, t*y*z+s*x, t*z*z+c]; }
const rotv=(axis,ang,v)=>m3v(axisAngle(axis,ang),v);
// two-bone IK: returns the middle joint
function ik(a,c,l1,l2,pole){
  const ac=sub(c,a); let d=len(ac); const dir=norm(ac); d=Math.min(d,l1+l2-1e-4);
  const x=(l1*l1-l2*l2+d*d)/(2*d), h=Math.sqrt(Math.max(0,l1*l1-x*x));
  return add(a, add(mul(dir,x), mul(orthoTo(pole,dir),h)));
}
function bez(p0,p1,p2,t){ const u=1-t; return add(add(mul(p0,u*u),mul(p1,2*u*t)),mul(p2,t*t)); }
function bezT(p0,p1,p2,t){ return norm(add(mul(sub(p1,p0),2*(1-t)), mul(sub(p2,p1),2*t))); }
function spring(t,period,decay,freq){ const tt=((t%period)+period)%period; return Math.exp(-decay*tt)*Math.sin(freq*tt); }
function hash(n){ const s=Math.sin(n*127.1)*43758.5453; return s-Math.floor(s); }

const b64f=(s,T)=>{ const bin=atob(s); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return new T(u.buffer); };

// ------------------------------------------------------------------ human ---
class Human {
  constructor(H, shape){
    this.n=H.nverts; this.names=H.boneNames; this.parents=H.parents;
    this.idx=new Map(this.names.map((n,i)=>[n,i]));
    this.rest=b64f(H[shape].pos, Float32Array);
    this.rh=H[shape].bones.map(b=>b.h); this.rt=H[shape].bones.map(b=>b.t);
    this.tris=b64f(H.tris, Uint32Array); this.widx=b64f(H.widx, Uint8Array); this.wval=b64f(H.wval, Float32Array);
    const depth=i=>this.parents[i]<0?0:1+depth(this.parents[i]);
    this.order=[...this.names.keys()].sort((a,b)=>depth(a)-depth(b));
    this.pos=new Float32Array(this.n*3); this.nrm=new Float32Array(this.n*3); this.mat=new Float32Array(this.n);
    this.restN=new Float32Array(this.n*3); computeNormals(this.rest,this.tris,this.restN);
    this.disp=new Float32Array(this.n*3);
  }
  b(n){ const i=this.idx.get(n); if(i===undefined) throw new Error('bone '+n); return i; }
  restHead(n){ return this.rh[this.b(n)]; } restTail(n){ return this.rt[this.b(n)]; }
  rv(i){ return [this.rest[i*3],this.rest[i*3+1],this.rest[i*3+2]]; }
  // ctl: { boneName: (head, human) => worldRotation }
  pose(rootPos, ctl){
    const nb=this.names.length; this.R=new Array(nb); this.H=new Array(nb);
    for(const i of this.order){
      const p=this.parents[i];
      this.H[i]= p<0 ? rootPos : add(this.H[p], m3v(this.R[p], sub(this.rh[i], this.rh[p])));
      const f=ctl[this.names[i]];
      this.R[i]= f ? f(this.H[i], this) : (p<0 ? I3 : this.R[p]);
    }
  }
  // posed position of any rest point rigidly following bone n
  follow(n, pRest){ const i=this.b(n); return add(this.H[i], m3v(this.R[i], sub(pRest, this.rh[i]))); }
  posedTail(n){ return this.follow(n, this.restTail(n)); }
  skinOne(v){ let o=[0,0,0]; const p=[this.rest[v*3]+this.disp[v*3],this.rest[v*3+1]+this.disp[v*3+1],this.rest[v*3+2]+this.disp[v*3+2]];
    for(let k=0;k<4;k++){ const w=this.wval[v*4+k]; if(!w) continue; const b=this.widx[v*4+k];
      o=add(o, mul(add(this.H[b], m3v(this.R[b], sub(p,this.rh[b]))), w)); } return o; }
  skin(){
    const nb=this.names.length, M=new Float32Array(nb*12);
    for(let b=0;b<nb;b++){ const R=this.R[b], T=sub(this.H[b], m3v(R,this.rh[b]));
      M.set([R[0],R[1],R[2],T[0],R[3],R[4],R[5],T[1],R[6],R[7],R[8],T[2]], b*12); }
    const P=this.pos, S=this.rest, D=this.disp, wi=this.widx, wv=this.wval;
    for(let v=0;v<this.n;v++){
      const x=S[v*3]+D[v*3], y=S[v*3+1]+D[v*3+1], z=S[v*3+2]+D[v*3+2]; let ox=0,oy=0,oz=0;
      for(let k=0;k<4;k++){ const w=wv[v*4+k]; if(!w) continue; const o=wi[v*4+k]*12;
        ox+=w*(M[o]*x+M[o+1]*y+M[o+2]*z+M[o+3]); oy+=w*(M[o+4]*x+M[o+5]*y+M[o+6]*z+M[o+7]); oz+=w*(M[o+8]*x+M[o+9]*y+M[o+10]*z+M[o+11]); }
      P[v*3]=ox; P[v*3+1]=oy; P[v*3+2]=oz;
    }
    computeNormals(P,this.tris,this.nrm);
  }
  // dominant bone of a vertex
  domBone(v){ return this.names[this.widx[v*4]]; }
  findVert(pred, score){ let best=-1, bs=Infinity; for(let v=0;v<this.n;v++){ const p=this.rv(v); if(!pred(p,v)) continue; const s=score(p,v); if(s<bs){bs=s;best=v;} } return best; }
}
function computeNormals(P,T,N){
  N.fill(0);
  for(let t=0;t<T.length;t+=3){ const a=T[t]*3,b=T[t+1]*3,c=T[t+2]*3;
    const ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2], vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];
    const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
    for(const i of [a,b,c]){ N[i]+=nx; N[i+1]+=ny; N[i+2]+=nz; } }
  for(let i=0;i<N.length;i+=3){ const l=Math.hypot(N[i],N[i+1],N[i+2])||1; N[i]/=l; N[i+1]/=l; N[i+2]/=l; }
}

// ------------------------------------------------------- pose controllers --
// aim a (possibly multi-segment) limb so rest line from->to points at target
function aimCtl(h, fromBone, toJoint, target, refRest, refWorld){
  return (head)=>{
    const d0=sub(toJoint, h.restHead(fromBone));
    const d1=sub(typeof target==='function'?target(head):target, head);
    const r1=typeof refWorld==='function'?refWorld(head):refWorld;
    return frameRot(d0, refRest, d1, r1);
  };
}

// ---------------------------------------------------------------- meshes ----
class Mesh { constructor(){ this.p=[]; this.n=[]; this.m=[]; this.i=[]; }
  vert(p,n,m){ this.p.push(p[0],p[1],p[2]); this.n.push(n[0],n[1],n[2]); this.m.push(m); return this.p.length/3-1; }
  quad(a,b,c,d){ this.i.push(a,b,c,a,c,d); }
  finish(){ return {pos:new Float32Array(this.p), nrm:new Float32Array(this.n), mat:new Float32Array(this.m), idx:new Uint32Array(this.i)}; }
}
function roundedBox(M, c, h, r, mat, n=4){
  const faces=[[0,1,2],[1,2,0],[2,0,1]];
  for(let f=0;f<3;f++){ const [ax,u,v]=faces[f]; for(const s of [-1,1]){
    const base=M.p.length/3;
    for(let j=0;j<=n;j++) for(let i=0;i<=n;i++){
      const q=[0,0,0]; q[ax]=s*h[ax]; q[u]=(-1+2*i/n)*h[u]; q[v]=(-1+2*j/n)*h[v];
      const inner=q.map((x,k)=>clamp(x,-(h[k]-r),h[k]-r)); const d=sub(q,inner); const dl=len(d)||1;
      const p=r>0? add(inner, mul(d, r/dl)) : q; const nn=r>0? mul(d,1/dl) : (()=>{const z=[0,0,0]; z[ax]=s; return z;})();
      M.vert(add(c,p), nn, mat);
    }
    for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const a=base+j*(n+1)+i, b=a+1, cc=a+n+2, d=a+n+1;
      // keep winding consistent per face sign (we shade double-sided anyway)
      M.quad(a,b,cc,d); }
  } }
}
// lat-long ellipsoid-ish blob with a radius function in a local frame
function blob(M, c, X, Y, Z, radius, mat, nu=20, nv=14, post){
  const base=M.p.length/3;
  for(let j=0;j<=nv;j++){ const ph=Math.PI*j/nv;
    for(let i=0;i<=nu;i++){ const th=2*Math.PI*i/nu;
      const dir=[Math.sin(ph)*Math.cos(th), Math.cos(ph), Math.sin(ph)*Math.sin(th)];
      const r=radius(th,ph,dir);
      let lp=[dir[0]*r[0], dir[1]*r[1], dir[2]*r[2]];
      let wp=add(c, add(mul(X,lp[0]), add(mul(Y,lp[1]), mul(Z,lp[2]))));
      if(post) wp=post(wp,th,ph);
      M.vert(wp,[0,1,0],typeof mat==='function'?mat(th,ph):mat);
    } }
  for(let j=0;j<nv;j++) for(let i=0;i<nu;i++){ const a=base+j*(nu+1)+i; M.quad(a,a+1,a+nu+2,a+nu+1); }
}
function smoothNormals(m){ computeNormals(m.pos,m.idx,m.nrm); return m; }

// ------------------------------------------------------------------ scene ---
function buildRoom(){
  const M=new Mesh();
  roundedBox(M,[0,-0.62,0],[4,0.06,4],0,1,1);                       // floor
  roundedBox(M,[0,1.2,-1.36],[4,1.9,0.06],0,2,1);                   // back wall
  for(const sx of [-1,1]){
    // window: frame + glass + sill
    roundedBox(M,[sx*1.22,0.84,-1.295],[0.42,0.42,0.02],0.004,13,2);
    roundedBox(M,[sx*1.22,0.84,-1.28],[0.38,0.38,0.008],0,17,1);
    roundedBox(M,[sx*1.22,0.84,-1.275],[0.012,0.38,0.012],0.003,13,1);
    roundedBox(M,[sx*1.22,0.41,-1.25],[0.46,0.022,0.06],0.006,13,2);
    // dresser
    const dc=[sx*1.30,-0.20,-1.05];
    roundedBox(M,dc,[0.36,0.40,0.25],0.012,3,3);
    roundedBox(M,add(dc,[0,0.415,0]),[0.38,0.018,0.27],0.006,3,2);
    for(let d=0;d<3;d++){ const y=-0.26+d*0.26;
      roundedBox(M,add(dc,[0,y+0.0,0.25]),[0.33,0.115,0.012],0.008,3,2);
      roundedBox(M,add(dc,[0,y+0.0,0.268]),[0.05,0.012,0.008],0.004,13,1); }
    roundedBox(M,add(dc,[-0.3,-0.43,0.2]),[0.03,0.03,0.03],0.004,3,1); roundedBox(M,add(dc,[0.3,-0.43,0.2]),[0.03,0.03,0.03],0.004,3,1);
  }
  // bed
  roundedBox(M,[0,-0.12,-0.04],[0.80,0.12,1.02],0.07,4,8);          // mattress
  roundedBox(M,[0,-0.31,-0.04],[0.85,0.07,1.06],0.015,3,3);         // frame
  for(const sx of [-1,1]) for(const sz of [-1,1]) roundedBox(M,[sx*0.79,-0.47,-0.04+sz*1.0],[0.035,0.11,0.035],0.006,3,1);
  roundedBox(M,[0,0.20,-1.11],[0.86,0.56,0.04],0.02,3,3);            // headboard
  roundedBox(M,[0,0.24,-1.06],[0.72,0.38,0.035],0.05,4,5);           // padded panel
  for(let i=0;i<5;i++) for(let j=0;j<3;j++) roundedBox(M,[-0.56+i*0.28,0.05+j*0.17,-1.022],[0.012,0.012,0.006],0.006,13,1);
  blob(M,[0,0.07,-0.86],[1,0,0],[0,1,0],[0,0,1],()=>[0.40,0.08,0.17],4,24,10);  // pillow
  return smoothNormals(M.finish());
}

// ---------------------------------------------------------- characters -----
function setupFemale(h){
  // stockings: thigh-high fishnet, lace band, solid feet
  const hipY=h.restHead('upperleg01.L')[1], kneeY=h.restHead('lowerleg01.L')[1];
  for(let v=0;v<h.n;v++){
    const p=h.rv(v), b=h.domBone(v);
    let m=5;
    const leg=/upperleg02|lowerleg|foot|toe/.test(b);
    if(leg){ const t=(hipY-p[1])/(hipY-kneeY); if(t>0.40) m=6; else if(t>0.33) m=16; }
    h.mat[v]=m;
  }
  // anatomical anchors (rest pose)
  const crotch=h.findVert(p=>Math.abs(p[0])<0.012 && p[1]>0.55 && p[1]<0.95, p=>p[1]);
  const cp=h.rv(crotch);
  // corrective rig: glutes ride with the pelvis (not the thighs / lower spine) so a folded
  // hip keeps a round ass instead of collapsing into the crease
  {
    const cy=h.rv(h.findVert(p=>Math.abs(p[0])<0.012 && p[1]>0.55 && p[1]<0.95, p=>p[1]))[1];
    const pl=h.b('pelvis.L'), pr=h.b('pelvis.R');
    h.buttMask=new Float32Array(h.n);
    const hz=h.restHead('upperleg01.L')[2], hx=h.restHead('upperleg01.L')[0];
    for(let v=0;v<h.n;v++){ const p=h.rv(v); if(p[2]>hz-0.015) continue;
      const c=[Math.sign(p[0]||1)*0.075, cy+0.08, -0.085];
      const d=Math.hypot((p[0]-c[0])/0.9,(p[1]-c[1])/1.1,(p[2]-c[2])/1.0);
      let m=1-smooth(0.05,0.13,d);
      m*=smooth(-0.005,0.03,p[1]-cy);                                 // fade out at the gluteal fold
      m*=1-smooth(hx-0.01,hx+0.05,Math.abs(p[0]));                     // never the outer hip / thigh
      m*=smooth(0.0,0.05,hz-p[2]);                                     // only the back of the pelvis
      if(m<=0) continue;
      h.buttMask[v]=m;
      const tgt=p[0]>=0?pl:pr; let moved=0;
      for(let k=0;k<4;k++){ const b=h.names[h.widx[v*4+k]]; if(/upperleg|spine05|spine04/.test(b)){ const take=h.wval[v*4+k]*m*(/spine/.test(b)?0.8:0.85); h.wval[v*4+k]-=take; moved+=take; } }
      // put moved weight on the pelvis slot (reuse an existing pelvis slot or the smallest one)
      let slot=-1; for(let k=0;k<4;k++) if(h.widx[v*4+k]===tgt) slot=k;
      if(slot<0){ let mn=9; for(let k=0;k<4;k++) if(h.wval[v*4+k]<mn){ mn=h.wval[v*4+k]; slot=k; } moved+=h.wval[v*4+slot]; h.wval[v*4+slot]=0; h.widx[v*4+slot]=tgt; }
      h.wval[v*4+slot]+=moved;
    }
  }
  { const cy=h.rv(crotch)[1]; h.crackMask=new Float32Array(h.n);
    for(let v=0;v<h.n;v++){ const p=h.rv(v); if(p[2]>-0.03 || p[1]<cy+0.012 || p[1]>cy+0.20) continue;
      h.crackMask[v]=Math.exp(-((p[0]/0.016)**2))*smooth(cy+0.012,cy+0.05,p[1])*(1-smooth(cy+0.14,cy+0.20,p[1])); } }
  const near=(c,r)=>{ const o=[]; for(let v=0;v<h.n;v++){ const p=h.rv(v); if(len(sub(p,c))<r) o.push(v); } return o; };
  const vr=[0, cp[1]+0.004, cp[2]+0.014];
  // vulva region rides the pelvis (root), so spreading thighs can't smear it sideways
  { const root=h.b('root');
    for(let v=0;v<h.n;v++){ const p=h.rv(v); const d=len(sub(p,[0,vr[1]+0.01,vr[2]+0.005])); const m=1-smooth(0.03,0.075,d); if(m<=0) continue;
      let moved=0; for(let k=0;k<4;k++){ const b=h.names[h.widx[v*4+k]]; if(/upperleg|spine05|spine04/.test(b)){ const take=h.wval[v*4+k]*m; h.wval[v*4+k]-=take; moved+=take; } }
      let slot=-1; for(let k=0;k<4;k++) if(h.widx[v*4+k]===root) slot=k;
      if(slot<0){ let mn=9; for(let k=0;k<4;k++) if(h.wval[v*4+k]<mn){ mn=h.wval[v*4+k]; slot=k; } moved+=h.wval[v*4+slot]; h.wval[v*4+slot]=0; h.widx[v*4+slot]=root; }
      h.wval[v*4+slot]+=moved; } }
  h.anchor={
    crotch,
    vulva:near(vr,0.022).filter(v=>Math.abs(h.rv(v)[0])<0.025),
    mons:near([0,cp[1]+0.025,cp[2]+0.065],0.03).filter(v=>Math.abs(h.rv(v)[0])<0.02),
    anus:near([0,cp[1]+0.034,cp[2]-0.05],0.012),
    cheekL:[0.085, cp[1]+0.06, cp[2]-0.11], cheekR:[-0.085, cp[1]+0.06, cp[2]-0.11],
  };
}
function setupMale(h){
  let top=0; for(let v=0;v<h.n;v++) top=Math.max(top,h.rest[v*3+1]);
  for(let v=0;v<h.n;v++){
    const [x,y,z]=h.rv(v), ax=Math.abs(x); let m=10;
    const ear = ax>0.066 && y>top-0.15 && y<top-0.06 && z>-0.035 && z<0.045;
    const nape = z<-0.02 && y>top-0.165;
    const sides = z>=-0.02 && z<0.055 && y>top-0.10 && !(ax>0.066 && y<top-0.055);
    const front = z>=0.055 && y>top-0.045 + Math.max(0,(z-0.09))*0.4;
    if(!ear && (nape||sides||front) && y>top-0.2) m=12;
    h.mat[v]=m;
  }
  const crotch=h.findVert(p=>Math.abs(p[0])<0.012 && p[1]>0.6 && p[1]<1.0, p=>p[1]);
  const cp=h.rv(crotch);
  h.anchor={
    crotch,
    pubis:h.findVert(p=>Math.abs(p[0])<0.012 && p[1]>cp[1]+0.025 && p[1]<cp[1]+0.08, p=>-p[2]),
    gluteL:[0.075, cp[1]+0.07, cp[2]-0.10], gluteR:[-0.075, cp[1]+0.07, cp[2]-0.10],
  };
}
// per-frame soft deformers in rest space (jiggle, clench, hair volume)
function deformFemale(h, jig){
  const D=h.disp, N=h.restN, M=h.buttMask, C=h.crackMask;
  for(let v=0;v<h.n;v++){ const m=M[v], c=C[v];
    if(!m && !c){ D[v*3]=D[v*3+1]=D[v*3+2]=0; continue; }
    const full=0.016*m*m;                       // stretched glutes read rounder
    const j=0.010*m*jig;                        // ripple after each slam
    const cr=-0.013*c;                          // deepen the cleft between the cheeks
    D[v*3]=N[v*3]*(full+cr) + Math.sign(h.rest[v*3])*0.003*m*jig; D[v*3+1]=N[v*3+1]*(full+cr) - j; D[v*3+2]=N[v*3+2]*(full+cr) + 0.5*j; }
}
function deformMale(h, clench){
  const D=h.disp; D.fill(0);
  for(const c of [h.anchor.gluteL,h.anchor.gluteR]){
    for(let v=0;v<h.n;v++){ const p=h.rv(v); const d=len(sub(p,c)); if(d>0.14) continue;
      const w=(1-smooth(0.03,0.14,d))*clench;
      D[v*3]+= -Math.sign(p[0])*0.006*w; D[v*3+2]+= -0.004*w; }
  }
  const cy=h.rv(h.anchor.crotch)[1];
  for(let v=0;v<h.n;v++){ const p=h.rv(v); if(p[2]>-0.03 || p[1]<cy+0.01 || p[1]>cy+0.22) continue;
    const c=Math.exp(-((p[0]/0.014)**2))*smooth(cy+0.01,cy+0.05,p[1])*(1-smooth(cy+0.16,cy+0.22,p[1]));
    D[v*3]-=h.restN[v*3]*0.010*c; D[v*3+1]-=h.restN[v*3+1]*0.010*c; D[v*3+2]-=h.restN[v*3+2]*0.010*c; }
  hairStyle(h, h.style||'swoop');
}
// sculpt hair out of the scalp: volume + chunky locks; 'swoop' pulls a fringe over one brow
function hairStyle(h, style){
  const D=h.disp, N=h.restN; let top=h.top;
  if(!top){ top=0; for(let v=0;v<h.n;v++) top=Math.max(top,h.rest[v*3+1]); h.top=top; }
  for(let v=0;v<h.n;v++){ if(h.mat[v]!==12) continue; const [x,y,z]=h.rv(v);
    const a=Math.atan2(x,z), up=smooth(top-0.16,top-0.01,y);
    let t;
    if(style==='buzz') t=0.004+0.002*up;
    else if(style==='curly') t=0.012+0.016*up + 0.007*Math.abs(Math.sin(a*7)*Math.sin(y*90));
    else t=0.008+0.024*up + 0.006*Math.max(0,Math.sin(a*6+y*30));          // swoop: tall, clumped
    let d=[N[v*3]*t, N[v*3+1]*t, N[v*3+2]*t];
    if(style==='swoop' && z>0.02 && y>top-0.075){                          // fringe: front locks fall forward + across
      const f=smooth(0.02,0.10,z)*smooth(top-0.075,top-0.03,y);
      d=add(d,[ -0.018*f + 0.010*f*Math.sin(x*60), -0.030*f, 0.022*f ]); }
    D[v*3]+=d[0]; D[v*3+1]+=d[1]; D[v*3+2]+=d[2]; }
}

// ------------------------------------------------------------- the press ---
function posePress(her, him, t, o={}){
  const k=(o.kinsey??3)/6;                                            // 1 = still in denial, 0 = converted
  const bpm=o.bpm||mixf(150,78,k), period=60/bpm, ph=((t/period)%1+1)%1;
  const slam=mixf(0.22,0.40,k);                                      // converted guys slam fast
  const out = (ph<slam ? 1-(ph/slam)**1.6 : ((ph-slam)/(1-slam))**0.85) * mixf(1.0,0.62,k);   // 1 = pulled back, 0 = balls deep
  o._period=period; o._slam=slam;
  const impact=t-period*slam;
  const hard=mixf(1.25,0.55,k);
  const jig=hard*spring(impact,period,9,30), swing=hard*spring(impact-0.02,period,6,19);
  const S={out,jig,swing};

  // ---------------- HER: on her back, hips rolled up, legs folded back
  const roll=o.roll??1.48;                                    // pelvis tilt (radians from flat)
  const Yp=norm([0,-Math.sin(roll),-Math.cos(roll)]), Zp=norm([0,Math.cos(roll),-Math.sin(roll)]);
  const herRootR=m3cols(cross(Yp,Zp),Yp,Zp);
  const press=1-out;
  const hctl={
    root:()=>herRootR,
  };
  const spineBones=['spine05','spine04','spine03','spine02','spine01'];
  const sp0=()=>her.H[her.b('spine05')];
  const restSpineLen=len(sub(her.restTail('spine01'),her.restHead('spine05')));
  let acc=0; const segs=spineBones.map(n=>{ const l=len(sub(her.restTail(n),her.restHead(n))); const a=acc; acc+=l; return [n,a,l]; });
  for(const [n,a,l] of segs){
    hctl[n]=(head)=>{ const P0=sp0(), P1=add(P0,add(mul(Yp,0.11),[0,0,-0.07])), P2=[0,P0[1]-0.20,P0[2]-0.52];
      const tt=(a+l*0.5)/acc; const d=bezT(P0,P1,P2,tt);
      return frameRot(sub(her.restTail(n),her.restHead(n)),[0,0,1], d, cross(d,[1,0,0]).map(x=>-x)); };
  }
  for(const n of ['neck01','neck02','neck03']) hctl[n]=(head)=>frameRot(sub(her.restTail(n),her.restHead(n)),[0,0,1],[0,0.25,-1],[0,1,0.25]);
  hctl.head=(head)=>frameRot(sub(her.restTail('head'),her.restHead('head')),[0,0,1],[0,0.15,-1],[0,1,0.1]);
  // legs: real joint angles in her pelvis frame. hip flexion phi, abduction alpha, knee bend kappa.
  // a knee only folds the calf toward the BACK of the thigh, never past straight.
  const PX=[1,0,0];
  const toW=(l)=>add(add(mul(PX,l[0]),mul(Yp,l[1])),mul(Zp,l[2]));
  for(const [s,k] of [[1,'L'],[-1,'R']]){
    const phi=(o.hipFlex??1.38) + press*0.05 + jig*0.01, alpha=(o.hipAbd??0.42)+press*0.03, kappa=(o.kneeBend??0.95) + jig*0.03;
    // thigh direction + kneecap (front) direction, pelvis-local: x=her left, y=toward head, z=belly
    let td=[0,-Math.cos(phi),Math.sin(phi)], tf=[0,Math.sin(phi),Math.cos(phi)];
    const ab=axisAngle([0,0,1], s*alpha);                       // spread around the belly axis
    td=m3v(ab,td); tf=m3v(ab,tf);
    const cd=add(mul(td,Math.cos(kappa)), mul(tf,-Math.sin(kappa)));   // calf folds toward back of thigh
    const cf=add(mul(tf,Math.cos(kappa)), mul(td,Math.sin(kappa)));
    const TD=toW(td), TF=toW(tf), CD=toW(cd), CF=toW(cf);
    const hipB='upperleg01.'+k, kneeRest=her.restHead('lowerleg01.'+k), ankRest=her.restHead('foot.'+k), toeRest=her.restTail('foot.'+k);
    hctl[hipB]=()=>frameRot(sub(kneeRest,her.restHead(hipB)),[0,0,1], TD, TF);
    hctl['lowerleg01.'+k]=()=>frameRot(sub(ankRest,kneeRest),[0,0,1], CD, CF);
    const FD=norm(add(mul(CD,0.85),mul(CF,0.55)));               // pointed toes
    hctl['foot.'+k]=()=>frameRot(sub(toeRest,ankRest),[0,1,0], FD, mul(CD,-1));
    // arms up by her head on the pillow
    const sh=()=>her.H[her.b('upperarm01.'+k)];
    const elb=[s*0.27,0.10,-0.78], hand=[s*0.15,0.15,-0.93];
    const elbRest=her.restHead('lowerarm01.'+k), wrRest=her.restHead('wrist.'+k);
    hctl['upperarm01.'+k]=(head)=>frameRot(sub(elbRest,her.restHead('upperarm01.'+k)),[0,0,-1], sub(elb,head), sub(elb, lerp3(head,hand,0.5)));
    hctl['lowerarm01.'+k]=(head)=>frameRot(sub(wrRest,elbRest),[0,0,-1], sub(hand,head), sub(elb, lerp3(sh(),hand,0.5)));
  }
  deformFemale(her, jig*(0.35+0.65*smooth(0.0,0.15,1-out)));
  const herRoot=o.herRoot||[0,0.255,0.02];
  her.pose(herRoot, hctl); her.skin();
  { let mn=9; for(let v=0;v<her.n;v++){ const b=her.domBone(v); if(/spine0[1-3]|clavicle|shoulder01|neck/.test(b)) mn=Math.min(mn, her.pos[v*3+1]); }
    const dy=0.012-mn; for(let v=0;v<her.n;v++) her.pos[v*3+1]+=dy; for(let i=0;i<her.H.length;i++) her.H[i]=add(her.H[i],[0,dy,0]); S.herDrop=dy; }

  // vulva frame from the posed mesh (averaged symmetric patches)
  const avg=(set,arr)=>{ let o=[0,0,0]; for(const v of set) o=add(o,[arr[v*3],arr[v*3+1],arr[v*3+2]]); return mul(o,1/set.length); };
  const A=her.anchor;
  const vC=avg(A.vulva,her.pos), vM=avg(A.mons,her.pos), vA=avg(A.anus,her.pos);
  const U=norm(avg(A.vulva,her.nrm));                   // out of the vulva
  const Ax=orthoTo(sub(vM,vC),U);                       // toward her mons
  const Xs=norm(cross(U,Ax));
  const V=add(vC, mul(U,-0.002));
  S.V=V; S.U=U; S.Ax=Ax; S.Xs=Xs; S.anus=vA; S.anusN=norm(avg(A.anus,her.nrm));
  // ---------------- HIM: cock axis = U, body hangs off the root
  const L=o.len||0.215, depth=mixf(0.19,0.016,out);
  const Rt=add(V, mul(U, L-depth));
  S.L=L; S.depth=depth; S.root=Rt;
  const T=norm([0, 0.22-out*0.07, -0.97]);                     // torso axis toward his head
  const Bk=norm(cross([1,0,0],T)); const B=Bk[1]<0?mul(Bk,-1):Bk; // back normal
  const pelvisPitch = 0.10+out*0.12;                           // tilt hips under on the slam
  const Yr=norm(rotv([1,0,0],-pelvisPitch,T)), Zr=norm(rotv([1,0,0],-pelvisPitch,mul(B,-1)));
  const himRootR=m3cols(cross(Yr,Zr),Yr,Zr);
  S.T=T; S.B=B;
  const mctl={ root:()=>himRootR };
  const mspine=['spine05','spine04','spine03','spine02','spine01'];
  let macc=0; const msegs=mspine.map(n=>{ const l=len(sub(him.restTail(n),him.restHead(n))); const a=macc; macc+=l; return [n,a,l]; });
  for(const [n,a,l] of msegs){
    mctl[n]=(head)=>{ const tt=(a+l*0.5)/macc;
      // slight arch: lower back dips, upper back rounds over her
      const d=norm(add(T, mul(B, -0.18+0.36*tt)));
      return frameRot(sub(him.restTail(n),him.restHead(n)),[0,0,1], d, mul(B,-1)); };
  }
  for(const n of ['neck01','neck02','neck03']) mctl[n]=()=>frameRot(sub(him.restTail(n),him.restHead(n)),[0,0,1], norm(add(T,mul(B,0.05))), mul(B,-1));
  mctl.head=()=>{ const d=norm(add(T,mul(B,-0.55))); return frameRot(sub(him.restTail('head'),him.restHead('head')),[0,0,1], d, cross([-1,0,0],d)); };
  for(const [s,k] of [[-1,'L'],[1,'R']]){   // his left is world -x
    const hipB='upperleg01.'+k, kneeRest=him.restHead('lowerleg01.'+k), ankRest=him.restHead('foot.'+k), toeRest=him.restTail('foot.'+k);
    const lt=len(sub(kneeRest,him.restHead(hipB))), ls=len(sub(ankRest,kneeRest));
    // squat press: her hips are up in a candle, so he squats over her. feet planted beside her ass
    // (heels up, on the balls of his feet), knees driven forward beside her folded thighs.
    const ank=[s*(o.footX??0.27), 0.125, (o.ankZ??0.04)];
    const kneeOf=(hip)=>ik(hip, ank, lt, ls, [s*(o.kneeOut??0.22),0.3,-1]);
    mctl[hipB]=(head)=>{ const kn=kneeOf(head); return frameRot(sub(kneeRest,him.restHead(hipB)),[0,0,1], sub(kn,head), sub(kn, lerp3(head,ank,0.5))); };
    mctl['lowerleg01.'+k]=(head)=>{ const hip=him.H[him.b(hipB)]; const kn=kneeOf(hip); return frameRot(sub(ankRest,kneeRest),[0,0,1], sub(ank,head), sub(kn, lerp3(hip,ank,0.5))); };
    mctl['foot.'+k]=()=>frameRot(sub(toeRest,ankRest),[0,1,0], [s*0.15,-0.62,-0.78], [0,0.78,-0.62]);
    // arms: hands planted on the bed beside her chest
    const shB='upperarm01.'+k, elbRest=him.restHead('lowerarm01.'+k), wrRest=him.restHead('wrist.'+k), fRest=him.restTail('wrist.'+k);
    const la=len(sub(elbRest,him.restHead(shB))), lf=len(sub(wrRest,elbRest));
    const wrist=[s*0.29,0.075,-0.46];
    const elbOf=(sh)=>ik(sh, wrist, la, lf, [s*1,0.5,0.6]);
    mctl[shB]=(head)=>{ const e=elbOf(head); return frameRot(sub(elbRest,him.restHead(shB)),[0,0,-1], sub(e,head), sub(e, lerp3(head,wrist,0.5))); };
    mctl['lowerarm01.'+k]=(head)=>{ const sh=him.H[him.b(shB)]; const e=elbOf(sh); return frameRot(sub(wrRest,elbRest),[0,0,-1], sub(wrist,head), sub(e, lerp3(sh,wrist,0.5))); };
    mctl['wrist.'+k]=()=>frameRot(sub(fRest,wrRest),[s>0?1:-1,0,0], [0,-0.35,-1], [0,-1,0.3]);
  }
  deformMale(him, out<0.2?1-out/0.2:0);
  // place him so his pubis sits on the cock root: two passes (pose, measure, shift)
  let rootPos=add(Rt,[0,0.1,0.05]);
  for(let pass=0;pass<2;pass++){
    him.pose(rootPos, mctl);
    const pub=him.skinOne(him.anchor.pubis);
    const target=add(Rt, add(mul(U,-0.004), mul(T,0.0)));
    rootPos=add(rootPos, sub(target,pub));
  }
  him.pose(rootPos, mctl); him.skin();
  return S;
}

// ----------------------------------------------------- genital geometry -----
function buildGenitals(S, him){
  const M=new Mesh();
  // ---- cock: tube from root (inside his pubis) down into her, veined, flared glans
  const D=mul(S.U,-1);                                   // root -> tip
  const dors=orthoTo(S.T, D);                            // top side faces his belly / head
  const side=cross(D,dors);
  const L=S.L, r0=0.0275, nS=34, nT=20;
  const base=M.p.length/3;
  for(let i=0;i<=nS;i++){ const s=i/nS;
    const c=add(add(S.root, mul(D, -0.012 + s*L)), mul(dors, 0.010*(s*s-s)));
    let r = s<0.80 ? r0*(1-0.08*s) + 0.0006*Math.sin(s*9) : 0;
    let m = s<0.80 ? 11 : 14;
    if(s>=0.80){ const g=(s-0.80)/0.20; r = g<0.12 ? r0*(0.95+0.12*smooth(0,0.12,g)) : r0*1.07*Math.sqrt(Math.max(0,1-((g-0.12)/0.88)**1.6)); }
    for(let j=0;j<=nT;j++){ const th=2*Math.PI*j/nT;
      const rad=add(mul(dors,Math.cos(th)), mul(side,Math.sin(th)));
      let rr=r;
      if(s<0.78){ const vth=0.6+1.6*s+0.4*Math.sin(s*7); const dv=Math.cos(th-vth); rr+=0.0016*Math.max(0,dv)**30; // vein
                  const dv2=Math.cos(th+2.2-1.2*s); rr+=0.0011*Math.max(0,dv2)**40; }
      if(s<0.80 && Math.abs(Math.cos(th)+1)<0.02) rr-=0.0006;                                        // underside ridge
      M.vert(add(c,mul(rad,rr)), rad, m);
    } }
  for(let i=0;i<nS;i++) for(let j=0;j<nT;j++){ const a=base+i*(nT+1)+j; M.quad(a,a+1,a+nT+2,a+nT+1); }

  // ---- balls: two-lobed sack, neck tucks up toward his perineum, wrinkled, sags + swings, squashes on her
  const up=[0,1,0];
  const back=norm(orthoTo(mul(S.T,-1),up));             // toward his legs / camera
  const sx=norm(cross(up,back));
  const sag=1+0.10*Math.max(0,-S.swing)*(0.4+S.out)+0.08*S.out;
  const cB=add(add(S.root, [0,-0.026*sag-0.012*S.out,0]), mul(back,0.060+0.006*S.swing));
  const neckTo=add(add(S.root, mul(back,0.040)),[0,0.012,0]);             // where the sack joins the body
  blob(M, cB, sx, up, back, (th,ph)=>{
    const lobes=1+0.30*Math.cos(2*th)*Math.sin(ph)**2;
    let r=0.046*lobes;
    const raphe=Math.exp(-((((th%Math.PI)-Math.PI/2)/0.12)**2))*smooth(0.5,1.4,ph);
    r-=0.0045*raphe;
    r+=0.0009*Math.sin(15*th+11*ph)*Math.sin(ph);
    return [r*1.18, r*1.10*sag, r*0.92];
  }, (th,ph)=>{ const w=Math.sin(13*th+8*ph+0.6*Math.sin(5*th)); const raphe=Math.abs(Math.cos(th))<0.1 && ph>0.7;
    const raphe2=Math.abs(Math.cos(th))<0.07 && ph>0.55; return (ph>0.5 && w>0.9) || raphe2 ? 18 : 11; }, 30, 20, (p,th,ph)=>{
    // pull the top of the sack into the neck so it grows out of him, not a ball on a stick
    const k=ph<0.9? (1-smooth(0,0.9,ph))**1.5 : 0; let q=lerp3(p, add(neckTo, mul(sub(p,cB),0.35)), k*0.85);
    const d=dot(sub(q,S.V),S.U); return d<0.006? add(q, mul(S.U,0.006-d)) : q; });

  // ---- her vulva: puffy outer lips, pink inner, a stretched ring gripping the shaft, little pucker
  const V=S.V, Ax=S.Ax, U=S.U, Xs=S.Xs;
  const rs=0.026;                                    // shaft radius at entry
  for(const sd of [-1,1]){
    const c=add(add(add(V, mul(Ax,0.026)), mul(Xs, sd*(rs+0.012))), mul(U,-0.004));
    blob(M, c, Xs, U, Ax, (th,ph)=>[0.020, 0.019, 0.060*(1-0.12*Math.max(0,Math.cos(ph)))], 7, 18, 14);
  }
  blob(M, add(add(V, mul(Ax,0.02)), mul(U,-0.007)), Xs, U, Ax, ()=>[rs+0.006,0.011,0.044], 8, 16, 10);
  // the grip: pink ring hugging the shaft, dragged outward on the pull
  { const drag=0.006+0.014*S.out, ringR=rs+0.004, tube=0.0055, nu=24, nv=8, base=M.p.length/3;
    const c0=add(V, mul(U, drag));
    for(let j=0;j<=nv;j++){ const b=2*Math.PI*j/nv; for(let i=0;i<=nu;i++){ const a=2*Math.PI*i/nu;
      const radial=add(mul(Xs,Math.cos(a)), mul(Ax,Math.sin(a)));
      const p=add(c0, add(mul(radial, ringR+tube*Math.cos(b)), mul(U, tube*Math.sin(b)*0.8)));
      M.vert(p,[0,1,0],8); } }
    for(let j=0;j<nv;j++) for(let i=0;i<nu;i++){ const a=base+j*(nu+1)+i; M.quad(a,a+1,a+nu+2,a+nu+1); } }
  // anus
  const aN=norm(S.anusN);
  blob(M, add(S.anus, mul(aN,-0.0015)), norm(cross(aN,Ax)), aN, norm(cross(cross(aN,Ax),aN)),
       (th,ph)=>{ const r=0.0095*(1+0.2*Math.sin(9*th)*Math.sin(ph)); return [r,0.0024,r]; }, 9, 18, 8);
  return smoothNormals(M.finish());
}

// ---------------------------------------------------------------- WebGL ----
const GL={};
function glInit(){
  const c=document.createElement('canvas'); const gl=c.getContext('webgl2',{antialias:false}); GL.gl=gl;
  gl.getExtension('EXT_color_buffer_float');
  const sh=(type,src)=>{ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog=(vs,fs)=>{ const p=gl.createProgram(); gl.attachShader(p,sh(gl.VERTEX_SHADER,vs)); gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));
    gl.bindAttribLocation(p,0,'aP'); gl.bindAttribLocation(p,1,'aN'); gl.bindAttribLocation(p,2,'aM'); gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  GL.gbuf=prog(`#version 300 es
    in vec3 aP; in vec3 aN; in float aM; uniform mat4 uVP; out vec3 vW; out vec3 vN; flat out float vM;
    void main(){ vW=aP; vN=aN; vM=aM; gl_Position=uVP*vec4(aP,1.); }`,
  `#version 300 es
    precision highp float; precision highp sampler2DShadow;
    in vec3 vW; in vec3 vN; flat in float vM;
    uniform vec3 uCam, uL; uniform mat4 uLVP; uniform sampler2DShadow uSh; uniform float uShTex;
    layout(location=0) out vec4 o0; layout(location=1) out vec4 o1; layout(location=2) out vec4 o2;
    void main(){
      vec3 n=normalize(vN); vec3 v=normalize(uCam-vW); if(dot(n,v)<0.) n=-n;
      float key=max(dot(n,uL),0.);
      vec4 lp=uLVP*vec4(vW+n*0.006,1.); vec3 sc=lp.xyz/lp.w*0.5+0.5; float s=0.;
      for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++) s+=texture(uSh, vec3(sc.xy+vec2(x,y)/uShTex, sc.z-0.0008));
      s/=9.;
      vec3 h=normalize(uL+v);
      float spec=pow(max(dot(n,h),0.),56.)*s;
      float rim=pow(1.-max(dot(n,v),0.),3.)*max(dot(n,normalize(vec3(0.6,0.7,-0.6))),0.);
      o0=vec4(vM, length(uCam-vW), key*s, key);
      o1=vec4(n, max(dot(n,v),0.));
      o2=vec4(spec, rim, vW.x, vW.y);
    }`);
  GL.depth=prog(`#version 300 es
    in vec3 aP; in vec3 aN; in float aM; uniform mat4 uVP; void main(){ gl_Position=uVP*vec4(aP,1.); }`,
  `#version 300 es
    precision highp float; out vec4 o; void main(){ o=vec4(1.); }`);
  // shadow map
  GL.shN=2048;
  GL.shTex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,GL.shTex);
  gl.texStorage2D(gl.TEXTURE_2D,1,gl.DEPTH_COMPONENT32F,GL.shN,GL.shN);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  GL.shFB=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,GL.shFB);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,GL.shTex,0);
  gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
  GL.vaos=new Map();
}
function glMesh(key, m){
  const gl=GL.gl; let o=GL.vaos.get(key);
  if(!o){ o={vao:gl.createVertexArray(), b:[gl.createBuffer(),gl.createBuffer(),gl.createBuffer(),gl.createBuffer()]}; GL.vaos.set(key,o);
    gl.bindVertexArray(o.vao);
    [[0,3],[1,3],[2,1]].forEach(([loc,n],k)=>{ gl.bindBuffer(gl.ARRAY_BUFFER,o.b[k]); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,n,gl.FLOAT,false,0,0); });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,o.b[3]); }
  gl.bindVertexArray(o.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER,o.b[0]); gl.bufferData(gl.ARRAY_BUFFER,m.pos,gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER,o.b[1]); gl.bufferData(gl.ARRAY_BUFFER,m.nrm,gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER,o.b[2]); gl.bufferData(gl.ARRAY_BUFFER,m.mat,gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,o.b[3]); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,m.idx,gl.DYNAMIC_DRAW);
  o.count=m.idx.length; return o;
}
function lookAt(eye,at,up){ const f=norm(sub(at,eye)), s=norm(cross(f,up)), u=cross(s,f);
  return [s[0],u[0],-f[0],0, s[1],u[1],-f[1],0, s[2],u[2],-f[2],0, -dot(s,eye),-dot(u,eye),dot(f,eye),1]; }
function persp(fovy,asp,n,f){ const t=1/Math.tan(fovy/2); return [t/asp,0,0,0, 0,t,0,0, 0,0,(f+n)/(n-f),-1, 0,0,2*f*n/(n-f),0]; }
function ortho(l,r,b,t,n,f){ return [2/(r-l),0,0,0, 0,2/(t-b),0,0, 0,0,-2/(f-n),0, -(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]; }
function m4mul(a,b){ const o=new Array(16); for(let c=0;c<4;c++) for(let r=0;r<4;r++){ let s=0; for(let k=0;k<4;k++) s+=a[k*4+r]*b[c*4+k]; o[c*4+r]=s; } return o; }

function renderGBuffer(meshes, cam, w, h){
  const gl=GL.gl;
  const L=norm([-0.45,0.85,0.55]);
  // shadow pass
  const lv=lookAt(mul(L,4),[0,0.2,-0.1],[0,1,0]), lp=ortho(-2.2,2.2,-2.2,2.2,0.5,9);
  const LVP=m4mul(lp,lv);
  gl.bindFramebuffer(gl.FRAMEBUFFER,GL.shFB); gl.viewport(0,0,GL.shN,GL.shN);
  gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(GL.depth); gl.uniformMatrix4fv(gl.getUniformLocation(GL.depth,'uVP'),false,LVP);
  for(const o of meshes){ gl.bindVertexArray(o.vao); gl.drawElements(gl.TRIANGLES,o.count,gl.UNSIGNED_INT,0); }
  // g-buffer
  GL.fbs=GL.fbs||new Map(); const key=w+'x'+h;
  if(!GL.fbs.has(key)){
    const fb=gl.createFramebuffer(); GL.fbs.set(key,fb); gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
    for(let i=0;i<3;i++){ const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t); gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA32F,w,h);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0+i,gl.TEXTURE_2D,t,0); }
    const db=gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER,db); gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT32F,w,h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,db);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1,gl.COLOR_ATTACHMENT2]);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,GL.fbs.get(key)); gl.viewport(0,0,w,h);
  gl.clearBufferfv(gl.COLOR,0,[0,0,0,0]); gl.clearBufferfv(gl.COLOR,1,[0,0,0,0]); gl.clearBufferfv(gl.COLOR,2,[0,0,0,0]); gl.clear(gl.DEPTH_BUFFER_BIT);
  const VP=camVP(cam,w,h);
  const P=GL.gbuf; gl.useProgram(P);
  gl.uniformMatrix4fv(gl.getUniformLocation(P,'uVP'),false,VP);
  gl.uniformMatrix4fv(gl.getUniformLocation(P,'uLVP'),false,LVP);
  gl.uniform3fv(gl.getUniformLocation(P,'uCam'),cam.p); gl.uniform3fv(gl.getUniformLocation(P,'uL'),L);
  gl.uniform1f(gl.getUniformLocation(P,'uShTex'),GL.shN);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,GL.shTex); gl.uniform1i(gl.getUniformLocation(P,'uSh'),0);
  for(const o of meshes){ gl.bindVertexArray(o.vao); gl.drawElements(gl.TRIANGLES,o.count,gl.UNSIGNED_INT,0); }
  const bufs=[];
  for(let i=0;i<3;i++){ gl.readBuffer(gl.COLOR_ATTACHMENT0+i); const b=new Float32Array(w*h*4); gl.readPixels(0,0,w,h,gl.RGBA,gl.FLOAT,b);
    const o=new Float32Array(b.length); for(let y=0;y<h;y++) o.set(b.subarray((h-1-y)*w*4,(h-y)*w*4), y*w*4); bufs.push(o); }
  return bufs;
}

function camVP(cam,w,h){ return m4mul(persp(cam.fov*Math.PI/180,w/h,0.05,20), lookAt(cam.p,cam.at,cam.up||[0,1,0])); }
function project(VP,p,w,h){ const x=VP[0]*p[0]+VP[4]*p[1]+VP[8]*p[2]+VP[12], y=VP[1]*p[0]+VP[5]*p[1]+VP[9]*p[2]+VP[13], ww=VP[3]*p[0]+VP[7]*p[1]+VP[11]*p[2]+VP[15];
  return [(x/ww*0.5+0.5)*w, (1-(y/ww*0.5+0.5))*h, ww]; }

// ------------------------------------------------------------- portrait -----
function setupPortrait(h){
  setupMale(h);
  h.disp.fill(0); hairStyle(h, h.style||'swoop');
  h.pose(h.restHead('root'), {}); h.skin();
  const eyeY=h.restHead('eye.L')[1];
  h.lm={ eyeL:add(h.restHead('eye.L'),[0,0,0.014]), eyeR:add(h.restHead('eye.R'),[0,0,0.014]),
    mouth:h.rv(h.findVert(p=>Math.abs(p[0])<0.004 && p[1]<eyeY-0.05 && p[1]>eyeY-0.10, p=>-p[2]+Math.abs(p[1]-(eyeY-0.077))*0.5)) };
  // outfit regions
  h.baseMat=h.mat.slice();
  h.shirt=[]; h.choker=[];
  for(let v=0;v<h.n;v++){ const p=h.rv(v), b=h.domBone(v);
    if(/spine0[1-3]|clavicle|shoulder01|breast|pectoral|upperarm01/.test(b) && p[1]<1.505 && h.mat[v]===10) h.shirt.push(v);
    if(/neck0[12]/.test(b) && p[1]>1.505 && p[1]<1.522) h.choker.push(v); }
  let top=0; for(let v=0;v<h.n;v++) top=Math.max(top,h.rest[v*3+1]); h.top=top;
}
function dressPortrait(h, stage){
  const style = stage<=1 ? 'buzz' : (h.style||'swoop');
  if(h._styled!==style){ h.disp.fill(0); hairStyle(h, style); h.pose(h.restHead('root'), {}); h.skin(); h._styled=style; }
  h.mat.set(h.baseMat);
  for(const v of h.shirt) h.mat[v]=20;
  if(stage>=5) for(const v of h.choker) h.mat[v]=21;
  const M=new Mesh();
  if(stage<=1){ // backwards cap: crown + band + brim pointing behind him
    const c=[0,h.top-0.045,-0.005];
    blob(M,c,[1,0,0],[0,1,0],[0,0,1],(th,ph)=>ph<=Math.PI*0.52?[0.108,0.080,0.118]:[0.108,0.001,0.118],22,22,12);
    blob(M,add(c,[0,0.004,-0.10]),[1,0,0],[0,1,0],[0,0,1],()=>[0.075,0.008,0.07],22,18,6);
    blob(M,add(c,[0,0.07,0]),[1,0,0],[0,1,0],[0,0,1],()=>[0.012,0.006,0.012],22,8,6);
  }
  return smoothNormals(M.finish());
}
