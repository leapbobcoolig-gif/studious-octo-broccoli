// node tools/export_refs.js <scene.html> <outdir> <cam> <kinsey> <phases comma list> [w h]
// Renders the 3D reference rig and writes guide layers per keyframe for the sprite tracer.
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
  const [html,outdir,cam,kinsey,phases,w='1280',h='720',noGen='0']=process.argv.slice(2);
  fs.mkdirSync(outdir,{recursive:true});
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage(); p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('file://'+path.resolve(html)+'?t=0');
  const k=+kinsey, period=60/(150+(78-150)*k/6);
  const list=phases.split(',').map(Number);
  for(let f=0;f<list.length;f++){
    const t=list[f]*period + period*7;   // a few periods in, so springs are settled
    const r=await p.evaluate(([t,cam,k,w,h,noGen])=>window.refBuffers(t,{cam,kinsey:k,w,h,withShadow:true,noGen}),[t,cam,k,+w,+h,noGen==='1']);
    const meta={w:r.w,h:r.h,out:r.out,jig:r.jig,swing:r.swing,V:r.V,anchors:r.anchors,phase:list[f],t};
    for(const key of ['mat','shade','spec','nrm','dist','cs','wxy']) fs.writeFileSync(path.join(outdir,`f${f}_${key}.bin`),Buffer.from(r[key],'base64'));
    fs.writeFileSync(path.join(outdir,`f${f}.json`),JSON.stringify(meta));
    console.log('frame',f,'phase',list[f],'out',meta.out.toFixed(3),'jig',meta.jig.toFixed(3));
  }
  await b.close();
})();
