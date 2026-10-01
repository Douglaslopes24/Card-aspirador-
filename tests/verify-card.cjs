/* Functional tests against the production source using a minimal generic DOM.
   This verifies data, commands and animation lifecycle, not browser rendering. */
const fs=require('fs');
const vm=require('vm');
const path=require('node:path');
const projectRoot=fs.existsSync(path.join(__dirname,'aspirador-vivo/aspirador-vivo-card.js')) ? path.join(__dirname,'aspirador-vivo') : path.resolve(__dirname,'..');
const readProject=name=>fs.readFileSync(path.join(projectRoot,name),'utf8');
const assert=require('node:assert/strict');
let checks=0;
const check=(condition,label)=>{assert.ok(condition,label);checks++;};
const dataKey=k=>k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
class Element {
  constructor(tag='element'){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.style={};this.events={};this.clientWidth=414;this.clientHeight=248;this.isConnected=true;this.hidden=false;this._text='';}
  set innerHTML(html){
    this.children=[];
    const content=html.replace(/<style>[\s\S]*?<\/style>/g,'');
    const tokens=content.match(/<[^>]+>|[^<]+/g)||[];const stack=[this];
    for(const token of tokens){
      if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}
      if(token.startsWith('<')){
        const match=token.match(/^<([\w-]+)/);if(!match)continue;
        const node=new Element(match[1]);
        const attr=/([\w-]+)(?:="([^"]*)")?/g;attr.lastIndex=match[0].length;let a;
        while((a=attr.exec(token.slice(0,-1))))node.setAttribute(a[1],a[2]??'');
        stack.at(-1).append(node);
        if(!token.endsWith('/>')&&!['input','hr','br','meta','img'].includes(node.tagName))stack.push(node);
      }else stack.at(-1)._text+=token;
    }
  }
  set textContent(v){this._text=v==null?'':String(v);this.children=[];}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  setAttribute(k,v){this.attributes[k]=String(v);if(k.startsWith('data-'))this.dataset[dataKey(k)]=String(v);if(k==='hidden')this.hidden=true;if(['name','type','value'].includes(k))this[k]=String(v);}
  getAttribute(k){return this.attributes[k]??null;}
  removeAttribute(k){delete this.attributes[k];}
  append(n){this.children.push(n);n.parent=this;}
  replaceChildren(...nodes){this.children=[];for(const node of nodes)this.append(node);}
  matches(selector){
    if(selector.endsWith(':not(:disabled)'))return !this.disabled&&this.matches(selector.replace(':not(:disabled)',''));
    if(selector.includes('[')&&!selector.startsWith('[')){const at=selector.indexOf('[');return this.matches(selector.slice(0,at))&&this.matches(selector.slice(at));}
    if(selector.startsWith('.'))return (this.attributes.class||'').split(/\s+/).includes(selector.slice(1));
    if(selector.startsWith('[')){const m=selector.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);return m&&this.attributes[m[1]]!==undefined&&(m[2]===undefined||this.attributes[m[1]]===m[2]);}
    return this.tagName===selector;
  }
  querySelectorAll(selector){const out=[];const choices=selector.split(',').map(s=>s.trim().split(/\s+/));function match(node,tokens){let index=tokens.length-1;if(!node.matches(tokens[index--]))return false;let ancestor=node.parent;while(index>=0&&ancestor){if(ancestor.matches(tokens[index]))index--;ancestor=ancestor.parent;}return index<0;}function visit(node){for(const child of node.children){if(choices.some(s=>match(child,s)))out.push(child);visit(child);}}visit(this);return out;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
  dispatchEvent(event){event.target??=this;(this.events[event.type]||[]).forEach(fn=>fn(event));return true;}
  focus(){this.focused=true;document.activeElement=this;}
  animate(frames,options){
    const animation={frames,options,currentTime:0,playState:'running',cancelled:false,cancel(){this.cancelled=true;this.playState='idle';},pause(){this.playState='paused';},play(){this.playState='running';}};
    this._animation=animation;return animation;
  }
}
function poseFromTransform(t){const m=(t||'').match(/translate\(([-\d.]+)px,([-\d.]+)px\) rotate\(([-\d.]+)deg\)/);return m?{x:+m[1],y:+m[2],a:+m[3]}:{x:0,y:0,a:0};}
function currentTransform(element){
  const animation=element._animation;
  if(!animation||animation.cancelled)return element.style.transform||'none';
  const {frames,options}=animation;
  let progress=animation.currentTime/options.duration;
  if(options.iterations===Infinity)progress%=1;else progress=Math.min(1,progress);
  let index=0;
  while(index<frames.length-2&&progress>(frames[index+1].offset??(index+1)/(frames.length-1)))index++;
  const p1=poseFromTransform(frames[index].transform),p2=poseFromTransform(frames[index+1].transform);
  const start=frames[index].offset??index/(frames.length-1),end=frames[index+1].offset??(index+1)/(frames.length-1);
  const f=Math.max(0,Math.min(1,(progress-start)/(end-start)));
  return `translate(${p1.x+(p2.x-p1.x)*f}px,${p1.y+(p2.y-p1.y)*f}px) rotate(${p1.a+(p2.a-p1.a)*f}deg)`;
}
class Matrix {constructor(t){const p=poseFromTransform(t);this.m41=p.x;this.m42=p.y;this.m12=Math.sin(p.a*Math.PI/180);this.m11=Math.cos(p.a*Math.PI/180);}}
const registry=new Map();
const listeners={};
const document={hidden:false,createElement(tag){const C=registry.get(tag);return C?new C():new Element(tag);},addEventListener(n,fn){listeners[n]=fn;},removeEventListener(n){delete listeners[n];}};
const media={matches:false,addEventListener(){},removeEventListener(){}};
class HTMLElement extends Element{attachShadow(){this.shadowRoot=new Element('shadow');return this.shadowRoot;}}
class ResizeObserver{constructor(fn){this.fn=fn;}observe(){}disconnect(){this.disconnected=true;}}
const context=vm.createContext({HTMLElement,ResizeObserver,document,window:{matchMedia:()=>media},customElements:{define:(n,C)=>registry.set(n,C),get:n=>registry.get(n)},DOMMatrixReadOnly:Matrix,getComputedStyle:e=>({transform:currentTransform(e)}),CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},Intl,console});
vm.runInContext(readProject('aspirador-vivo-card.js'),context);
const C=registry.get('aspirador-vivo-card');
check(!!C&&registry.has('aspirador-vivo-card-editor'),'custom elements registered');
check(context.window.customCards[0].type==='aspirador-vivo-card','card picker registration');
assert.throws(()=>new C().setConfig({entity:'sensor.invalid'}));checks++;
const beforeAttach=new C();beforeAttach.isConnected=false;beforeAttach.setConfig({entity:'vacuum.before_attach'});
beforeAttach.hass={states:{'vacuum.before_attach':{state:'cleaning',attributes:{supported_features:8192}}}};beforeAttach.isConnected=true;beforeAttach.connectedCallback();
const initialPose=poseFromTransform(beforeAttach._motion.frames[0].transform),initialDock=beforeAttach._geometry().dock;
check(initialPose.x+35===initialDock.x&&initialPose.y+35===initialDock.y,'hass assigned before connection still places robot at dock');beforeAttach.disconnectedCallback();
let commands=[];
const card=new C();card.setConfig({entity:'vacuum.test'});card.connectedCallback();
const makeHass=(mode='docked',attrs={},sensors={})=>({states:{'vacuum.test':{state:mode,attributes:{battery_level:86,cleaning_time:12,mop_time_left:28,supported_features:8192|4|16,...attrs}},...sensors},callService:async(...args)=>{commands.push(args);}});
const query=s=>card.shadowRoot.querySelector(s);
card.hass=makeHass();
check(query('.battery-value').textContent==='86%','battery attribute');
check(query('.clean-value').textContent==='12 min'&&query('.mop-value').textContent==='28 min','time attributes');
check(query('ha-card').dataset.active==='false'&&query('.stats').getAttribute('aria-hidden')==='false','idle information visible');
check(query('[data-action="primary"]').textContent==='Iniciar limpeza','initial control');
check(query('[data-action="return"]').disabled,'docked return disabled');
card.hass=makeHass('cleaning');
check(card._motion&&card._motion.options.iterations!==Infinity,'departure runs once');
check(query('ha-card').dataset.active==='true'&&query('.top-battery').getAttribute('aria-hidden')==='false','battery moves to top');
check(query('[data-action="primary"]').textContent==='Pausar','cleaning button updated immediately');
card._motion.currentTime=1400;card._motion.onfinish();
check(card._motion.options.iterations===Infinity,'sweep loop starts');
const frames=card._motion.frames.map(frame=>poseFromTransform(frame.transform));
check(frames[0].y===frames[1].y&&frames[0].x>frames[1].x,'foreground pass moves horizontally');
check(frames[4].y===frames[5].y&&frames[4].x<frames[5].x,'upper pass returns horizontally');
check(frames.length===9&&frames[1].x===frames[2].x&&frames[1].y===frames[2].y&&frames[2].a-frames[1].a===90,'original route turns at corners');
card._motion.currentTime=card._motion.options.duration*.48;
check(Math.abs(card._pose().a-36)<.001,'pose reads current rotation');
const commandCount=commands.length;card._showControls(true);
check(card._controlsOpen&&query('.scene').hidden&&!query('.controls-panel').hidden&&query('.more-controls').getAttribute('aria-expanded')==='true','more button opens controls');
check(card._motion.playState==='paused'&&commands.length===commandCount,'opening controls pauses animation without commanding robot');
const panelPose=card._pose();card._showControls(false);
check(!card._controlsOpen&&!query('.scene').hidden&&query('.controls-panel').hidden&&query('.more-controls').getAttribute('aria-expanded')==='false','back button restores robot view');
const resumedStart=poseFromTransform(card._motion.frames[0].transform);
check(Math.abs(resumedStart.a-panelPose.a)<.001&&Math.abs(resumedStart.x+35-panelPose.x)<.001&&Math.abs(resumedStart.y+35-panelPose.y)<.001,'closing controls preserves position and rotation');
card._motion.currentTime=1400;card._motion.onfinish();
const same=card._motion;card.hass=makeHass('cleaning',{battery_level:85});
check(card._motion===same&&query('.battery-value').textContent==='85%','sensor refresh does not restart animation');
card._motion.currentTime=6000;const prior=card._pose();card.hass=makeHass('paused');const frozen=card._pose();
check(card._motion===null&&Math.abs(prior.x-frozen.x)<0.01&&Math.abs(prior.y-frozen.y)<0.01,'pause freezes current position');
check(query('[data-action="primary"]').textContent==='Continuar','pause control updated');
card.hass=makeHass('returning');check(card._motion?.options.duration===2300,'return animation');
card._motion.currentTime=2300;card._motion.onfinish();
check(card._mode==='returning'&&query('.state-text').textContent==='Voltando à base','return does not invent docked state');
card.hass=makeHass('docked');
check(query('[data-action="primary"]').textContent==='Iniciar limpeza','docked control no stale pause label');
card.setConfig({entity:'vacuum.test',battery_entity:'sensor.b',cleaning_time_entity:'sensor.t',mop_time_entity:'sensor.m'});
card.hass=makeHass('docked',{}, {'sensor.b':{state:'75',attributes:{unit_of_measurement:'%'}},'sensor.t':{state:'125',attributes:{unit_of_measurement:'s'}},'sensor.m':{state:'40',attributes:{unit_of_measurement:'h'}}});
check(query('.battery-value').textContent==='75%','configured sensor priority');
check(query('.clean-value').textContent==='2:05 min'&&query('.mop-value').textContent==='40 h','sensor units respected');
card.hass=makeHass();
check(query('.battery-value').textContent==='—'&&query('.clean-value').textContent==='—','missing configured sensors are not fabricated');
card.hass=makeHass('unavailable');
check(card._motion===null&&query('[data-action="primary"]').disabled&&query('[data-action="return"]').disabled,'unavailable stops motion and commands');
card.hass=makeHass('error');check(card._motion===null&&query('[data-action="primary"]').disabled,'error stops motion');
card.setConfig({entity:'vacuum.test',animation:false});card.hass=makeHass('cleaning');
check(card._motion===null&&query('ha-card').dataset.motion==='false','disabled motion stops movement and motors');
card.setConfig({entity:'vacuum.test'});media.matches=true;card._mediaChanged();card.hass=makeHass('cleaning');
check(card._motion===null,'system reduced motion');media.matches=false;
(async()=>{
 card.hass=makeHass('docked');await card._act('primary');
 check(commands.at(-1)[0]==='vacuum'&&commands.at(-1)[1]==='start'&&commands.at(-1)[2].entity_id==='vacuum.test','start targets chosen entity');
 card.hass=makeHass('cleaning');await card._act('primary');check(commands.at(-1)[1]==='pause','pause service');
 card.hass=makeHass('paused');await card._act('return');check(commands.at(-1)[1]==='return_to_base','dock service');
 card.hass=makeHass('cleaning',{supported_features:8192|4|8|16|32|512|1024,fan_speed:'Padrão',fan_speed_list:['Silencioso','Padrão','Turbo']});
 await card._act('stop');check(commands.at(-1)[1]==='stop','stop service');
 await card._act('spot');check(commands.at(-1)[1]==='clean_spot','spot service');
 await card._act('locate');check(commands.at(-1)[1]==='locate','locate service');
 const fanBefore=commands.length;await card._setFan('invalid');check(commands.length===fanBefore,'invalid fan mode rejected');
 await card._setFan('Turbo');check(commands.at(-1)[1]==='set_fan_speed'&&commands.at(-1)[2].fan_speed==='Turbo','fan selection sends real mode');
 check(query('.fan-select').value==='Padrão'&&!query('.fan-field').hidden,'fan view shows reported mode');
 const unknownBefore=commands.length;await card._act('not-a-command');check(commands.length===unknownBefore,'unknown action does not start vacuum');
 card._showControls(true);card.shadowRoot.dispatchEvent({type:'keydown',key:'Escape'});check(!card._controlsOpen,'Escape closes control interface');
 const custom=[{name:'Limpar sala',icon:'room',entity:'script.sala'},{name:'Limpar com mops',icon:'mop',entity:'script.mops'}];
 card.setConfig({entity:'vacuum.test',custom_buttons:custom});
 card.hass=makeHass('docked',{}, {'script.sala':{state:'off',attributes:{friendly_name:'Sala'}},'script.mops':{state:'off',attributes:{}}});
 check(!query('[data-custom="0"]').disabled&&!!query('[data-custom="0"] .av-icon'),'custom script has enabled personalized icon');
 await card._runCustom(0);check(commands.at(-1)[0]==='script'&&commands.at(-1)[1]==='turn_on'&&commands.at(-1)[2].entity_id==='script.sala','custom script targets selected entity');
 card.hass=makeHass('docked');const missingBefore=commands.length;await card._runCustom(0);
 check(query('[data-custom="0"]').disabled&&commands.length===missingBefore,'missing custom script stays disabled');
 card.setConfig({entity:'vacuum.test',custom_buttons:[{name:'Avançado',icon:'mop',service:'script.turn_on',target:{entity_id:'script.mops'},data:{variables:{room:'sala'}}}]});
 card.hass=makeHass('docked',{}, {'script.mops':{state:'off',attributes:{}}});await card._runCustom(0);
 check(commands.at(-1)[3].entity_id==='script.mops'&&commands.at(-1)[2].variables.room==='sala','advanced custom action preserves target and data');
 check(card._customRequest({service:'script.turn_on'})===null,'unbound generic action rejected');
 check(card._customRequest({service:'javascript:alert'})===null,'invalid service syntax rejected');
 const fallbackRequest=card._customRequest({service:'vacuum.locate'});check(fallbackRequest.data.entity_id==='vacuum.test','custom vacuum service defaults to configured robot');
 card.setConfig({entity:'vacuum.test',custom_buttons:[{name:'<img src=x>',icon:'room',entity:'script.sala',icon_image:'/local/icons/sala.svg'}]});card.hass=makeHass('docked',{}, {'script.sala':{state:'off',attributes:{}}});
 check(query('[data-custom="0"] .button-label').textContent==='<img src=x>'&&!query('[data-custom="0"] .button-label img'),'custom names are text, not HTML');
 const image=query('[data-custom="0"] .button-icon img');check(image.src==='/local/icons/sala.svg','custom icon image assigned');image.dispatchEvent({type:'error'});
 check(!!query('[data-custom="0"] .av-icon'),'missing image falls back to original icon');
 check(card.getGridOptions().rows===undefined,'control interface can grow in sections layout');
 const before=commands.length;card.hass=makeHass('docked',{supported_features:0});await card._act('primary');
 check(commands.length===before&&query('[data-action="primary"]').disabled,'unsupported command not sent');
 card.hass={...makeHass('docked'),callService:async()=>{throw new Error('offline');}};await card._act('primary');
 check(!query('.service-message').hidden&&query('.service-message').textContent.includes('offline')&&!card._pending,'service errors visible and pending cleared');
 for(const width of [296,344,414,720]){
  card._scene.clientWidth=width;const g=card._geometry();
  check(g.left-49>=0&&g.right+49<width&&g.top-49>=56&&g.bottom+49<=198,`motion geometry fits ${width}px scene`);
 }
 card.hass=makeHass('cleaning');card.disconnectedCallback();
 check(!card._motion&&card._resize.disconnected,'disconnect cleanup');
 const editor=C.getConfigElement();editor.setConfig({entity:'vacuum.test'});editor.hass=makeHass('docked',{}, {'sensor.custom':{state:'72',attributes:{friendly_name:'Bateria'}}});
 check(editor.shadowRoot.querySelector('[name="battery_entity"]').children.some(n=>n.value==='sensor.custom'),'editor lists available sensors');
 let emitted;editor.addEventListener('config-changed',event=>{emitted=event.detail.config;});
 const input=editor.shadowRoot.querySelector('[name="battery_entity"]');input.value='sensor.custom';input.dispatchEvent({type:'change'});
 check(emitted.battery_entity==='sensor.custom','editor emits config-changed');
 editor.shadowRoot.querySelector('.add-shortcut').dispatchEvent({type:'click'});check(emitted.custom_buttons.length===1,'editor adds shortcut');
 const nameInput=editor.shadowRoot.querySelector('[data-field="name"]');nameInput.value='Minha cozinha';nameInput.dispatchEvent({type:'change'});
 const iconInput=editor.shadowRoot.querySelector('[data-field="icon"]');iconInput.value='kitchen';iconInput.dispatchEvent({type:'change'});
 check(emitted.custom_buttons[0].name==='Minha cozinha'&&emitted.custom_buttons[0].icon==='kitchen','sequential editor changes preserve name and icon');
 editor.hass=makeHass('docked',{}, {'script.cozinha':{state:'off',attributes:{friendly_name:'Cozinha'}}});
 const scriptInput=editor.shadowRoot.querySelector('[data-field="entity"]');check(scriptInput.children.some(n=>n.value==='script.cozinha'),'editor lists scripts');
 scriptInput.value='script.cozinha';scriptInput.dispatchEvent({type:'change'});
 check(emitted.custom_buttons[0].entity==='script.cozinha'&&emitted.custom_buttons[0].name==='Minha cozinha','editor assigns script without losing personalization');
 check(editor.shadowRoot.querySelector('[data-field="icon"]').children.some(n=>n.value==='mop'),'sensor refresh preserves icon choices');
 editor.shadowRoot.querySelector('.remove-shortcut').dispatchEvent({type:'click'});check(emitted.custom_buttons.length===0,'editor removes shortcut');
 const soundToggle=editor.shadowRoot.querySelector('[name="sound"]');
 check(soundToggle.checked&&Number(editor.shadowRoot.querySelector('[name="sound_volume"]').value)===.18,'editor shows enabled sound at default volume');
 soundToggle.checked=false;soundToggle.dispatchEvent({type:'change'});
 check(emitted.sound===false&&emitted.battery_entity==='sensor.custom','editor disables sound without losing other settings');
 const volumeInput=editor.shadowRoot.querySelector('[name="sound_volume"]');volumeInput.value='0.35';volumeInput.dispatchEvent({type:'change'});
 check(emitted.sound_volume===.35&&emitted.sound===false,'editor volume is numeric and preserves mute setting');
 const audioContexts=[];
 class AudioMock {
  constructor(){this.state=AudioMock.initialState||'running';this.currentTime=0;this.destination={};this.tones=[];this.gains=[];audioContexts.push(this);}
  createOscillator(){const node={frequency:{events:[],setValueAtTime(value,time){this.events.push({value,time});}},connect(target){this.target=target;},disconnect(){this.disconnected=true;},start(time){this.startedAt=time;},stop(time){this.stoppedAt=time;}};this.tones.push(node);return node;}
  createGain(){const node={gain:{events:[],setValueAtTime(value,time){this.events.push({value,time});},linearRampToValueAtTime(value,time){this.events.push({value,time});},exponentialRampToValueAtTime(value,time){this.events.push({value,time});}},connect(target){this.target=target;},disconnect(){this.disconnected=true;}};this.gains.push(node);return node;}
  resume(){this.resumed=true;if(AudioMock.rejectResume)return Promise.reject(new Error('Audio blocked'));this.state='running';return Promise.resolve();}
  close(){this.state='closed';this.closed=true;return Promise.resolve();}
 }
 const flush=async()=>{await Promise.resolve();await Promise.resolve();};
 context.window.AudioContext=AudioMock;
 const sounding=new C();sounding.setConfig({entity:'vacuum.test',custom_buttons:[{name:'Sala',icon:'room',entity:'script.sala'}]});sounding.connectedCallback();
 const soundHass=()=>makeHass('docked',{supported_features:8192|4|8|16|32|512|1024,fan_speed:'Padrão',fan_speed_list:['Padrão','Turbo']},{'script.sala':{state:'off',attributes:{}}});
 sounding.hass=soundHass();
 const sq=selector=>sounding.shadowRoot.querySelector(selector);
 check(audioContexts.length===0,'loading and state updates never create audio');
 const menuCommands=commands.length;sq('.more-controls').dispatchEvent({type:'click'});
 const audio=sounding._audio;
 check(audio.tones.length===1&&sounding._controlsOpen&&commands.length===menuCommands,'more-controls click plays selection sound without a device command');
 const tone=audio.tones[0],gain=audio.gains[0];
 check(tone.frequency.events[0].value===740&&tone.frequency.events[1].value===990&&tone.stoppedAt-tone.startedAt===.14,'selection tone has two notes and stops after 140 ms');
 check(gain.gain.events[0].value===0&&gain.gain.events[1].value===.18&&gain.gain.events[2].value===.0001,'sound has a quiet volume envelope');
 tone.onended();check(tone.disconnected&&gain.disconnected,'finished tone releases audio nodes');
 audio.currentTime+=.2;sq('[data-action="primary"]').dispatchEvent({type:'click'});await flush();
 check(audio.tones.length===2&&commands.at(-1)[1]==='start','primary button produces one sound and sends its command');
 audio.currentTime+=.2;sq('[data-custom="0"]').dispatchEvent({type:'click'});await flush();
 check(audio.tones.length===3&&commands.at(-1)[0]==='script','custom shortcut produces sound and runs its script');
 audio.currentTime+=.2;const fanControl=sq('.fan-select');fanControl.value='Turbo';fanControl.dispatchEvent({type:'change'});await flush();
 check(audio.tones.length===4&&commands.at(-1)[1]==='set_fan_speed','power selection produces sound and changes the real mode');
 audio.currentTime+=.2;const disabledCommands=commands.length;sq('[data-action="return"]').dispatchEvent({type:'click'});await flush();
 check(audio.tones.length===4&&commands.length===disabledCommands,'disabled button produces neither sound nor command');
 sounding.hass=soundHass();check(audio.tones.length===4,'sensor refresh stays silent');
 audio.currentTime+=.2;sq('.more-controls').dispatchEvent({type:'click'});
 check(audio.tones.length===5&&!sounding._controlsOpen,'back-to-robot button plays selection sound');
 sounding.setConfig({entity:'vacuum.test',sound:false});sounding.hass=soundHass();audio.currentTime+=.2;sq('[data-action="primary"]').dispatchEvent({type:'click'});await flush();
 check(audio.tones.length===5&&commands.at(-1)[1]==='start','mute suppresses sound while device commands still work');
 sounding.setConfig({entity:'vacuum.test',sound_volume:0});sounding.hass=soundHass();sq('.more-controls').dispatchEvent({type:'click'});
 check(audio.tones.length===5&&sounding._config.sound_volume===0,'zero volume is respected');
 sounding.setConfig({entity:'vacuum.test',sound_volume:7});check(sounding._config.sound_volume===1,'volume is clamped to its maximum');
 sounding.setConfig({entity:'vacuum.test',sound_volume:-1});check(sounding._config.sound_volume===0,'negative volume is clamped to mute');
 sounding.disconnectedCallback();check(audio.closed&&!sounding._audio,'removing card closes its audio context');
 AudioMock.initialState='suspended';
 const unlocking=new C();unlocking.setConfig({entity:'vacuum.test'});unlocking.connectedCallback();unlocking.hass=soundHass();
 unlocking.shadowRoot.querySelector('.more-controls').dispatchEvent({type:'click'});await flush();
 check(unlocking._audio.resumed&&unlocking._audio.tones.length===1,'first gesture resumes a suspended audio context');
 unlocking.disconnectedCallback();AudioMock.rejectResume=true;
 const blocked=new C();blocked.setConfig({entity:'vacuum.test'});blocked.connectedCallback();blocked.hass=soundHass();const blockedBefore=commands.length;
 blocked.shadowRoot.querySelector('[data-action="primary"]').dispatchEvent({type:'click'});await flush();await flush();
 check(commands.length===blockedBefore+1&&blocked._audio.tones.length===0&&!blocked._pending,'blocked audio does not interrupt a device action');
 blocked.disconnectedCallback();delete context.window.AudioContext;
 const silent=new C();silent.setConfig({entity:'vacuum.test'});silent.connectedCallback();silent.hass=soundHass();const silentBefore=commands.length;
 silent.shadowRoot.querySelector('[data-action="primary"]').dispatchEvent({type:'click'});await flush();
 check(commands.length===silentBefore+1&&!silent._audio,'actions work when Web Audio is unavailable');silent.disconnectedCallback();
 const root=new Element('div');const preview=new C();preview.tagName='aspirador-vivo-card';preview.connectedCallback();root.append(preview);
 const demoStatus=new Element('span');demoStatus.setAttribute('class','demo-state');root.append(demoStatus);
 let interval,timeout;document.getElementById=()=>root;
 context.setInterval=fn=>{interval=fn;return 1;};context.clearInterval=()=>{};
 context.setTimeout=fn=>{timeout=fn;return 2;};context.clearTimeout=()=>{};
 vm.runInContext(readProject('demo-controller.js'),context);
 check(preview._mode==='docked'&&demoStatus.textContent==='Na base','preview starts docked');
 preview.shadowRoot.querySelector('.more-controls').dispatchEvent({type:'click'});check(preview._controlsOpen&&!preview.shadowRoot.querySelector('.controls-panel').hidden,'preview more-controls click works');
 await preview._runCustom(0);check(preview._mode==='cleaning'&&demoStatus.textContent==='Sala · simulação','preview room shortcut works');
 await preview._setFan('Turbo');check(preview.hass.states['vacuum.demonstracao'].attributes.fan_speed==='Turbo','preview power control works');
 await preview._act('locate');check(demoStatus.textContent==='Sinal sonoro simulado','preview locating gives feedback');
 await preview._act('return');timeout();preview._showControls(false);
 check(preview._mode==='docked'&&!preview._controlsOpen,'preview returns from controls to docked robot');
 await preview._act('primary');check(preview._mode==='cleaning','preview start interaction');
 const initialBattery=Number(preview.hass.states['sensor.demo_bateria'].state);interval();
 check(Number(preview.hass.states['sensor.demo_bateria'].state)===initialBattery-1,'simulated battery updates');
 await preview._act('primary');check(preview._mode==='paused','preview pause interaction');
 await preview._act('return');check(preview._mode==='returning','preview return interaction');timeout();
 check(preview._mode==='docked'&&demoStatus.textContent==='Na base','preview finishes return');
 vm.runInContext(readProject('aspirador-vivo-card.js'),context);
 check(context.window.customCards.length===1,'reload does not duplicate registration');
 preview.disconnectedCallback();
 console.log(`${checks} functional checks passed. Browser layout has not been rendered by these tests.`);
})().catch(e=>{console.error(e);process.exit(1);});
