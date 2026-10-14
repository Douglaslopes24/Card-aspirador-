const assert=require('node:assert/strict');
const path=require('node:path');
const {launch,demoUrl,output}=require('./browser-helpers.cjs');
(async()=>{
 const browser=await launch();
 try {
 const page=await browser.newPage({viewport:{width:660,height:820},deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(demoUrl);
 const card=page.locator('vaccum-card-animations');
 const button=action=>['more','back'].includes(action)?card.locator('.more-controls'):card.locator('[data-action="'+action+'"]:visible');
 await button('primary').click();
 await page.waitForTimeout(1800);
 assert.equal(await card.evaluate(c=>c._mode),'cleaning');
 await button('primary').click();
 const paused=await card.evaluate(c=>JSON.stringify([c._front.pose,c._front.task.segmentTime,c._front.brushTime]));
 await page.waitForTimeout(350);
 assert.equal(await card.evaluate(c=>JSON.stringify([c._front.pose,c._front.task.segmentTime,c._front.brushTime])),paused);
 await button('primary').click();
 await page.waitForTimeout(400);
 assert.notEqual(await card.evaluate(c=>JSON.stringify([c._front.pose,c._front.task.segmentTime,c._front.brushTime])),paused);
 // Open the actual controls UI, switch the theme and return to the scene.
 await button('more').click();
 const controlsPose=await card.evaluate(c=>JSON.stringify(c._front.pose));
 await card.locator('.appearance > summary').click();
 await card.locator('.appearance-theme').selectOption('dark');
 assert.equal(await card.evaluate(c=>JSON.stringify(c._front.pose)),controlsPose);
 await button('back').click();
 await card.evaluate(c=>{c._motion.pause();for(let i=0;i<1550;i++)c._advanceFront(1/60);c._drawFront();});
 await card.screenshot({path:path.join(output,'final-dark.png')});
 const timing=await card.evaluate(c=>{
  const times=[];
  for(let i=0;i<60;i++){const start=performance.now();c._frontModel.draw(i*6,i*.016);times.push(performance.now()-start);}
  times.sort((a,b)=>a-b);c._drawFront();
  return {medianMs:times[30],p95Ms:times[57]};
 });
 await button('return').click();
 const returning=await card.evaluate(c=>c._mode);assert.equal(returning,'returning');
 await card.evaluate(c=>{c._motion.pause();for(let i=0;i<1100;i++)c._advanceFront(1/60);c._drawFront();});
 assert.equal(await card.evaluate(c=>c._mode),'docked');
 assert.deepEqual(await card.evaluate(c=>c._front.pose),{x:.84,z:.89,yaw:0});
 assert.equal(await button('return').isDisabled(),true);
 await button('more').click();await card.locator('.appearance-theme').selectOption('light');await button('back').click();
 await page.setViewportSize({width:320,height:860});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await card.screenshot({path:path.join(output,'final-mobile.png')});
 await button('primary').click();
 await card.evaluate(c=>{c._motion.pause();for(let i=0;i<410;i++)c._advanceFront(1/60);c._drawFront();});
 await card.screenshot({path:path.join(output,'final-moving.png')});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(40);
 assert.equal(await card.evaluate(c=>c._front.frame),null);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(JSON.stringify({result:'Browser checks passed: start, pause, resume, controls, theme, return, dock, 320px layout, reduced motion',timing,errors}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
