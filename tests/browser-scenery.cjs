const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {launch,demoUrl,output}=require('./browser-helpers.cjs');
(async()=>{
 const browser=await launch();
 try {
 const page=await browser.newPage({viewport:{width:660,height:850},deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(demoUrl);
 const card=page.locator('vaccum-card-animations');
 const button=action=>card.locator('[data-action="'+action+'"]:visible');
 const more=()=>card.locator('.more-controls').click();
 const openAppearance=async()=>{await more();if(!await card.locator('.appearance').evaluate(el=>el.open))await card.locator('.appearance > summary').click();};
 const fixtures=await page.evaluate(()=>{
  const images=[];
  for(const kind of ['floor','wall']) {
   const canvas=document.createElement('canvas');canvas.width=kind==='floor'?1280:480;canvas.height=kind==='floor'?720:320;
   const c=canvas.getContext('2d');c.fillStyle=kind==='floor'?'#aa774f':'#c9d7db';c.fillRect(0,0,canvas.width,canvas.height);
   if(kind==='floor'){
    for(let y=0;y<canvas.height;y+=90){c.fillStyle=y%180===0?'#bc8b64':'#a1704c';c.fillRect(0,y,canvas.width,89);c.fillStyle='#835c40';c.fillRect((y*7)%320,y,1,90);}
   } else {c.fillStyle='#a8bdc5';for(let x=0;x<canvas.width;x+=60)c.fillRect(x,0,1,canvas.height);}
   images.push(canvas.toDataURL('image/png').split(',')[1]);
  }
  return images;
 });
 await openAppearance();
 await card.locator('[data-scene-file="floor"]').setInputFiles({name:'chao-teste.png',mimeType:'image/png',buffer:Buffer.from(fixtures[0],'base64')});
 await card.locator('[data-scene-file="wall"]').setInputFiles({name:'parede-teste.png',mimeType:'image/png',buffer:Buffer.from(fixtures[1],'base64')});
 await page.waitForFunction(()=>{const c=document.querySelector('vaccum-card-animations');return c._scenery.images.floor&&c._scenery.images.wall;});
 const saved=await card.evaluate(c=>JSON.stringify(c._scenery.images));
 assert.equal(await card.locator('[data-scene-name="floor"]').textContent(),'chao-teste.png');
 assert.equal(await card.locator('[data-scene-name="wall"]').textContent(),'parede-teste.png');
 await card.screenshot({path:path.join(output,'scenery-controls.png')});
 await more();
 const dimensions=await card.evaluate(async c=>{
  const img=c.shadowRoot.querySelector('[data-scene-image="floor"]');await img.decode();
  return [img.naturalWidth,img.naturalHeight];
 });
 assert.deepEqual(dimensions,[1024,576]);
 await card.screenshot({path:path.join(output,'scenery-custom.png')});
 await button('primary').click();
 await card.evaluate(c=>{c._motion.pause();for(let i=0;i<180;i++)c._advanceFront(1/60);c._drawFront();});
 const dirtBefore=await card.evaluate(c=>JSON.stringify(c._front.dust.map(({element,...p})=>p)));
 const poseBefore=await card.evaluate(c=>JSON.stringify(c._front.pose));
 await openAppearance();await card.locator('.appearance-theme').selectOption('dark');await more();
 assert.equal(await card.evaluate(c=>JSON.stringify(c._scenery.images)),saved);
 // Freeze before checking configuration edits: the actual animation may otherwise advance between calls.
 await card.evaluate(c=>c._motion.pause());
 const editSnapshot=await card.evaluate(c=>{
  const before=JSON.stringify([c._front.pose,c._front.dust.map(({element,...p})=>p)]);
  c.setConfig({...c._config,buttons:{pause:{name:'Pausar teste'}}});c._motion.pause();
  return {before,after:JSON.stringify([c._front.pose,c._front.dust.map(({element,...p})=>p)]),images:JSON.stringify(c._scenery.images)};
 });
 assert.equal(editSnapshot.before,editSnapshot.after);assert.equal(editSnapshot.images,saved);
 await page.waitForTimeout(400);
 await card.screenshot({path:path.join(output,'scenery-cleaning.png')});
 await card.evaluate(c=>{for(let i=0;i<2400;i++)c._advanceFront(1/60);c._drawFront();});
 assert.equal(await card.evaluate(c=>c._front.dust.every(p=>p.collected)),true);
 await page.reload();
 assert.equal(await card.evaluate(c=>JSON.stringify(c._scenery.images)),saved);
 await page.setViewportSize({width:320,height:900});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await card.screenshot({path:path.join(output,'scenery-mobile.png')});
 await openAppearance();
 await card.locator('[data-scene-file="floor"]').setInputFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('not a valid image')});
 await page.waitForFunction(()=>document.querySelector('vaccum-card-animations').shadowRoot.querySelector('.scene-image-status').getAttribute('role')==='alert');
 assert.equal(await card.evaluate(c=>JSON.stringify(c._scenery.images)),saved);
 await card.locator('[data-scene-remove="floor"]').click();
 assert.equal(await card.evaluate(c=>c._scenery.images.floor),null);
 assert.equal(await card.evaluate(c=>!!c._scenery.images.wall),true);
 await card.locator('.appearance-reset').click();
 assert.deepEqual(await card.evaluate(c=>c._scenery.images),{floor:null,wall:null});
 await page.reload();
 assert.deepEqual(await card.evaluate(c=>c._scenery.images),{floor:null,wall:null});
 await openAppearance();
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('QuotaExceededError');};});
 await card.locator('[data-scene-file="wall"]').setInputFiles({name:'parede.png',mimeType:'image/png',buffer:Buffer.from(fixtures[1],'base64')});
 await page.waitForFunction(()=>!!document.querySelector('vaccum-card-animations')._scenery.images.wall);
 assert.match(await card.locator('.scene-image-status').textContent(),/não permitiu salvar/);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(JSON.stringify({result:'Browser checks passed: separate images, resize, persistence, themes, button editing, reachable dirt, 320px layout, invalid image, independent restore, reset, storage failure',imageDimensions:dimensions,errors}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
