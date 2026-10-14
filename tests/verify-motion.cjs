/* Functional and geometric checks against the shipped frontal card. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const fixturePath=path.join(root,'tests/verify-card.cjs');
const original=fs.readFileSync(fixturePath,'utf8');
const marker='vm.runInContext(readProject(productionFilename),context);';
assert.equal(original.split(marker).length,3);
const fixture=original.slice(0,original.indexOf(marker));
const outer=vm.createContext({require,__dirname:path.dirname(fixturePath),process,console});
vm.runInContext(fixture+'\nglobalThis.adapter={context,registry,document,animationFrames,media,Element};',outer);
const {context,registry,document,animationFrames,media,Element}=outer.adapter;
// Instrument the private model only inside this isolated test VM.
const source=fs.readFileSync(path.join(root,process.argv[2] || 'vaccum-card-animations.js'),'utf8');
vm.runInContext(source.replace('  class VaccumCardAnimations extends HTMLElement {','  globalThis.testFloorRobotModel=FloorRobotModel;\n  class VaccumCardAnimations extends HTMLElement {'),context);
const C=registry.get('vaccum-card-animations');let checks=0;
const check=(condition,label)=>{assert.ok(condition,label);checks++;};
let time=0;
function advance(card,milliseconds) {
  const count=Math.ceil(milliseconds/16);
  for(let i=0;i<count;i++) {
    time+=16;
    const id=card._front.frame,callback=animationFrames.get(id);
    if(callback){animationFrames.delete(id);callback(time);}
  }
}
const commands=[];
const hass=(state='docked',battery=86)=>({states:{'vacuum.demo':{state,attributes:{battery_level:battery,cleaning_time:0,mop_time_left:28,supported_features:8192|4|8|16|32|512|1024,fan_speed:'Padrão',fan_speed_list:['Padrão','Turbo']}}},callService:async(...args)=>{commands.push(args);}});
const card=new C();card.setConfig({entity:'vacuum.demo',cycle_seconds:28,sound:false,appearance_id:'front-test'});card.connectedCallback();card.hass=hass();
const q=selector=>card.shadowRoot.querySelector(selector);
let randomSeed=3107;card._frontRandom=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
check(q('ha-card').dataset.view==='front'&&!!q('.front-canvas')&&!!card._frontModel,'floor projection rotates the whole model instead of skewing a flat sprite');
check(q('.front-dock-face')&&card._front.dust.length===0&&card._front.frame===null,'initial robot rests at the dock without frames or dirt');
const near=card._projectFront({x:.5,z:.15}),far=card._projectFront({x:.5,z:.75});
check(near.scale>far.scale&&near.y>far.y,'projection gets larger and lower as the robot approaches the camera');
card.hass=hass('cleaning');
check(card._front.task.kind==='depart'&&card._front.dust.length===12&&card._front.frame!=null,'cleaning departs from the dock and creates dirt along the horizontal passes');
const beforeMove={...card._front.pose};advance(card,48);
check(Math.hypot(card._front.pose.x-beforeMove.x,card._front.pose.z-beforeMove.z)<.0001,'departure accelerates gently from rest');
advance(card,4000);
check(card._front.task.kind==='cleaning','departure smoothly enters the continuous cleaning route');
const task=card._front.task,dust=card._front.dust,frame=card._front.frame,pose={...card._front.pose};
const originalDebris=JSON.stringify(dust.map(({element,...piece})=>piece));
card.hass=hass('cleaning',85);
check(card._front.task===task&&card._front.dust===dust&&card._front.frame===frame,'sensor refresh does not restart the animation or replace dirt');
check(JSON.stringify(dust.map(({element,...piece})=>piece))===originalDebris,'sensor updates preserve the exact randomized dirt distribution');
card.hass=hass('paused');const pausedPose=JSON.stringify(card._front.pose),pausedDistance=card._front.task.distance;
check(card._front.frame===null&&card._motion.playState==='paused'&&!animationFrames.has(frame),'pause cancels the frame and stops the motors');
advance(card,1000);check(JSON.stringify(card._front.pose)===pausedPose&&card._front.task.distance===pausedDistance,'pause keeps the same position, direction and route progress');
document.hidden=true;card._visibility();document.hidden=false;card._visibility();advance(card,1000);
check(card._front.frame===null&&JSON.stringify(card._front.pose)===pausedPose,'returning to the tab never resumes a paused robot');

card.hass=hass('cleaning');check(JSON.stringify(card._front.pose)===pausedPose&&card._front.task===task,'resume continues from the same world position');
advance(card,800);const controlsPose=JSON.stringify(card._front.pose),controlsDistance=card._front.task.distance;
card._showControls(true);check(card._front.frame===null&&card._motion.playState==='paused'&&commands.length===0,'opening controls freezes only the visual animation');
advance(card,500);card._showControls(false);
check(JSON.stringify(card._front.pose)===controlsPose&&card._front.task.distance===controlsDistance&&card._front.frame!=null,'closing controls resumes the exact position and direction');
const themeFrame=card._front.frame,themePose=JSON.stringify(card._front.pose);
card._changeAppearance('theme','dark',false);
check(card._front.frame===themeFrame&&JSON.stringify(card._front.pose)===themePose,'changing theme does not reset the frontal animation');
let greatestStep=0,leastScale=10,greatestScale=0,turnChecks=0,forwardChecks=0;
for(let i=0;i<2200;i++) {
  const worldBefore={...card._front.pose},segment=card._front.task.segments[card._front.task.index];
  const before=card._projectFront(worldBefore);advance(card,16);const after=card._projectFront(card._front.pose);
  const dx=card._front.pose.x-worldBefore.x,dz=card._front.pose.z-worldBefore.z;
  if(segment.type==='turn'){assert.ok(Math.abs(dx)+Math.abs(dz)<1e-12,'a turn changes orientation without sideways sliding');turnChecks++;}
  else if(Math.hypot(dx,dz)>1e-9){
    const yaw=card._front.pose.yaw*Math.PI/180,span=Math.max(130,card._frontGeometry().width-160);
    const alignment=(dx*span*Math.sin(yaw)-dz*400*Math.cos(yaw))/Math.hypot(dx*span,dz*400);
    assert.ok(alignment>.9999,'forward motion follows the physical heading of the robot');forwardChecks++;
  }
  greatestStep=Math.max(greatestStep,Math.hypot(after.x-before.x,after.y-before.y));leastScale=Math.min(leastScale,after.scale);greatestScale=Math.max(greatestScale,after.scale);
}
check(turnChecks>80&&forwardChecks>500,'the complete route includes real turns and forward travel');
check(greatestStep<1.25,'one frame moves less than 1.25 pixels on the normal-width scene');
check(greatestScale-leastScale>.20,'the cleaning route has visible movement in depth');
check(card._front.dust.every(piece=>piece.collected),'the route collects all twelve dirt clusters');
for(const width of [296,344,444,720]) {
  card._scene.clientWidth=width;
  for(let i=0;i<500;i++) {
    advance(card,48);const p=card._projectFront(card._front.pose);
    assert.ok(p.x-61*p.scale>=0&&p.x+61*p.scale<=width&&p.y<=270&&p.y-90*p.scale>=0,'robot stays inside the perspective scene');
  }
  check(true,`robot and path fit a ${width}px scene`);
}
const configurationPose=JSON.stringify(card._front.pose),configurationDistance=card._front.task.distance;
const configurationDebris=JSON.stringify(card._front.dust.map(({element,...piece})=>piece));
card.setConfig({entity:'vacuum.demo',cycle_seconds:28,sound:false,appearance_id:'front-test',buttons:{pause:{name:'Pausa suave',icon:'pause'}}});
check(JSON.stringify(card._front.pose)===configurationPose&&card._front.task.distance===configurationDistance,'editing a button preserves frontal position and route progress');
check(JSON.stringify(card._front.dust.map(({element,...piece})=>piece))===configurationDebris,'editing controls preserves the random dirt sizes, reveal times and collected state');
check(q('[data-action="primary"] .button-label').textContent==='Pausa suave'&&card._frontDock.style.transform.includes('translate3d'),'edited button and reconstructed dock both render correctly');
const hiddenFrame=card._front.frame;document.hidden=true;card._visibility();
check(card._front.frame===null&&!animationFrames.has(hiddenFrame),'hidden page performs no animation work');
document.hidden=false;card._visibility();check(card._front.frame!=null,'visible page resumes the motion');
card.hass=hass('returning');advance(card,12000);
check(card._mode==='returning'&&card._front.task===null&&card._front.frame===null,'return arrives smoothly without inventing the docked state');
card.hass=hass('docked');advance(card,1600);
check(card._front.pose.x===.84&&card._front.pose.z===.89&&card._front.pose.yaw===0,'docked state completes the final gentle alignment');
card.hass=hass('cleaning');media.matches=true;card._mediaChanged();
check(card._front.frame===null&&card._front.dust.length===0&&q('ha-card').dataset.motion==='false','reduced motion stops the new engine and removes decorative dirt');
media.matches=false;card._mediaChanged();advance(card,800);
const disconnectedFrame=card._front.frame;card.disconnectedCallback();
check(card._front.frame===null&&!animationFrames.has(disconnectedFrame),'removing the demo cancels every pending frame');
const model=context.testFloorRobotModel;
for(const yaw of [0,45,90,180,270])for(const x of [-22,22]) {
  const bottom=model.point(x,-26,model.mopBottom,yaw),floor=model.point(x,-26,0,yaw),cloth=model.point(x,-26,model.mopThickness,yaw);
  assert.ok(bottom.y===floor.y&&bottom.x===floor.x,'the mop bottom lies exactly on the floor');
  assert.ok(floor.y-cloth.y<1.6,'the mop is a thin cloth and never a raised foot');
}
check(true,'both mop pads remain flat on the shared floor for every heading');
// Every random placement remains in the swept corridor, across many seeds.
const randomCard=new C();randomCard.setConfig({entity:'vacuum.demo',sound:false});
randomCard._frontRandom=card._frontRandom;let previousDistribution='';
for(let trial=0;trial<80;trial++) {
 randomCard._seedFrontDust();
 const pieces=randomCard._front.dust,distribution=JSON.stringify(pieces.map(p=>[p.x,p.z,p.size,p.angle]));
 assert.notEqual(distribution,previousDistribution,'a new cleaning uses a different arrangement');previousDistribution=distribution;
 for(const piece of pieces) {
  const horizontal=Math.min(Math.abs(piece.z-.7),Math.abs(piece.z-.24))*.72;
  const vertical=Math.min(Math.abs(piece.x-.16),Math.abs(piece.x-.84));
  const hInside=piece.x>=.16&&piece.x<=.84,vInside=piece.z>=.24&&piece.z<=.7;
  assert.ok((hInside&&horizontal<.071)||(vInside&&vertical<.071),'random dirt remains within the actual collection radius');
  assert.ok(piece.size>=.65&&piece.size<=1.3&&piece.delay>=0&&piece.delay<1.6,'random sizes and reveal timing are bounded');
 }
 assert.equal(pieces.length,12,'the scene keeps a fixed bounded particle count');
}
check(true,'80 randomized cleanings keep every dirt cluster reachable, varied and bounded');
randomCard.disconnectedCallback();
// Check many cycles, including unwrapped yaw beyond 720 degrees.
const loopCard=new C();loopCard.setConfig({entity:'vacuum.demo',cycle_seconds:28,sound:false});loopCard.connectedCallback();loopCard.hass=hass('cleaning');
for(let i=0;i<10000;i++){
 const task=loopCard._front.task,segment=task?.segments[task.index];
 if(segment?.type==='turn')assert.ok(Math.abs(segment.to.yaw-segment.from.yaw)<=180,'turn takes the shortest path across multiple cycles');
 advance(loopCard,32);
}
check(true,'repeated cycles never reverse or spin through a full revolution');loopCard.disconnectedCallback();
const demoRoot=new Element('div'),demo=new C();demo.tagName='vaccum-card-animations';demo.connectedCallback();demoRoot.append(demo);
const editor=C.getConfigElement();editor.tagName='vaccum-card-animations-editor';demoRoot.append(editor);
const state=new Element('span');state.setAttribute('class','demo-state');demoRoot.append(state);document.getElementById=()=>demoRoot;
let timer;context.setInterval=()=>1;context.clearInterval=()=>{};context.setTimeout=callback=>{timer=callback;return 2;};context.clearTimeout=()=>{};
vm.runInContext(fs.readFileSync(path.join(root,'demo-controller.js'),'utf8'),context);
(async()=>{
 await demo._act('primary');check(demo._mode==='cleaning'&&demo._front.dust.length===12,'the demo start button starts the new scene');
 advance(demo,1700);
 await demo._act('primary');check(demo._mode==='paused','the demo pause button freezes the frontal robot');
 await demo._act('return');check(demo._mode==='returning','the demo return button starts the return transition');advance(demo,12000);
 check(demo._mode==='docked'&&state.textContent==='Na base','the demo returns to its simulated base');
 demo.disconnectedCallback();
 console.log(`${checks} frontal-motion checks passed; maximum frame step ${greatestStep.toFixed(3)}px. Browser rendering is not part of these checks.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
