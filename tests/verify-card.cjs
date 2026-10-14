/* Functional tests against the production source using a minimal generic DOM.
   This verifies data, commands and animation lifecycle, not browser rendering. */
const fs=require('fs');
const vm=require('vm');
const path=require('node:path');
const projectRoot=path.resolve(__dirname,'..');
const readProject=name=>fs.readFileSync(path.join(projectRoot,name),'utf8');
const productionFilename=process.argv[2] || 'vaccum-card-animations.js';
const assert=require('node:assert/strict');
let checks=0;
const check=(condition,label)=>{assert.ok(condition,label);checks++;};
const dataKey=k=>k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
class Style {
  constructor(){this.properties=new Map();}
  setProperty(key,value){this.properties.set(key,String(value));}
  getPropertyValue(key){return this.properties.get(key)||'';}
  removeProperty(key){const value=this.getPropertyValue(key);this.properties.delete(key);return value;}
}
class Element {
  constructor(tag='element'){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.style=new Style();this.events={};this.clientWidth=414;this.clientHeight=248;this.isConnected=true;this.hidden=false;this._text='';}
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
const registry=new Map();
const listeners={};
const document={hidden:false,createElement(tag){const C=registry.get(tag),element=C?new C():new Element(tag);element.tagName=tag;return element;},addEventListener(n,fn){listeners[n]=fn;},removeEventListener(n){delete listeners[n];}};
const makeMedia=()=>({matches:false,listeners:new Set(),addEventListener(name,callback){this.listeners.add(callback);},removeEventListener(name,callback){this.listeners.delete(callback);}});
const media=makeMedia(),colorMedia=makeMedia();
const stored=new Map();
const animationFrames=new Map();let nextFrame=0;
const requestFrame=callback=>{const id=++nextFrame;animationFrames.set(id,callback);return id;};
const cancelFrame=id=>animationFrames.delete(id);
let frameTime=0;
function advance(instance,milliseconds) {
  for(let i=0;i<Math.ceil(milliseconds/16);i++) {
    frameTime+=16;
    const id=instance._front.frame,callback=animationFrames.get(id);
    if(callback){animationFrames.delete(id);callback(frameTime);}
  }
}
const storage={blocked:false,writes:0,getItem(key){if(this.blocked)throw new Error('Storage blocked');return stored.get(key)||null;},setItem(key,value){if(this.blocked)throw new Error('Storage blocked');this.writes++;stored.set(key,String(value));},removeItem(key){if(this.blocked)throw new Error('Storage blocked');stored.delete(key);}};
function inheritedProperty(element,key){for(let node=element;node;node=node.parent){const value=node.style.getPropertyValue(key);if(value)return value;}return '';}
function resolveCss(value,element,depth=0){
 if(depth>10)return '';
 return String(value||'').replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]+))?\)/g,(_,key,fallback)=>resolveCss(inheritedProperty(element,key)||fallback||'',element,depth+1));
}
function computedStyle(element){return {transform:element.style.transform,color:resolveCss(element.style.color||'rgb(0, 0, 0)',element),getPropertyValue:key=>resolveCss(inheritedProperty(element,key),element)};}
class HTMLElement extends Element{attachShadow(){this.shadowRoot=new Element('shadow');this.shadowRoot.parent=this;return this.shadowRoot;}}
class ResizeObserver{constructor(fn){this.fn=fn;}observe(){}disconnect(){this.disconnected=true;}}
const context=vm.createContext({HTMLElement,ResizeObserver,document,window:{matchMedia:query=>query.includes('color-scheme')?colorMedia:media,localStorage:storage,location:{pathname:'/lovelace/demo'},requestAnimationFrame:requestFrame,cancelAnimationFrame:cancelFrame},customElements:{define:(n,C)=>registry.set(n,C),get:n=>registry.get(n)},getComputedStyle:computedStyle,CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},Intl,console});
vm.runInContext(readProject(productionFilename),context);
const C=registry.get('vaccum-card-animations');
check(!!C&&registry.has('vaccum-card-animations-editor'),'custom elements registered');
check(context.window.customCards[0].type==='vaccum-card-animations','card picker registration');
assert.throws(()=>new C().setConfig({entity:'sensor.invalid'}));checks++;
const beforeAttach=new C();beforeAttach.isConnected=false;beforeAttach.setConfig({entity:'vacuum.before_attach'});
beforeAttach.hass={states:{'vacuum.before_attach':{state:'cleaning',attributes:{supported_features:8192}}}};beforeAttach.isConnected=true;beforeAttach.connectedCallback();
check(beforeAttach._front.pose.x===.84&&beforeAttach._front.pose.z===.89&&beforeAttach._front.task.kind==='depart','first connection starts at the station');
beforeAttach.disconnectedCallback();
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
check(card._front.task.kind==='depart','departure runs once');
check(query('ha-card').dataset.active==='true'&&query('.top-battery').getAttribute('aria-hidden')==='false','battery moves to top');
check(query('[data-action="primary"]').textContent==='Pausar','cleaning button updated immediately');
advance(card,4000);
check(card._front.task.kind==='cleaning','departure enters the cleaning route');
const segments=card._front.task.segments;
check(segments.some(s=>s.type==='move'&&s.from.z===s.to.z&&s.from.x>s.to.x),'first pass moves horizontally');
check(segments.some(s=>s.type==='move'&&s.from.z===s.to.z&&s.from.x<s.to.x),'opposite pass returns horizontally');
check(segments.some(s=>s.type==='turn'&&s.from.x===s.to.x&&s.from.z===s.to.z),'turns stay in place');
const commandCount=commands.length;card._showControls(true);
check(card._controlsOpen&&query('.scene').hidden&&!query('.controls-panel').hidden&&query('.more-controls').getAttribute('aria-expanded')==='true','more button opens controls');
check(card._motion.playState==='paused'&&commands.length===commandCount,'opening controls pauses animation without commanding robot');
const panelPose=JSON.stringify(card._front.pose);card._showControls(false);
check(!card._controlsOpen&&!query('.scene').hidden&&query('.controls-panel').hidden&&query('.more-controls').getAttribute('aria-expanded')==='false','back button restores robot view');
check(JSON.stringify(card._front.pose)===panelPose,'closing controls preserves position and rotation');
const same=card._motion;card.hass=makeHass('cleaning',{battery_level:85});
check(card._motion===same&&query('.battery-value').textContent==='85%','sensor refresh does not restart animation');
advance(card,6000);const prior=JSON.stringify(card._front.pose);card.hass=makeHass('paused');
check(card._front.frame===null&&JSON.stringify(card._front.pose)===prior,'pause freezes current position');
check(query('[data-action="primary"]').textContent==='Continuar','pause control updated');
card.hass=makeHass('returning');check(card._front.task.kind==='return','return animation');
advance(card,12000);
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
check(card._front.frame===null&&query('[data-action="primary"]').disabled&&query('[data-action="return"]').disabled,'unavailable stops motion and commands');
card.hass=makeHass('error');check(card._front.frame===null&&query('[data-action="primary"]').disabled,'error stops motion');
card.setConfig({entity:'vacuum.test',animation:false});card.hass=makeHass('cleaning');
check(card._front.frame===null&&query('ha-card').dataset.motion==='false','disabled motion stops movement and motors');
card.setConfig({entity:'vacuum.test'});media.matches=true;card._mediaChanged();card.hass=makeHass('cleaning');
check(card._front.frame===null,'system reduced motion');media.matches=false;
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
 check(!query('[data-custom="0"]').disabled&&!!query('[data-custom="0"] .vca-icon'),'custom script has enabled personalized icon');
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
 check(!!query('[data-custom="0"] .vca-icon'),'missing image falls back to original icon');
 check(card.getGridOptions().rows===undefined,'control interface can grow in sections layout');
 const before=commands.length;card.hass=makeHass('docked',{supported_features:0});await card._act('primary');
 check(commands.length===before&&query('[data-action="primary"]').disabled,'unsupported command not sent');
 card.hass={...makeHass('docked'),callService:async()=>{throw new Error('offline');}};await card._act('primary');
 check(!query('.service-message').hidden&&query('.service-message').textContent.includes('offline')&&!card._pending,'service errors visible and pending cleared');
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
 // Calculate contrast independently from the card's color helper.
 const lightness=color=>{
  const channels=[1,3,5].map(index=>parseInt(color.slice(index,index+2),16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
 };
 const ratio=(first,second)=>{const a=lightness(first),b=lightness(second);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
 const readable=(instance,label)=>{
  const surface=instance.shadowRoot.querySelector('ha-card').style;
  const bg=surface.getPropertyValue('--vca-bg'),floor=surface.getPropertyValue('--vca-floor');
  check(/^#[a-f0-9]{6}$/.test(bg)&&/^#[a-f0-9]{6}$/.test(floor),`${label}: opaque card and floor colors`);
  for(const token of ['ink','muted','values','error'])check(Math.min(ratio(surface.getPropertyValue('--vca-'+token),bg),ratio(surface.getPropertyValue('--vca-'+token),floor))>=4.5,`${label}: readable ${token} on both surfaces`);
  check(ratio(surface.getPropertyValue('--vca-button-ink'),surface.getPropertyValue('--vca-accent'))>=4.5,`${label}: readable primary button`);
 };
 const appearance=new C();appearance.setConfig({entity:'vacuum.test',appearance_id:'appearance-tests'});appearance.connectedCallback();
 const aq=selector=>appearance.shadowRoot.querySelector(selector);
 const withThemes=(darkMode=false,themes={})=>({...makeHass('cleaning'),themes:{darkMode,themes}});
 appearance.style.setProperty('--ha-card-background','#13202b');
 appearance.style.setProperty('--primary-text-color','#20303b');
 appearance.style.setProperty('--secondary-text-color','#26353b');
 appearance.hass=withThemes(true);
 check(aq('.appearance-theme').value==='auto'&&appearance._resolvedPalette.bg==='#13202b','automatic appearance inherits HA card background');
 readable(appearance,'low-contrast inherited theme');
 check(context.window.customCards[0].name==='Vaccum card-animations'&&C.getStubConfig().name==='Vaccum card-animations'&&aq('.name').textContent==='Vaccum card-animations','requested card name used in defaults and picker');
 check(JSON.parse(readProject('hacs.json')).name==='Vaccum card-animations','HACS display name matches requested name');
 const motionBeforeTheme=appearance._motion,commandsBeforeTheme=commands.length;
 aq('.appearance-theme').value='light';aq('.appearance-theme').dispatchEvent({type:'change'});
 check(appearance._resolvedPalette.bg==='#f8fafb'&&aq('ha-card').style.colorScheme==='light','light preset stays light with inherited dark HA theme');
 check(appearance._motion===motionBeforeTheme&&commands.length===commandsBeforeTheme,'theme selection neither restarts motion nor commands the robot');
 readable(appearance,'light preset');
 check(JSON.parse(stored.get(appearance._appearanceStorageKey)).settings.theme==='light','theme choice persists');
 aq('.appearance-theme').value='dark';aq('.appearance-theme').dispatchEvent({type:'change'});
 readable(appearance,'dark preset');
 check(appearance._resolvedPalette.bg==='#17212b'&&aq('ha-card').style.colorScheme==='dark','dark preset uses matching opaque surfaces');
 const mainColor=aq('[data-appearance="text_color"]'),labelColor=aq('[data-appearance="secondary_text_color"]'),valueColor=aq('[data-appearance="value_color"]');
 const writesBeforeLive=storage.writes;mainColor.value='#ffdd80';mainColor.dispatchEvent({type:'input'});
 check(appearance._resolvedPalette.ink==='#ffdd80'&&storage.writes===writesBeforeLive&&mainColor.value==='#ffdd80','color picker previews a readable color without saving on every input');
 mainColor.dispatchEvent({type:'change'});
 check(storage.writes===writesBeforeLive+1&&JSON.parse(stored.get(appearance._appearanceStorageKey)).settings.text_color==='#ffdd80','committed color is saved');
 labelColor.value='#17212b';labelColor.dispatchEvent({type:'change'});valueColor.value='#17212b';valueColor.dispatchEvent({type:'change'});
 readable(appearance,'manual low-contrast colors');
 check(!aq('.appearance-adjusted').hidden&&aq('.appearance-adjusted').textContent.includes('ajustada'),'manual low contrast is visibly explained');
 check(commands.length===commandsBeforeTheme&&appearance._motion===motionBeforeTheme,'all appearance controls remain local while cleaning');
 const reloaded=new C();reloaded.setConfig({entity:'vacuum.test',appearance_id:'appearance-tests'});
 check(reloaded._appearance.theme==='dark'&&reloaded._appearance.text_color==='#ffdd80','new card instance restores saved settings');
 const separate=new C();separate.setConfig({entity:'vacuum.test',appearance_id:'separate-card'});
 check(separate._appearance.theme==='auto'&&separate._appearance.text_color==='','appearance identity isolates different cards');
 reloaded.setConfig({entity:'vacuum.test',appearance_id:'appearance-tests',theme:'light',text_color:'#345678'});
 check(reloaded._appearance.theme==='light'&&reloaded._appearance.text_color==='#345678','new configured defaults override older saved appearance');
 aq('.appearance-reset').dispatchEvent({type:'click'});
 check(appearance._appearance.theme==='auto'&&appearance._appearance.text_color===''&&!stored.has(appearance._appearanceStorageKey),'reset restores configured defaults and removes stored settings');
 const namedThemes={
  Oceano:{'ha-card-background':'var(--primary-background-color)','primary-background-color':'#03253a','primary-text-color':'var(--custom-ink)','custom-ink':'#e4f6fb','secondary-text-color':'#a6c3d1',modes:{dark:{'primary-color':'#70cbea'}}},
  Alternado:{modes:{light:{'ha-card-background':'#faf2eb'},dark:{'ha-card-background':'#30231b'}}},
  Transparente:{'ha-card-background':'rgba(255,255,255,0.5)',modes:{dark:{}}},
  '<img src=x>':{'ha-card-background':'#112233'}
 };
 appearance.hass=withThemes(false,namedThemes);appearance._changeAppearance('theme','ha:Oceano',true);
 check(appearance._resolvedPalette.bg==='#03253a'&&appearance._resolvedPalette.ink==='#e4f6fb'&&aq('ha-card').style.colorScheme==='dark','named dark-only HA theme uses scoped CSS variable aliases and overrides global light mode');
 readable(appearance,'named dark theme');
 check(appearance.style.getPropertyValue('--ha-card-background')==='#13202b'&&commands.length===commandsBeforeTheme,'named theme leaves host variables and device state intact');
 check(aq('.appearance-theme').children.some(option=>option.textContent==='<img src=x>'&&!option.querySelector('img')),'HA theme names are text rather than HTML');
 appearance._changeAppearance('theme','ha:Alternado',false);
 check(appearance._resolvedPalette.bg==='#faf2eb','named multi-mode theme selects HA light mode');
 const modeMotion=appearance._motion;appearance.hass=withThemes(true,namedThemes);
 check(appearance._resolvedPalette.bg==='#30231b'&&appearance._motion===modeMotion,'HA dark-mode change switches named palette without restarting motion');
 appearance._changeAppearance('theme','ha:Transparente',false);
 check(appearance._resolvedPalette.bg==='#8b9095','transparent theme background is composited into an opaque surface');
 readable(appearance,'composited theme');
 appearance._changeAppearance('theme','ha:Removido',false);
 check(appearance._resolvedPalette.bg==='#13202b'&&aq('.appearance-theme').children.some(option=>option.value==='ha:Removido')&&!aq('.appearance-adjusted').hidden,'missing named theme falls back visibly and retains the selection');
 const invalidAppearance=JSON.stringify(appearance._appearance),invalidWrites=storage.writes;
 appearance._changeAppearance('text_color','red;display:none',true);appearance._changeAppearance('__proto__','#ffffff',true);
 check(JSON.stringify(appearance._appearance)===invalidAppearance&&storage.writes===invalidWrites,'invalid colors and unknown appearance fields are ignored');
 appearance.setConfig({entity:'vacuum.test',appearance_id:'auto-switching-tests',theme:'auto',text_color:'var(--unknown)',secondary_text_color:'transparent'});
 check(appearance._appearance.text_color===''&&appearance._appearance.secondary_text_color==='','invalid config color values fall back safely');
 for(const name of ['--ha-card-background','--primary-text-color','--secondary-text-color'])appearance.style.removeProperty(name);
 appearance.hass=withThemes(false,namedThemes);check(appearance._resolvedPalette.bg==='#f8fafb','automatic palette follows explicit HA light mode');
 colorMedia.matches=true;appearance._colorMediaChanged();
 check(appearance._resolvedPalette.bg==='#f8fafb','HA mode has priority over system dark preference');
 appearance.hass={...makeHass('cleaning'),themes:{themes:namedThemes}};
 check(appearance._resolvedPalette.bg==='#17212b','system dark preference is used when HA mode is absent');
 colorMedia.matches=false;const systemMotion=appearance._motion;appearance._colorMediaChanged();
 check(appearance._resolvedPalette.bg==='#f8fafb'&&appearance._motion===systemMotion,'system appearance changes do not restart animation');
 for(const background of ['#000000','#666666','#767676','#7f7f7f','#aaaaaa','#ffffff']){
  appearance.style.setProperty('--ha-card-background',background);appearance.style.setProperty('--primary-text-color',background);appearance.style.setProperty('--secondary-text-color',background);appearance._applyAppearance(true);
  const palette=appearance._resolvedPalette;
  check(['ink','muted','values','error'].every(key=>Math.min(ratio(palette[key],palette.bg),ratio(palette[key],palette.floor))>=4.5),`automatic contrast correction works on ${background}`);
 }
 stored.set(separate._appearanceStorageKey,'{not-json');separate.setConfig({entity:'vacuum.test',appearance_id:'separate-card'});
 check(separate._appearance.theme==='auto','corrupted storage cannot break the card');
 storage.blocked=true;separate._changeAppearance('theme','dark',true);
 check(separate._resolvedPalette.bg==='#17212b'&&separate.shadowRoot.querySelector('.appearance-note').textContent.includes('sessão'),'blocked storage still applies appearance and explains session-only saving');
 separate.hass=makeHass('docked');const storageCommands=commands.length;await separate._act('primary');
 check(commands.length===storageCommands+1,'blocked storage does not prevent robot actions');
 separate.shadowRoot.querySelector('.appearance-reset').dispatchEvent({type:'click'});
 check(separate._appearance.theme==='auto','reset still works when storage is blocked');storage.blocked=false;
 separate.setConfig({entity:'vacuum.test',name:'Bob o Aspirador'});
 check(separate.shadowRoot.querySelector('.name').textContent==='Bob o Aspirador','custom robot names are retained');
 const renameEditor=C.getConfigElement();renameEditor.setConfig({entity:'vacuum.test'});renameEditor.hass=makeHass();
 check(renameEditor.shadowRoot.querySelector('[name="name"]').value==='Vaccum card-animations','editor defaults use the requested name');
 appearance.disconnectedCallback();check(!colorMedia.listeners.has(appearance._colorMediaChanged),'disconnect removes system theme listener');
 context.window.AudioContext=AudioMock;AudioMock.initialState='running';AudioMock.rejectResume=false;
 const appearanceSound=new C();appearanceSound.setConfig({entity:'vacuum.test',appearance_id:'sound-tests'});appearanceSound.hass=makeHass();
 const asq=selector=>appearanceSound.shadowRoot.querySelector(selector),appearanceSoundCommands=commands.length;
 asq('.appearance-theme').value='dark';asq('.appearance-theme').dispatchEvent({type:'change'});
 check(appearanceSound._audio.tones.length===1,'theme selection plays the choice sound');
 appearanceSound._audio.currentTime+=.2;const soundColor=asq('[data-appearance="text_color"]');soundColor.value='#ffeedd';soundColor.dispatchEvent({type:'input'});
 check(appearanceSound._audio.tones.length===1,'live color preview does not repeat the choice sound');
 soundColor.dispatchEvent({type:'change'});check(appearanceSound._audio.tones.length===2,'committing a text color plays the choice sound');
 appearanceSound._audio.currentTime+=.2;asq('.appearance-reset').dispatchEvent({type:'click'});
 check(appearanceSound._audio.tones.length===3&&commands.length===appearanceSoundCommands,'appearance reset plays sound without commanding the robot');
 appearanceSound.disconnectedCallback();delete context.window.AudioContext;
 const Legacy=registry.get('aspirador-vivo-card');
 check(Legacy&&registry.has('aspirador-vivo-card-editor'),'old dashboard types retain compatibility aliases');
 const legacy=new Legacy();legacy.setConfig({type:'custom:aspirador-vivo-card',entity:'vacuum.test'});legacy.hass=makeHass();
 check(legacy.shadowRoot.querySelector('.name').textContent==='Vaccum card-animations'&&!legacy.shadowRoot.querySelector('.badge'),'legacy configuration shows new branding without the VIVO badge');
 const dusty=new C();dusty.setConfig({entity:'vacuum.test',sound:false});dusty.connectedCallback();dusty.hass=makeHass();
 check(dusty._front.dust.length===0&&dusty._debrisLayer.hidden,'docked floor is clean');
 const dirtCommands=commands.length;dusty.hass=makeHass('cleaning');
 check(dusty._front.dust.length===12&&dusty._front.frame!=null,'cleaning places bounded random dirt');
 check(dusty._debrisLayer.getAttribute('aria-hidden')==='true'&&commands.length===dirtCommands,'dirt is decorative and sends no commands');
 advance(dusty,40000);const collected=dusty._front.dust;
 check(collected.every(p=>p.collected),'one complete route picks up every dirt cluster');
 dusty.hass=makeHass('cleaning',{battery_level:71});
 check(dusty._front.dust===collected&&collected.every(p=>p.collected),'a sensor refresh keeps the floor clean');
 dusty.hass=makeHass('docked');check(dusty._front.dust.length===0&&dusty._debrisLayer.hidden,'docked state clears decorative dirt');
 dusty.hass=makeHass('cleaning');check(dusty._front.dust!==collected&&dusty._front.dust.every(p=>!p.collected),'new cleaning creates new dirt');
 dusty.setConfig({entity:'vacuum.test',dirt:false});dusty.hass=makeHass('cleaning');
 check(dusty._front.frame!=null&&dusty._front.dust.length===0&&dusty._debrisLayer.hidden,'dirt toggle retains robot motion');
 dusty.setConfig({entity:'vacuum.test',animation:false});dusty.hass=makeHass('cleaning');
 check(dusty._front.frame===null&&dusty._front.dust.length===0,'disabled motion never leaves uncollectable dirt');
 dusty.disconnectedCallback();
 delete context.window.requestAnimationFrame;
 const noFrame=new C();noFrame.setConfig({entity:'vacuum.test'});noFrame.hass=makeHass('cleaning');
 check(noFrame._front.frame===null&&noFrame._debrisLayer.hidden&&!noFrame.shadowRoot.querySelector('[data-action="primary"]').disabled,'missing frame API retains device controls without decorative motion');
 noFrame.disconnectedCallback();context.window.requestAnimationFrame=requestFrame;
 const personalized=new C();personalized.setConfig({entity:'vacuum.test',sound:false,buttons:{
  start:{name:'Começar agora',icon:'mop'},pause:{name:'Dar uma pausa',icon:'stop'},resume:{name:'Seguir limpando',icon:'room'},
  return:{name:'Ir para a base',icon:'dock',icon_image:'/local/icones/base.svg'},stop:{name:'Encerrar',icon:'pause'},
  spot:{name:'Limpar aqui',icon:'spot'},locate:{name:'Onde está?',icon:'locate'},fan:{name:'Força da limpeza',icon:'fan'},
  more:{name:'Abrir opções',icon:'controls'},back:{name:'Ver aspirador',icon:'room'},appearance_reset:{name:'Cores originais',icon:'back'}
 }});personalized.connectedCallback();
 const ph=mode=>makeHass(mode,{supported_features:8192|4|8|16|32|512|1024,fan_speed:'Padrão',fan_speed_list:['Padrão','Turbo']});
 const pq=selector=>personalized.shadowRoot.querySelector(selector);personalized.hass=ph('docked');
 check(personalized.shadowRoot.querySelectorAll('[data-action="primary"] .button-label').every(label=>label.textContent==='Começar agora'),'custom start label appears in both robot and control views');
 check(personalized.shadowRoot.querySelectorAll('[data-action="return"] .button-label').every(label=>label.textContent==='Ir para a base')&&personalized.shadowRoot.querySelectorAll('[data-action="return"] .button-icon img').every(img=>img.src==='/local/icones/base.svg'),'custom return label and image appear in both views');
 for(const [key,label] of [['stop','Encerrar'],['spot','Limpar aqui'],['locate','Onde está?']])check(pq(`[data-action="${key}"] .button-label`).textContent===label,`custom ${key} label`);
 check(pq('.fan-field label').textContent==='Força da limpeza'&&pq('.fan-select').getAttribute('aria-label')==='Força da limpeza','power label is configurable and accessible');
 check(pq('.more-controls .button-label').textContent==='Abrir opções'&&pq('.appearance-reset .button-label').textContent==='Cores originais','navigation and appearance-reset buttons are configurable');
 const personalizedCommands=commands.length;personalized._showControls(true);
 check(pq('.more-controls .button-label').textContent==='Ver aspirador'&&commands.length===personalizedCommands,'custom back label switches correctly without device commands');
 personalized._showControls(false);check(pq('.more-controls .button-label').textContent==='Abrir opções','custom menu label returns after closing controls');
 personalized.hass=ph('cleaning');check(pq('[data-action="primary"] .button-label').textContent==='Dar uma pausa','custom pause label follows the cleaning state');
 await personalized._act('primary');check(commands.at(-1)[1]==='pause'&&commands.at(-1)[2].entity_id==='vacuum.test','custom pause appearance still sends the real pause command');
 personalized.hass=ph('paused');check(pq('[data-action="primary"] .button-label').textContent==='Seguir limpando','resume has a separately configured label');
 await personalized._act('primary');check(commands.at(-1)[1]==='start','custom resume still starts the same robot');
 await personalized._act('return');check(commands.at(-1)[1]==='return_to_base','custom return still invokes return-to-base');
 personalized.setConfig({entity:'vacuum.test',buttons:{pause:{name:'<img src=x onerror=alert(1)>',icon:'pause',icon_image:'javascript:alert(1)'}}});personalized.hass=ph('cleaning');
 check(pq('[data-action="primary"] .button-label').textContent==='<img src=x onerror=alert(1)>'&&!pq('[data-action="primary"] .button-label img')&&!pq('[data-action="primary"] .button-icon img'),'main button names remain text and unsafe image protocols are rejected');
 personalized.setConfig({entity:'vacuum.test',icons:{pause:'mop'},buttons:{pause:{icon:'stop'}}});personalized.hass=ph('cleaning');
 check(pq('[data-action="primary"] .button-icon').dataset.iconKey.startsWith('stop'),'new button customization has priority over legacy icon configuration');
 personalized.setConfig({entity:'vacuum.test',icons:{pause:'mop'}});personalized.hass=ph('cleaning');
 check(pq('[data-action="primary"] .button-icon').dataset.iconKey.startsWith('mop'),'existing icon configuration remains supported');
 registry.set('ha-icon',class extends HTMLElement {});
 personalized.setConfig({entity:'vacuum.test',buttons:{pause:{icon:'mdi:pause-circle'}}});personalized.hass=ph('cleaning');
 check(pq('[data-action="primary"] ha-icon').getAttribute('icon')==='mdi:pause-circle','main control renders the selected native Home Assistant icon');personalized.disconnectedCallback();
 assert.throws(()=>new C().setConfig({entity:'vacuum.test',buttons:[]}));checks++;
 const buttonEditor=C.getConfigElement();buttonEditor.setConfig({entity:'vacuum.test',custom_buttons:[{name:'Sala',icon:'room',entity:'script.sala'}]});buttonEditor.hass=makeHass();
 let buttonConfig;buttonEditor.addEventListener('config-changed',event=>{buttonConfig=event.detail.config;});
 const bq=selector=>buttonEditor.shadowRoot.querySelector(selector),buttonPicker=bq('[data-button-picker]');
 check(buttonPicker.children.length===11&&buttonPicker.children.some(option=>option.value==='pause')&&buttonPicker.children.some(option=>option.value==='appearance_reset'),'editor exposes every main, power, navigation and reset control');
 buttonPicker.value='pause';buttonPicker.dispatchEvent({type:'change'});
 const buttonName=bq('[data-control-field="name"]'),buttonIcon=bq('[data-control-field="icon"]'),buttonImage=bq('[data-control-field="icon_image"]');
 buttonName.value='Pausa rápida';buttonName.dispatchEvent({type:'change'});buttonIcon.value='mdi:pause-circle';buttonIcon.dispatchEvent({type:'change'});buttonImage.value='/local/icones/pausa.svg';buttonImage.dispatchEvent({type:'change'});
 check(buttonConfig.buttons.pause.name==='Pausa rápida'&&buttonConfig.buttons.pause.icon==='mdi:pause-circle'&&buttonConfig.buttons.pause.icon_image==='/local/icones/pausa.svg','sequential main button edits preserve name, icon and image');
 check(buttonConfig.custom_buttons[0].entity==='script.sala'&&!Object.prototype.hasOwnProperty.call(buttonConfig,'undefined'),'main button editing preserves scripts and does not add unnamed config fields');
 buttonPicker.value='return';buttonPicker.dispatchEvent({type:'change'});buttonName.value='Voltar para casa';buttonName.dispatchEvent({type:'change'});
 check(buttonConfig.buttons.return.name==='Voltar para casa'&&buttonConfig.buttons.pause.name==='Pausa rápida','editing a second button preserves the first');
 buttonEditor.hass=makeHass('cleaning');check(buttonPicker.value==='return'&&buttonName.value==='Voltar para casa'&&buttonPicker.children.length===11,'entity refresh preserves selected control and its edits');
 bq('.reset-control').dispatchEvent({type:'click'});
 check(!buttonConfig.buttons.return&&buttonConfig.buttons.pause.name==='Pausa rápida'&&buttonName.value==='Voltar à base','reset restores just the selected button');
 const dirtToggle=bq('[name="dirt"]');dirtToggle.checked=false;dirtToggle.dispatchEvent({type:'change'});
 check(buttonConfig.dirt===false&&buttonConfig.buttons.pause.name==='Pausa rápida','editor can disable dirt without losing button customizations');
 buttonEditor.setConfig({entity:'vacuum.test',icons:{start:'room'},buttons:{resume:{name:'Retomar',icon:'mop'}}});
 const resumePicker=bq('[data-button-picker]');resumePicker.value='resume';resumePicker.dispatchEvent({type:'change'});bq('.reset-control').dispatchEvent({type:'click'});
 check(bq('[data-control-field="icon"]').value==='clean'&&buttonConfig.icons.start==='room','restoring resume does not alter a separately configured start icon');
 const root=new Element('div');const preview=new C();preview.tagName='vaccum-card-animations';preview.connectedCallback();root.append(preview);
 const previewEditor=C.getConfigElement();previewEditor.tagName='vaccum-card-animations-editor';root.append(previewEditor);
 const demoStatus=new Element('span');demoStatus.setAttribute('class','demo-state');root.append(demoStatus);
 let interval,timeout;document.getElementById=()=>root;
 context.setInterval=fn=>{interval=fn;return 1;};context.clearInterval=()=>{};
 context.setTimeout=fn=>{timeout=fn;return 2;};context.clearTimeout=()=>{};
 vm.runInContext(readProject('demo-controller.js'),context);
 check(preview._mode==='docked'&&demoStatus.textContent==='Na base','preview starts docked');
 check(previewEditor.shadowRoot.querySelector('.button-settings').open&&previewEditor.shadowRoot.querySelector('[name="name"]').parent.hidden,'preview uses the real button editor while hiding unrelated settings');
 const previewButtonPicker=previewEditor.shadowRoot.querySelector('[data-button-picker]');previewButtonPicker.value='return';previewButtonPicker.dispatchEvent({type:'change'});
 const previewReturnName=previewEditor.shadowRoot.querySelector('[data-control-field="name"]');previewReturnName.value='Minha estação';previewReturnName.dispatchEvent({type:'change'});
 check(preview.shadowRoot.querySelector('[data-action="return"] .button-label').textContent==='Minha estação'&&preview._mode==='docked','preview button edits update the real card and preserve the simulated device state');
 preview.shadowRoot.querySelector('.more-controls').dispatchEvent({type:'click'});check(preview._controlsOpen&&!preview.shadowRoot.querySelector('.controls-panel').hidden,'preview more-controls click works');
 await preview._runCustom(0);check(preview._mode==='cleaning'&&demoStatus.textContent==='Sala · simulação','preview room shortcut works');
 await preview._setFan('Turbo');check(preview.hass.states['vacuum.demonstracao'].attributes.fan_speed==='Turbo','preview power control works');
 await preview._act('locate');check(demoStatus.textContent==='Sinal sonoro simulado','preview locating gives feedback');
 await preview._act('return');preview._showControls(false);advance(preview,12000);await Promise.resolve();
 check(preview._mode==='docked'&&!preview._controlsOpen,'preview returns from controls to docked robot');
 await preview._act('primary');check(preview._mode==='cleaning','preview start interaction');
 check(preview._front.dust.length===12&&!preview._debrisLayer.hidden,'preview start displays dirt along the cleaning route');
 advance(preview,1700);
 const initialBattery=Number(preview.hass.states['sensor.demo_bateria'].state);interval();
 check(Number(preview.hass.states['sensor.demo_bateria'].state)===initialBattery-1,'simulated battery updates');
 await preview._act('primary');check(preview._mode==='paused','preview pause interaction');
 await preview._act('return');check(preview._mode==='returning','preview return interaction');advance(preview,12000);await Promise.resolve();
 check(preview._mode==='docked'&&demoStatus.textContent==='Na base','preview finishes return');
 vm.runInContext(readProject(productionFilename),context);
 check(context.window.customCards.length===1,'reload does not duplicate registration');
 // Simulate an obsolete HACS resource registering the card before the new one.
 const outdated=class OutdatedCard extends HTMLElement {};
 registry.set('vaccum-card-animations',outdated);
 vm.runInContext(readProject(productionFilename),context);
 const recovery=registry.get('vaccum-card-animations-v151');
 check(registry.get('vaccum-card-animations')===outdated,'old registered type is not redefined');
 check(!!recovery && recovery.VCA_VERSION==='1.5.1','recovery type uses the updated renderer');
 check(registry.get('vaccum-card-animations-v151-editor') && recovery.getConfigElement().tagName==='vaccum-card-animations-v151-editor','recovery type uses the updated editor');
 check(context.window.customCards.some(c=>c.type==='vaccum-card-animations-v151'),'version conflict exposes recovery card in picker');
 preview.disconnectedCallback();
 console.log(`${checks} functional checks passed. Browser layout has not been rendered by these tests.`);
})().catch(e=>{console.error(e);process.exit(1);});
