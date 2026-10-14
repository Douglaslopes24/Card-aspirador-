/* Vaccum card-animations 1.5.0 — Home Assistant custom card, no external dependencies. */
(() => {
  "use strict";
  const TYPE = "vaccum-card-animations";
  // Compatibility aliases for dashboards configured before the rename.
  const LEGACY_TYPE = "aspirador-vivo-card";
  const LABELS = {docked:"Na base", cleaning:"Limpando", returning:"Voltando à base", paused:"Pausado", idle:"Parado", error:"Precisa de atenção", unavailable:"Indisponível", unknown:"Sem informação"};
  const FEATURES = {start:8192, pause:4, stop:8, return_to_base:16, clean_spot:1024, locate:512, set_fan_speed:32, send_command:256};
  // Original icons for the custom control interface, with no external icon font.
  const ICONS = {
    clean:'<ellipse cx="12" cy="16" rx="8" ry="4"/><path d="M4 16v2c0 2 3.6 4 8 4s8-2 8-4v-2M10 15l4 1-4 2zM5 4v4M3 6h4M18 4v4M16 6h4"/>',
    pause:'<ellipse cx="12" cy="16" rx="8" ry="4"/><path d="M4 16v2c0 2 3.6 4 8 4s8-2 8-4v-2M10 3v6M14 3v6"/>',
    stop:'<ellipse cx="12" cy="17" rx="8" ry="4"/><path d="M4 17v2c0 2 3.6 3 8 3s8-1 8-3v-2"/><rect x="9" y="2" width="6" height="6" rx="1"/>',
    dock:'<path d="M14 21h7V7l-4-3-4 3v5M16 8h2M16 11h2M3 17h13M12 13l4 4-4 4"/><ellipse cx="6" cy="10" rx="4" ry="2.5"/>',
    spot:'<ellipse cx="12" cy="16" rx="4" ry="2.5"/><path d="M4 10c2-2 5-3 8-3s6 1 8 3M3 16c0-2 1-3 2-4M21 16c0-2-1-3-2-4M5 20c4 3 10 3 14 0M12 2v2M10 3h4"/>',
    locate:'<ellipse cx="12" cy="19" rx="8" ry="3"/><path d="M17 7c0 4-5 8-5 8S7 11 7 7a5 5 0 0110 0z"/><circle cx="12" cy="7" r="1.5"/>',
    room:'<path d="M3 21V8l9-5 9 5v13M3 12h6v9M15 8v6h6"/><ellipse cx="15" cy="19" rx="4" ry="2.5"/>',
    kitchen:'<path d="M3 3v7M6 3v7M9 3v7M3 7h6M6 10v11M17 3v18M17 3c5 1 5 9 0 10"/>',
    mop:'<path d="M12 2c-2 3-3 4-3 6a3 3 0 006 0c0-2-1-3-3-6zM4 18l3-4M17 14l3 4"/><ellipse cx="7" cy="19" rx="5" ry="3"/><ellipse cx="17" cy="19" rx="5" ry="3"/>',
    fan:'<circle cx="12" cy="12" r="2"/><path d="M12 10c-6-7 4-10 5-5 1 3-2 5-5 5M14 13c9-1 6 9 1 7-3-1-3-4-1-7M10 13c-3 9-10 2-6-2 2-2 5-1 6 2"/>',
    controls:'<path d="M3 6h6M15 6h6M3 12h12M19 12h2M3 18h2M11 18h10"/><circle cx="12" cy="6" r="3"/><circle cx="17" cy="12" r="2"/><circle cx="8" cy="18" r="3"/>',
    back:'<path d="M14 5l-7 7 7 7M7 12h14"/>',
    add:'<path d="M12 4v16M4 12h16"/>',
    trash:'<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>'
  };
  const iconSVG = name => `<svg class="vca-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.controls}</svg>`;
  const iconNames = {clean:"Aspirador",pause:"Pausa",stop:"Parar",dock:"Base",spot:"Limpeza pontual",locate:"Localizar",room:"Cômodo",kitchen:"Cozinha",mop:"Mops",fan:"Potência",controls:"Controles",back:"Voltar",add:"Adicionar",trash:"Remover"};
  const BUTTONS = {
    start:{name:"Iniciar limpeza",icon:"clean"},pause:{name:"Pausar",icon:"pause"},resume:{name:"Continuar",icon:"clean"},
    return:{name:"Voltar à base",icon:"dock"},stop:{name:"Parar limpeza",icon:"stop"},spot:{name:"Limpeza pontual",icon:"spot"},locate:{name:"Encontrar robô",icon:"locate"},fan:{name:"Potência de aspiração",icon:"fan"},
    more:{name:"Mais controles",icon:"controls"},back:{name:"Voltar ao robô",icon:"back"},appearance_reset:{name:"Restaurar aparência",icon:"back"}
  };
  function buttonDefinition(config,key) {
    const defaults=BUTTONS[key];
    const custom=config?.buttons?.[key];
    const icon=custom?.icon || config?.icons?.[key] || (key === "resume" ? config?.icons?.start : "");
    return {
      name:typeof custom?.name === "string" && custom.name.trim() ? custom.name.trim().slice(0,120) : defaults.name,
      icon:typeof icon === "string" && (Object.prototype.hasOwnProperty.call(ICONS,icon) || /^mdi:[a-z0-9-]+$/.test(icon)) ? icon : defaults.icon,
      icon_image:typeof custom?.icon_image === "string" ? custom.icon_image : ""
    };
  }
  const valid = v => v !== null && v !== undefined && v !== "" && !["unknown","unavailable","none"].includes(String(v).toLowerCase());
  const number = v => valid(v) && Number.isFinite(Number(String(v).replace(",","."))) ? Number(String(v).replace(",",".")) : null;
  const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  function readMetric(hass, config, key, attributes) {
    const entityId = config[key + "_entity"];
    if (entityId) {
      const sensor = hass?.states?.[entityId];
      return {value: valid(sensor?.state) ? sensor.state : null, unit: sensor?.attributes?.unit_of_measurement || config[key + "_unit"] || ""};
    }
    const vacuum = hass?.states?.[config.entity];
    const attrName = config[key + "_attribute"];
    const names = attrName ? [attrName] : attributes;
    const name = names.find(n => valid(vacuum?.attributes?.[n]));
    return {value: name ? vacuum.attributes[name] : null, unit: config[key + "_unit"] || (key === "battery" ? "%" : "min")};
  }
  function duration(metric) {
    if (!valid(metric.value)) return "—";
    const n = number(metric.value);
    if (n === null) return String(metric.value);
    if (n < 0) return "—";
    const u = String(metric.unit).toLowerCase();
    if (["s","sec","seconds","segundos"].includes(u)) {
      const total = Math.round(n);
      return `${Math.floor(total/60)}:${String(total%60).padStart(2,"0")} min`;
    }
    return `${new Intl.NumberFormat("pt-BR", {maximumFractionDigits:1}).format(n)} ${metric.unit || "min"}`;
  }

  const CARD_NAME = "Vaccum card-animations";
  const PALETTES = {
    light:{bg:"#f8fafb",ink:"#182b36",muted:"#526773",accent:"#087f92",buttonInk:"#ffffff",error:"#a73535"},
    dark:{bg:"#17212b",ink:"#edf4f8",muted:"#aabfcf",accent:"#6bdace",buttonInk:"#102932",error:"#ffb2a9"}
  };
  const APPEARANCE_COLORS = {text_color:"ink",secondary_text_color:"muted",value_color:"values"};
  const normalizeHex = value => {
    if(typeof value !== "string" || !/^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/i.test(value)) return "";
    const hex=value.toLowerCase();
    return hex.length === 4 ? "#"+[...hex.slice(1)].map(c=>c+c).join("") : hex;
  };
  function normalizeAppearance(config) {
    let theme=typeof config?.theme === "string" ? config.theme.trim() : "auto";
    if(!theme || theme.length>180) theme="auto";
    if(!["auto","light","dark"].includes(theme) && !theme.startsWith("ha:")) theme="ha:"+theme;
    if(theme === "ha:") theme="auto";
    return {theme,...Object.fromEntries(Object.keys(APPEARANCE_COLORS).map(key=>[key,normalizeHex(config?.[key])]))};
  }
  function colorChannels(value) {
    const text=String(value || "").trim().toLowerCase();
    if(text === "transparent") return [0,0,0,0];
    if(/^#[a-f0-9]{3,4}$/i.test(text)) return colorChannels("#"+[...text.slice(1)].map(c=>c+c).join(""));
    if(/^#[a-f0-9]{6}(?:[a-f0-9]{2})?$/i.test(text)) return [1,3,5].map(i=>parseInt(text.slice(i,i+2),16)).concat(text.length === 9 ? parseInt(text.slice(7,9),16)/255 : 1);
    if(!/^rgba?\(/.test(text)) return null;
    const tokens=text.slice(text.indexOf("(")+1,text.lastIndexOf(")")).match(/[-+]?(?:\d*\.)?\d+%?/g);
    if(!tokens || ![3,4].includes(tokens.length)) return null;
    return tokens.slice(0,3).map(t=>clamp(parseFloat(t)*(t.endsWith("%") ? 2.55 : 1),0,255)).concat(tokens[3] ? clamp(parseFloat(tokens[3])/(tokens[3].endsWith("%") ? 100 : 1),0,1) : 1);
  }
  const channelsHex = channels => "#"+channels.slice(0,3).map(n=>Math.round(clamp(n,0,255)).toString(16).padStart(2,"0")).join("");
  function mixColor(first,second,amount) {
    const a=colorChannels(first),b=colorChannels(second);
    return channelsHex(a.slice(0,3).map((n,i)=>n+(b[i]-n)*amount));
  }
  function luminance(hex) {
    const linear=colorChannels(hex).slice(0,3).map(n=>{const c=n/255;return c<=0.04045 ? c/12.92 : ((c+0.055)/1.055)**2.4;});
    return linear[0]*0.2126+linear[1]*0.7152+linear[2]*0.0722;
  }
  function contrastRatio(first,second) {
    const a=luminance(first),b=luminance(second);
    return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
  }
  function readableColor(color,backgrounds,minimum=4.5) {
    const score=c=>Math.min(...backgrounds.map(bg=>contrastRatio(c,bg)));
    if(score(color)>=minimum) return color;
    for(let step=1;step<=100;step++) {
      const choices=[mixColor(color,"#000000",step/100),mixColor(color,"#ffffff",step/100)];
      const passing=choices.filter(c=>score(c)>=minimum);
      if(passing.length) return passing.sort((a,b)=>score(b)-score(a))[0];
    }
    return score("#000000")>=score("#ffffff") ? "#000000" : "#ffffff";
  }

  const CSS = `
    :host { display:block; font-family:var(--paper-font-body1_-_font-family,Roboto,Arial,sans-serif);
      --vca-bg:#f8fafb; --vca-ink:#182b36; --vca-muted:#526773; --vca-values:var(--vca-ink);
      --vca-accent:#087f92; --vca-button-ink:#fff; --vca-line:#dde6eb; --vca-floor:#edf3f5;
      --vca-error:#a73535; --vca-shadow:#213e4220; }
    * { box-sizing:border-box; }
    ha-card { display:block; position:relative; overflow:hidden; background:var(--vca-bg); color:var(--vca-ink);
      border-radius:var(--ha-card-border-radius,24px); border:1px solid var(--vca-line); box-shadow:var(--ha-card-box-shadow,0 12px 32px var(--vca-shadow)); container-type:inline-size; }
    header { display:flex; align-items:center; gap:12px; padding:20px 22px 10px; }
    .heading { min-width:0; flex:1; }
    .name { margin:0 0 5px; font-size:17px; font-weight:500; overflow-wrap:anywhere; }
    .state { display:flex; align-items:center; gap:7px; color:var(--vca-muted); font-size:12px; }
    .dot { flex:none; width:6px; height:6px; border-radius:50%; background:var(--vca-muted); }
    [data-mode=cleaning] .dot, [data-mode=docked] .dot { background:var(--vca-accent); }
    [data-mode=error] .dot { background:var(--vca-error); }
    .scene { position:relative; height:248px; margin:0 8px; overflow:hidden; }
    .debris-layer { position:absolute; inset:0; pointer-events:none; }
    .debris { position:absolute; width:18px; height:16px; opacity:1; transition:opacity .18s ease-out; }
    .debris[data-collected=true] { opacity:0; }
    .debris i { position:absolute; display:block; background:var(--vca-muted); border-radius:2px; opacity:.85; }
    .debris i:first-child { width:6px; height:4px; left:1px; top:4px; transform:rotate(-23deg); }
    .debris i:nth-child(2) { width:4px; height:4px; left:10px; top:9px; border-radius:50%; }
    .debris i:nth-child(3) { width:3px; height:3px; left:11px; top:1px; transform:rotate(35deg); }
    .stats { position:absolute; top:24px; left:14px; right:132px; display:grid; gap:18px; transition:opacity .35s,transform .35s; }
    .metric { min-width:0; }
    .metric-label { color:var(--vca-muted); font-size:12px; margin-bottom:5px; line-height:1.4; }
    .metric-value { color:var(--vca-values); font-size:22px; font-weight:500; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
    .metric:not(:first-child) .metric-value { font-size:17px; }
    .battery-track { margin-top:9px; height:4px; max-width:126px; background:var(--vca-line); border-radius:3px; overflow:hidden; }
    .battery-fill { height:100%; width:0; background:var(--vca-accent); border-radius:inherit; transition:width .5s; }
    .top-battery { position:absolute; top:12px; left:14px; right:14px; display:grid; grid-template-columns:1fr auto; gap:7px 15px; align-items:center;
      opacity:0; transform:translateY(-8px); pointer-events:none; transition:opacity .35s,transform .35s; }
    .top-battery .metric-label { margin:0; }
    .top-battery strong { color:var(--vca-values); font-size:22px; font-weight:500; font-variant-numeric:tabular-nums; }
    .top-battery .battery-track { grid-column:1/-1; margin:0; max-width:none; }
    .activity { position:absolute; bottom:13px; left:14px; right:115px; display:flex; gap:15px; flex-wrap:wrap; color:var(--vca-muted); font-size:12px; opacity:0; transition:opacity .35s; }
    .activity span { white-space:nowrap; }
    .activity b { color:var(--vca-values); font-weight:500; font-variant-numeric:tabular-nums; }
    [data-active=true] .stats { opacity:0; transform:translateX(-8px); pointer-events:none; }
    [data-active=true] .top-battery, [data-active=true] .activity { opacity:1; transform:none; }
    .dock,.mover { position:absolute; left:0; top:0; }
    [data-mode=unavailable] .mover, [data-mode=unknown] .mover, [data-mode=unavailable] .dock, [data-mode=unknown] .dock { opacity:.4; }
    footer { padding:12px 20px 16px; border-top:1px solid var(--vca-line); }
    .main-actions { display:flex; gap:8px; }
    .main-actions button { min-width:0; }
    .button-label { min-width:0; overflow-wrap:anywhere; }
    button { min-height:44px; flex:1; border:0; border-radius:12px; font:500 13px Roboto,Arial,sans-serif; background:var(--vca-floor); color:var(--vca-ink); padding:10px 9px; }
    button.primary { background:var(--vca-accent); color:var(--vca-button-ink); }
    button:disabled { opacity:1; background:var(--vca-floor); color:var(--vca-muted); cursor:default; }
    button.control-tile:disabled .button-icon { color:var(--vca-muted); }
    button:focus-visible { outline:2px solid var(--vca-accent); outline-offset:2px; }
    .vca-icon { display:block; width:22px; height:22px; flex:none; }
    .button-icon { display:inline-flex; flex:none; align-items:center; justify-content:center; color:inherit; }
    .button-icon ha-icon { --mdc-icon-size:22px; }
    .button-icon img { width:24px; height:24px; object-fit:contain; }
    .main-actions button, .more-controls { display:flex; align-items:center; justify-content:center; gap:7px; }
    .main-actions .vca-icon { width:19px; height:19px; }
    .more-controls { width:100%; margin-top:9px; background:transparent; color:var(--vca-muted); min-height:44px; font-weight:400; }
    .controls-panel { padding:12px 20px 18px; animation:vca-panel .24s ease-out; }
    .panel-heading { margin:0 0 14px; font-size:15px; font-weight:500; }
    .control-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
    .control-tile { display:flex; flex-direction:column; gap:8px; align-items:flex-start; justify-content:center; padding:14px; min-height:83px; text-align:left; }
    .control-tile .button-icon { color:var(--vca-accent); }
    .control-tile .button-label { overflow-wrap:anywhere; line-height:1.4; }
    .fan-field { display:grid; grid-template-columns:auto 1fr; gap:9px 11px; align-items:center; margin-top:16px; }
    .fan-field .button-icon { color:var(--vca-accent); }
    .fan-field label { color:var(--vca-muted); font-size:12px; }
    .fan-select { grid-column:1/-1; min-height:44px; padding:10px 12px; border:1px solid var(--vca-line); border-radius:10px; color:var(--vca-ink); background:var(--vca-floor); font:400 16px Roboto,Arial,sans-serif; width:100%; }
    .custom-heading { margin:20px 0 12px; color:var(--vca-muted); font-size:12px; font-weight:400; }
    .panel-message { margin:14px 0 0; color:var(--vca-muted); font-size:12px; line-height:1.5; }
    .appearance { margin-top:20px; border-top:1px solid var(--vca-line); }
    .appearance summary { min-height:44px; padding:14px 0 10px; font-size:14px; font-weight:500; color:var(--vca-ink); }
    .appearance-options { padding:5px 0 0; }
    .appearance-options > label { display:block; font-size:12px; color:var(--vca-muted); margin-bottom:8px; }
    .appearance-theme { display:block; width:100%; min-height:44px; padding:10px 12px; border:1px solid var(--vca-line); border-radius:10px; background:var(--vca-floor); color:var(--vca-ink); font:400 16px Roboto,Arial,sans-serif; }
    .appearance-colors { display:grid; gap:9px; margin:14px 0; }
    .appearance-colors label { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:44px; font-size:13px; line-height:1.4; color:var(--vca-ink); }
    .appearance-color { flex:none; width:54px; height:44px; padding:4px; background:var(--vca-floor); border:1px solid var(--vca-line); border-radius:9px; }
    .appearance-reset { width:100%; font-weight:400; display:flex; align-items:center; justify-content:center; gap:7px; }
    .appearance-note, .appearance-adjusted { color:var(--vca-muted); margin:11px 0 0; font-size:12px; line-height:1.5; }
    .service-message { padding:0 22px 13px; color:var(--vca-error); font-size:12px; overflow-wrap:anywhere; }
    [hidden] { display:none !important; }
    @keyframes vca-panel { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
    @container (max-width:330px) { header { padding:18px 16px 9px; } .stats { right:120px; left:8px; } .activity { left:8px; gap:7px; right:108px; } .metric-label { font-size:11px; } footer { padding:11px 14px 14px; } .controls-panel { padding:12px 14px 16px; } .control-tile { padding:12px; } }
    @media (prefers-reduced-motion:reduce) { .controls-panel { animation:none; } .stats,.top-battery,.activity,.battery-fill,.debris { transition:none; } }
  `;

/* All parts rotate around the same vertical axis. Cloth touches height 0. */
const FloorRobotModel=(() => {
  "use strict";
  const TAU=Math.PI*2,pitch=20*Math.PI/180,SIN=Math.sin(pitch),COS=Math.cos(pitch);
  const mix=(rgb,light)=>`rgb(${rgb.map(c=>Math.round(Math.max(0,Math.min(255,c*light)))).join(",")})`;
  function point(x,d,h,yaw) {
    const a=yaw*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    const right=x*c+d*s,front=d*c-x*s;
    return {x:80+right,y:91+front*SIN-h*COS,depth:front*COS+h*SIN};
  }
  class FloorRobot {
    constructor(canvas) {
      this.canvas=canvas;this.ctx=canvas.getContext?.("2d") || null;
      const resolution=Math.min(3,window.devicePixelRatio || 2);
      canvas.width=160*resolution;canvas.height=126*resolution;this.resolution=resolution;
    }
    draw(yaw=0,phase=0) {
      const c=this.ctx;if(!c)return;
      c.setTransform(this.resolution,0,0,this.resolution,0,0);c.clearRect(0,0,160,126);
      const project=(x,d,h)=>point(x,d,h,yaw);
      const polygon=(points,fill,stroke=null,width=.5)=>{
        c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();
        c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
      };
      const ring=(x,d,h,r,n=96)=>Array.from({length:n},(_,i)=>project(x+Math.sin(i*TAU/n)*r,d+Math.cos(i*TAU/n)*r,h));
      const cylinder=(x,d,bottom,top,r,color,material=null)=>{
        const n=96;
        for(let i=0;i<n;i++) {
          const a=i*TAU/n,b=(i+1)*TAU/n,m=(a+b)/2,world=m+yaw*Math.PI/180;
          if(Math.cos(world)<-.025)continue;
          const light=.84+.15*Math.cos(world)+.1*(-Math.sin(world));
          const fill=mix(material?material(m):color,light);
          polygon([project(x+Math.sin(a)*r,d+Math.cos(a)*r,bottom),project(x+Math.sin(b)*r,d+Math.cos(b)*r,bottom),project(x+Math.sin(b)*r,d+Math.cos(b)*r,top),project(x+Math.sin(a)*r,d+Math.cos(a)*r,top)],fill,fill,.85);
        }
      };
      const disk=(x,d,h,r,color)=>polygon(ring(x,d,h,r),color);
      const surfaceLine=(points,color,width)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.lineCap="round";c.stroke();};
      c.save();c.translate(82,92);c.scale(1,.32);
      const shadow=c.createRadialGradient(0,0,26,0,0,65);shadow.addColorStop(0,"#14252c65");shadow.addColorStop(.68,"#14252c35");shadow.addColorStop(1,"#14252c00");
      c.fillStyle=shadow;c.beginPath();c.arc(0,0,65,0,TAU);c.fill();c.restore();
      // Thin rear pads, spinning in the floor plane, not vertical supporting feet.
      for(const [x,direction] of [[-22,1],[22,-1]]) {
        cylinder(x,-26,0,1.5,20,[91,123,120]);disk(x,-26,1.5,20,"#b6ccc6");
        for(let i=0;i<18;i++) {
          const a=i*TAU/18+phase*direction*3.5;
          surfaceLine([project(x+Math.sin(a)*7,-26+Math.cos(a)*7,1.6),project(x+Math.sin(a)*19,-26+Math.cos(a)*19,1.6)],"#72958b",.7);
        }
      }
      for(let i=0;i<3;i++) {
        const a=phase*5+i*TAU/3;
        for(let strand=-1;strand<=1;strand++)surfaceLine([project(38,19,.9),project(38+Math.cos(a)*24+strand,19+Math.sin(a)*24,0)],"#6e818780",.7);
      }
      cylinder(0,0,2.5,7,48,[44,55,61]);cylinder(0,0,5,27,52,[226,234,238]);
      cylinder(0,0,11,22,52.25,[36,49,58],angle=>Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<1.72?[33,45,55]:[200,215,221]);
      cylinder(0,0,6,9,51.5,[188,204,213]);
      const cap=c.createLinearGradient(30,50,126,95);cap.addColorStop(0,"#ffffff");cap.addColorStop(.42,"#f6fafc");cap.addColorStop(1,"#c9d8df");
      disk(0,0,27.1,52,cap);polygon(ring(0,0,27.25,48.5),"#ffffff10","#adc0cb99",.65);
      surfaceLine([-33,-22,0,22,33].map(x=>project(x,-9,27.4)),"#bacbd46b",.6);
      for(const x of [-5,5]){disk(x,23,27.7,3,"#a7beca");disk(x,23,27.9,1.25,"#78d8c4");}
      const patch=(angle,half,low,high,fill)=>{
        const middle=angle+yaw*Math.PI/180;if(Math.cos(middle)<=.035)return;
        const points=[];
        for(let i=0;i<=8;i++){const a=angle-half+2*half*i/8;points.push(project(Math.sin(a)*52.65,Math.cos(a)*52.65,low));}
        for(let i=8;i>=0;i--){const a=angle-half+2*half*i/8;points.push(project(Math.sin(a)*52.65,Math.cos(a)*52.65,high));}
        polygon(points,fill);
      };
      patch(0,.195,12.5,20.5,"#617b8d");patch(0,.177,13.3,19.7,"#0d1c28");patch(-.055,.055,14.2,18.8,"#31526a");patch(-.068,.018,17.1,18.2,"#a9cedb");patch(.58,.066,14,18,"#112331");
      for(let i=-4;i<=4;i++)patch(Math.PI+i*.07,.012,12,18,"#566d798c");
      patch(Math.PI-.55,.06,8,11,"#9e9071");patch(Math.PI+.55,.06,8,11,"#9e9071");
      const lidar=project(0,-7,27.5);
      c.save();c.translate(lidar.x+1,lidar.y+1);c.scale(1,.4);c.fillStyle="#40566825";c.beginPath();c.ellipse(0,0,15,15,0,0,TAU);c.fill();c.restore();
      cylinder(0,-7,27.5,36,12,[222,233,238]);cylinder(0,-7,28.5,31,12.1,[42,63,77]);
      const lidarTop=c.createLinearGradient(lidar.x-10,lidar.y-10,lidar.x+12,lidar.y);lidarTop.addColorStop(0,"#fff");lidarTop.addColorStop(1,"#c7d8e1");
      disk(0,-7,36,12,lidarTop);polygon(ring(0,-7,36.1,10.2),"#ffffff10","#a5bfce70",.5);
    }
  }
  return {FloorRobot,point,mopBottom:0,mopThickness:1.5};
})();

/* Image choices are independent per surface and scoped to this card/browser. */
const Scenery=(() => {
  "use strict";
  const SURFACES=["floor","wall"];
  const TYPES=["image/jpeg","image/png","image/webp"];
  const isImage=src=>typeof src === "string" && src.length<=1500000 && /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(src);
  const CSS=`
    .front-scene-image { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center; pointer-events:none; }
    .front-wall::after { z-index:1; }
    .front-floor[data-custom-image=true] .front-grain { display:none; }
    .front-floor[data-custom-image=true] .front-light { opacity:.15; }
    [data-scene-image=true] .stats { right:calc(50% + 12px); padding:8px; border-radius:12px; background:var(--vca-bg); }
    [data-scene-image=true] .top-battery { padding:8px 10px; border-radius:12px; background:var(--vca-bg); }
    [data-scene-image=true] .activity { padding:7px 10px; border-radius:10px; background:var(--vca-bg); }
    [data-scene-image=true][data-active=true] .stats { visibility:hidden; }
    [data-scene-image=true][data-active=false] .top-battery,[data-scene-image=true][data-active=false] .activity { visibility:hidden; }
    [data-scene-image=true] .debris { filter:drop-shadow(0 1px 1px #0009) drop-shadow(0 -1px 1px #fff7); }
    .scene-images { margin-top:20px; padding-top:16px; border-top:1px solid var(--vca-line); }
    .scene-images h4 { margin:0 0 13px; font-size:14px; font-weight:500; color:var(--vca-ink); }
    .scene-image-row { display:grid; grid-template-columns:58px minmax(0,1fr); gap:12px; align-items:start; margin-top:17px; }
    .scene-image-thumb { width:58px; height:58px; position:relative; border-radius:9px; overflow:hidden; background:linear-gradient(135deg,var(--vca-floor),var(--vca-line)); }
    .scene-image-thumb img { width:100%; height:100%; object-fit:cover; }
    .scene-image-label { display:block; color:var(--vca-ink); font-size:13px; margin:0 0 5px; }
    .scene-image-name { display:block; margin:0; font-size:12px; color:var(--vca-muted); overflow-wrap:anywhere; }
    .scene-image-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:9px; }
    .scene-file-control { position:relative; display:inline-flex; align-items:center; justify-content:center; min-height:44px; padding:0 12px; box-sizing:border-box; border-radius:10px; color:var(--vca-ink); background:var(--vca-floor); font-size:13px; overflow:hidden; }
    .scene-file-control input { position:absolute; inset:0; width:100%; height:100%; opacity:0; }
    .scene-file-control:focus-within { outline:2px solid var(--vca-accent); outline-offset:2px; }
    .scene-image-remove { flex:none; min-height:44px; padding:9px 12px; font-weight:400; background:transparent; color:var(--vca-muted); }
    .scene-image-note,.scene-image-status { margin:12px 0 0; font-size:12px; line-height:1.5; color:var(--vca-muted); }
    .scene-image-status[role=alert] { color:var(--vca-error); }
  `;
  class Scenery {
    constructor(card) {this.card=card;this.images={floor:null,wall:null};this.tokens={floor:0,wall:0};this.storageKey=null;}
    attach() {
      const key=this.card._appearanceStorageKey+":scenery:v1";
      if(key!==this.storageKey) {
        this.storageKey=key;this.images={floor:null,wall:null};
        try {
          const stored=JSON.parse(window.localStorage?.getItem(key) || "null");
          if(stored?.version===1)for(const surface of SURFACES) {
            const saved=stored.images?.[surface];
            if(saved && isImage(saved.src))this.images[surface]={src:saved.src,name:String(saved.name || "Sua imagem").slice(0,200)};
          }
        } catch {}
      }
      const style=document.createElement("style");style.textContent=CSS;this.card.shadowRoot.append(style);
      const panel=document.createElement("section");panel.setAttribute("class","scene-images");panel.setAttribute("aria-label","Imagens do cenário");
      panel.innerHTML='<h4>Cenário</h4>'+SURFACES.map(surface=>{
        const label=surface === "floor" ? "Imagem do chão" : "Imagem da parede";
        return `<div class="scene-image-row"><div class="scene-image-thumb" aria-hidden="true"><img data-scene-thumb="${surface}" alt="" hidden></div><div><label class="scene-image-label" for="scene-file-${surface}">${label}</label><span class="scene-image-name" data-scene-name="${surface}">Padrão</span><div class="scene-image-actions"><label class="scene-file-control cursor-interaction"><span>Escolher imagem</span><input class="cursor-interaction" type="file" id="scene-file-${surface}" data-scene-file="${surface}" accept="image/jpeg,image/png,image/webp" aria-label="${label}"></label><button type="button" class="scene-image-remove cursor-interaction" data-scene-remove="${surface}" aria-label="Restaurar ${surface === "floor" ? "chão" : "parede"} padrão" hidden>Restaurar</button></div></div></div>`;
      }).join("")+'<p class="scene-image-note">JPG, PNG ou WebP · até 12 MB. Suas imagens ficam salvas neste dispositivo.</p><p class="scene-image-status" role="status" aria-live="polite" hidden></p>';
      this.panel=panel;this.card.shadowRoot.querySelector(".appearance-options").append(panel);
      for(const surface of SURFACES) {
        this.tokens[surface]++;
        const layer=this.card.shadowRoot.querySelector(surface === "floor"?".front-floor":".front-wall");
        const image=document.createElement("img");image.setAttribute("class","front-scene-image");image.setAttribute("alt","");image.setAttribute("data-scene-image",surface);image.hidden=true;layer.append(image);
        const input=panel.querySelector(`[data-scene-file="${surface}"]`);
        input.addEventListener("click",()=>this.card._playSelectionSound());
        input.addEventListener("change",()=>{const file=input.files?.[0];if(file)this.choose(surface,file);input.value="";});
        panel.querySelector(`[data-scene-remove="${surface}"]`).addEventListener("click",()=>{this.card._playSelectionSound();this.tokens[surface]++;this.images[surface]=null;this.apply();this.save();});
      }
      this.card.shadowRoot.querySelector(".appearance-reset").addEventListener("click",()=>{
        for(const surface of SURFACES){this.tokens[surface]++;this.images[surface]=null;}this.apply();this.save();
      });
      this.apply();
    }
    message(text,error=false) {
      const status=this.panel.querySelector(".scene-image-status");status.textContent=text;status.hidden=!text;status.setAttribute("role",error?"alert":"status");
    }
    apply() {
      this.card._card.dataset.sceneImage=String(SURFACES.some(surface=>!!this.images[surface]));
      for(const surface of SURFACES) {
        const value=this.images[surface];
        const image=this.card.shadowRoot.querySelector(`[data-scene-image="${surface}"]`);
        const thumbnail=this.panel.querySelector(`[data-scene-thumb="${surface}"]`);
        for(const element of [image,thumbnail]) {
          element.hidden=!value;if(value)element.setAttribute("src",value.src);else element.removeAttribute("src");
        }
        this.card.shadowRoot.querySelector(surface === "floor"?".front-floor":".front-wall").dataset.customImage=String(!!value);
        this.panel.querySelector(`[data-scene-name="${surface}"]`).textContent=value?.name || "Padrão";
        this.panel.querySelector(`[data-scene-remove="${surface}"]`).hidden=!value;
      }
    }
    save() {
      try {
        if(!window.localStorage)throw new Error("Storage unavailable");
        window.localStorage.setItem(this.storageKey,JSON.stringify({version:1,images:this.images}));
        this.message("Cenário salvo neste dispositivo.");
      } catch {this.message("Cenário aplicado. Este navegador não permitiu salvar as imagens para a próxima visita.",true);}
    }
    async choose(surface,file) {
      if(!SURFACES.includes(surface))return;
      const token=++this.tokens[surface],key=this.storageKey;
      this.message("Preparando imagem…");
      try {
        if(file.size>12*1024*1024)throw new Error("Escolha uma imagem de até 12 MB.");
        if(file.type?!TYPES.includes(file.type):!(/\.(jpe?g|png|webp)$/i.test(file.name)))throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
        const source=await new Promise((resolve,reject)=>{
          const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error("Não foi possível ler esse arquivo."));reader.readAsDataURL(file);
        });
        const image=await new Promise((resolve,reject)=>{
          const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error("Não foi possível abrir essa imagem. Escolha outro arquivo."));image.src=source;
        });
        if(!image.naturalWidth || !image.naturalHeight || image.naturalWidth*image.naturalHeight>48000000)throw new Error("Escolha uma imagem com até 48 megapixels.");
        const canvas=document.createElement("canvas"),scale=Math.min(1,1024/Math.max(image.naturalWidth,image.naturalHeight));
        canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
        canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
        const src=canvas.toDataURL("image/webp",.82);
        if(!isImage(src))throw new Error("Essa imagem ficou grande demais. Escolha um arquivo menor.");
        if(token!==this.tokens[surface] || key!==this.storageKey || !this.card.isConnected)return;
        this.images[surface]={src,name:String(file.name || "Sua imagem").slice(0,200)};
        this.apply();this.save();
      } catch(error) {
        if(token===this.tokens[surface] && key===this.storageKey)this.message(error.message || "Não foi possível usar essa imagem.",true);
      }
    }
  }
  return Scenery;
})();

  const DOCK={x:.84,z:.89,yaw:0};
  const ease=t=>t*t*t*(t*(t*6-15)+10);
  const lerp=(a,b,t)=>a+(b-a)*t;
  const metric=(a,b)=>Math.hypot(a.x-b.x,(a.z-b.z)*.72);
  const CORNERS=[{x:.84,z:.70},{x:.16,z:.70},{x:.16,z:.24},{x:.84,z:.24}];
  const angleDelta=(from,to)=>(((to-from+180)%360)+360)%360-180;
  // Integrate a smooth velocity ramp, cruise, then brake before every maneuver.
  function travelProgress(t) {
    const ramp=.14;
    if(t<ramp){const u=t/ramp;return ramp*(u*u*u-.5*u*u*u*u)/(1-ramp);}
    if(t>1-ramp)return 1-travelProgress(1-t);
    return (t-ramp/2)/(1-ramp);
  }
  const FRONT_CSS=`
    .scene { height:310px; margin:0 6px; border-radius:18px; isolation:isolate; }
    .front-wall { position:absolute; inset:0 0 auto; height:87px; background:linear-gradient(110deg,var(--vca-bg),var(--vca-floor)); }
    .front-wall::after { content:""; position:absolute; left:0; right:0; bottom:0; height:8px; background:linear-gradient(var(--vca-line),var(--vca-bg) 30%,var(--vca-floor)); box-shadow:0 4px 7px var(--vca-shadow); }
    .front-floor { position:absolute; inset:86px 0 0; overflow:hidden; background:linear-gradient(180deg,var(--vca-floor),var(--vca-bg)); }
    .front-grain { position:absolute; left:-35%; right:-35%; top:-10px; height:490px; transform:perspective(270px) rotateX(58deg); transform-origin:50% 0; background:repeating-linear-gradient(90deg,transparent 0 85px,var(--vca-line) 85px 86px,transparent 86px 172px),repeating-linear-gradient(0deg,transparent 0 4px,var(--vca-line) 4px 4.4px); opacity:.22; }
    .front-light { position:absolute; right:4%; top:2px; width:45%; height:150px; transform:skewX(-26deg) skewY(-7deg); background:linear-gradient(120deg,#ffffff18,transparent); filter:blur(7px); pointer-events:none; }
    [data-active=false] .front-light { opacity:0; }
    .stats { top:24px; left:14px; right:calc(50% + 3px); gap:17px; z-index:4; }
    .stats .metric-label { font-size:12px; }
    .stats .metric-value { font-size:22px; }
    .stats .metric:not(:first-child) .metric-value { font-size:17px; }
    .top-battery { top:9px; left:14px; right:14px; z-index:4; }
    .top-battery strong { font-size:21px; }
    .activity { bottom:13px; left:14px; right:14px; z-index:4; }
    .debris-layer { z-index:1; }
    .debris { transform-origin:0 0; filter:drop-shadow(0 1px 1px #0002); }
    .debris[data-revealed=false] { opacity:0; }
    .mover { width:160px; height:126px; transform-origin:0 0; will-change:transform; z-index:3; }
    .front-canvas { display:block; width:160px; height:126px; }
    .dock { left:0; top:0; right:auto; bottom:auto; width:106px; height:125px; transform-origin:0 0; z-index:2; }
    .front-dock-shadow { position:absolute; left:-14px; right:-18px; bottom:-4px; height:30px; border-radius:50%; background:#0000002b; filter:blur(6px); }
    .front-dock-body { position:absolute; left:8px; right:8px; top:5px; height:105px; border-radius:13px 13px 8px 8px; background:linear-gradient(100deg,#aebfc8,#fafcfd 20%,#edf3f6 77%,#a6bac6); box-shadow:inset 2px 0 0 #fff9,inset -2px 0 1px #66809050,0 2px 2px #0002; }
    .front-dock-top { position:absolute; left:9px; right:9px; top:0; height:12px; border-radius:50%; background:linear-gradient(160deg,#fff,#d9e5eb); border:1px solid #c6d6df; }
    .front-dock-face { position:absolute; left:17px; right:17px; top:26px; height:60px; border-radius:7px; background:linear-gradient(120deg,#526774,#283c49 40%,#112533); box-shadow:inset 0 1px 1px #a4b7c64d; }
    .front-dock-face::before { content:""; position:absolute; top:15px; left:29px; width:9px; height:3px; border-radius:4px; background:#6bdbc5; box-shadow:0 0 6px #49c5aa6b; }
    .front-dock-slot { position:absolute; left:25px; right:25px; top:91px; height:10px; border-radius:8px 8px 0 0; background:linear-gradient(#132c3b,#617984); }
    .front-dock-tray { position:absolute; left:0; right:0; top:105px; height:20px; border-radius:10% 10% 45% 45%; background:linear-gradient(#cbdbe3,#9eb6c5); border-bottom:2px solid #627f9166; box-shadow:0 2px 2px #0002; }
  `;

  class VaccumCardAnimations extends HTMLElement {
    constructor() {
      super(); this.attachShadow({mode:"open"}); this._mode = null; this._motion = null; this._pending = false; this._controlsOpen = false;
      this._front={pose:{...DOCK},task:null,dust:[],lastMode:null,frame:null,lastTime:null,playTime:0,brushTime:0};
      this._scenery=new Scenery(this);
      this._media = window.matchMedia("(prefers-reduced-motion: reduce)");
      this._colorMedia = window.matchMedia("(prefers-color-scheme: dark)");
      this._colorMediaChanged = () => { if(this.isConnected) this._applyAppearance(true); };
      this._mediaChanged = () => { if(this.isConnected) this._animate(this._mode,this._mode); };
      this._visibility = () => {
        if(document.hidden || this._controlsOpen) { this._motion?.pause(); this._frontHalt(); }
        else { this._motion?.play(); }
      };
      this.shadowRoot.addEventListener("keydown",event=>{if(event.key === "Escape" && this._controlsOpen) this._showControls(false);});
    }
    static getConfigElement() { return document.createElement(TYPE + "-editor"); }
    static getStubConfig(hass) { return {entity:Object.keys(hass?.states || {}).find(id => id.startsWith("vacuum.")) || "vacuum.seu_aspirador", name:CARD_NAME}; }
    setConfig(config) {
      if (!config || typeof config.entity !== "string" || !config.entity.startsWith("vacuum.")) throw new Error(`Escolha uma entidade vacuum para o ${CARD_NAME}.`);
      if(config.custom_buttons !== undefined && (!Array.isArray(config.custom_buttons) || config.custom_buttons.length>12)) throw new Error("Use uma lista de até 12 botões personalizados.");
      if(config.buttons !== undefined && (!config.buttons || typeof config.buttons !== "object" || Array.isArray(config.buttons))) throw new Error("Configure buttons como um objeto de botões.");
      if(this._config && this._config.entity !== config.entity) {
        this._motion?.cancel();this._motion=null;
        this._front={pose:{...DOCK},task:null,dust:[],lastMode:null,frame:null,lastTime:null,playTime:0,brushTime:0};
      }
      this._config = {name:CARD_NAME, show_controls:true, animation:true, dirt:true, sound:true, sound_volume:0.18, theme:"auto", cycle_seconds:28, mop_label:"Mops · tempo restante", custom_buttons:[], buttons:{}, icons:{}, ...config};
      this._config.sound_volume=clamp(number(config.sound_volume) ?? 0.18,0,1);
      this._config.custom_buttons=this._config.custom_buttons.filter(b=>b && typeof b === "object").map(b=>({...b}));
      this._controlsOpen=false;
      this._config.cycle_seconds = clamp(number(config.cycle_seconds) || 28,24,90);
      this._loadAppearance();
      this._render(); this._mode = null; this._update();
    }
    set hass(value) { this._hass = value; if(this._config) this._update(); }
    get hass() { return this._hass; }
    getCardSize() { return Math.ceil((this._card?.offsetHeight || (this._controlsOpen ? (this.shadowRoot.querySelector(".appearance")?.open ? 990 : 690) : this._config?.show_controls === false ? 382 : 488))/50); }
    getGridOptions() { return {columns:12,min_columns:12}; }
    connectedCallback() {
      this._media.addEventListener?.("change", this._mediaChanged);
      this._colorMedia.addEventListener?.("change",this._colorMediaChanged);
      document.addEventListener("visibilitychange",this._visibility);
      if(typeof ResizeObserver !== "undefined") {
        this._resize = new ResizeObserver(entries => {
          const width = Math.round(entries[0].contentRect.width);
          if(width && width !== this._width) { this._width = width; if(this._mode) this._animate(this._mode,this._mode); }
        });
        if(this._scene) this._resize.observe(this._scene);
      }
      if(this._config) { this._applyAppearance(true); this._update(true); }
    }
    disconnectedCallback() {
      this._frontHalt();
      this._motion?.cancel(); this._motion = null; this._resize?.disconnect();
      this._media.removeEventListener?.("change",this._mediaChanged);
      this._colorMedia.removeEventListener?.("change",this._colorMediaChanged);
      document.removeEventListener("visibilitychange",this._visibility);
      const audio=this._audio; this._audio=null;
      if(audio && audio.state !== "closed") {
        try { Promise.resolve(audio.close()).catch(()=>{}); } catch {}
      }
    }
    _render() {
      const oldDust=this._front.dust.map(({element,...piece})=>piece);
      this._frontHalt();
      this._motion?.cancel(); this._resize?.disconnect();
      this.shadowRoot.innerHTML = `<style>${CSS}${FRONT_CSS}</style>
        <ha-card data-mode="unknown" data-active="false" data-view="front">
          <header><div class="heading"><h2 class="name"></h2><div class="state" role="status" aria-live="polite"><span class="dot" aria-hidden="true"></span><span class="state-text">Sem informação</span></div></div></header>
          <div class="scene" role="group" aria-label="Aspirador na base à direita">
            <div class="front-wall" aria-hidden="true"></div><div class="front-floor" aria-hidden="true"><div class="front-grain"></div><div class="front-light"></div></div>
            <div class="debris-layer" aria-hidden="true" hidden></div>
            <div class="stats">
              <div class="metric"><div class="metric-label">Bateria</div><div class="metric-value battery-value">—</div><div class="battery-track" role="progressbar" aria-label="Bateria" aria-valuemin="0" aria-valuemax="100"><div class="battery-fill"></div></div></div>
              <div class="metric"><div class="metric-label">Tempo de limpeza</div><div class="metric-value clean-value">—</div></div>
              <div class="metric"><div class="metric-label mop-label"></div><div class="metric-value mop-value">—</div></div>
            </div>
            <div class="top-battery" aria-hidden="true"><div class="metric-label">Bateria</div><strong class="battery-value">—</strong><div class="battery-track" role="progressbar" aria-label="Bateria" aria-valuemin="0" aria-valuemax="100"><div class="battery-fill"></div></div></div>
            <div class="dock" aria-hidden="true"><div class="front-dock-shadow"></div><div class="front-dock-body"></div><div class="front-dock-top"></div><div class="front-dock-face"></div><div class="front-dock-slot"></div><div class="front-dock-tray"></div></div>
            <div class="mover" aria-hidden="true"><canvas class="front-canvas" aria-hidden="true"></canvas></div>
            <div class="activity" aria-hidden="true"><span>Limpeza <b class="clean-value">—</b></span><span>Mops <b class="mop-value">—</b></span></div>
          </div>
          <section class="controls-panel" id="vca-controls" aria-label="Controles do aspirador" hidden>
            <h3 class="panel-heading">Controles do aspirador</h3>
            <div class="control-grid">
              <button type="button" class="control-tile cursor-interaction" data-action="primary"><span class="button-icon"></span><span class="button-label">Iniciar limpeza</span></button>
              <button type="button" class="control-tile cursor-interaction" data-action="return"><span class="button-icon"></span><span class="button-label">Voltar à base</span></button>
              <button type="button" class="control-tile cursor-interaction" data-action="stop"><span class="button-icon"></span><span class="button-label">Parar limpeza</span></button>
              <button type="button" class="control-tile cursor-interaction" data-action="spot"><span class="button-icon"></span><span class="button-label">Limpeza pontual</span></button>
              <button type="button" class="control-tile cursor-interaction" data-action="locate"><span class="button-icon"></span><span class="button-label">Encontrar robô</span></button>
            </div>
            <div class="fan-field"><span class="button-icon fan-icon"></span><label for="vca-fan">Potência de aspiração</label><select id="vca-fan" class="fan-select" aria-label="Potência de aspiração"></select></div>
            <h4 class="custom-heading">Seus atalhos</h4><div class="control-grid custom-grid"></div>
            <p class="panel-message" hidden></p>
            <details class="appearance">
              <summary class="cursor-interaction">Aparência</summary>
              <div class="appearance-options">
                <label for="vca-theme">Tema do card</label><select id="vca-theme" class="appearance-theme" aria-label="Tema do card"></select>
                <div class="appearance-colors">
                  <label for="vca-text-color"><span>Textos principais</span><input id="vca-text-color" class="appearance-color cursor-interaction" type="color" data-appearance="text_color"></label>
                  <label for="vca-secondary-color"><span>Rótulos e estado</span><input id="vca-secondary-color" class="appearance-color cursor-interaction" type="color" data-appearance="secondary_text_color"></label>
                  <label for="vca-value-color"><span>Bateria e tempos</span><input id="vca-value-color" class="appearance-color cursor-interaction" type="color" data-appearance="value_color"></label>
                </div>
                <button type="button" class="appearance-reset cursor-interaction"><span class="button-icon"></span><span class="button-label">Restaurar aparência</span></button>
                <p class="appearance-note" role="status" aria-live="polite">Suas escolhas ficam salvas neste dispositivo.</p>
                <p class="appearance-adjusted" role="status" aria-live="polite" hidden></p>
              </div>
            </details>
          </section>
          <footer><div class="main-actions"><button type="button" class="primary cursor-interaction" data-action="primary"><span class="button-icon"></span><span class="button-label">Iniciar limpeza</span></button><button type="button" class="cursor-interaction" data-action="return"><span class="button-icon"></span><span class="button-label">Voltar à base</span></button></div><button type="button" class="more-controls cursor-interaction" aria-expanded="false" aria-controls="vca-controls"><span class="button-icon"></span><span class="button-label">Mais controles</span></button></footer>
          <div class="service-message" role="alert" hidden></div>
        </ha-card>`;
      this._card = this.shadowRoot.querySelector("ha-card"); this._scene = this.shadowRoot.querySelector(".scene"); this._robot = this.shadowRoot.querySelector(".mover");
      this._debrisLayer=this.shadowRoot.querySelector(".debris-layer");
      this._colorProbe=document.createElement("span"); this._colorProbe.hidden=true; this._colorProbe.setAttribute("aria-hidden","true"); this._card.append(this._colorProbe);
      this._probeThemeKeys=[]; this._appearanceSignature=null;
      this.shadowRoot.querySelector(".name").textContent = this._config.name;
      this.shadowRoot.querySelector(".mop-label").textContent = this._config.mop_label;
      this.shadowRoot.querySelector("footer").hidden = this._config.show_controls === false;
      this.shadowRoot.querySelectorAll("[data-action]").forEach(btn => btn.addEventListener("click", () => {
        if(btn.disabled) return;
        this._playSelectionSound(); this._act(btn.dataset.action);
      }));
      this.shadowRoot.querySelector(".more-controls").addEventListener("click",()=>{
        this._playSelectionSound(); this._showControls(!this._controlsOpen);
      });
      this.shadowRoot.querySelector(".fan-select").addEventListener("change",event=>{
        if(event.target.disabled) return;
        this._playSelectionSound(); this._setFan(event.target.value);
      });
      for(const key of ["return","stop","spot","locate"]) for(const btn of this.shadowRoot.querySelectorAll(`[data-action="${key}"]`)) this._setButtonContent(btn,key);
      const fan=buttonDefinition(this._config,"fan");
      this.shadowRoot.querySelector(".fan-field label").textContent=fan.name;
      this.shadowRoot.querySelector(".fan-select").setAttribute("aria-label",fan.name);
      this._renderIcon(this.shadowRoot.querySelector(".fan-icon"),fan.icon,fan.icon_image);
      this._setButtonContent(this.shadowRoot.querySelector(".more-controls"),"more");
      this._setButtonContent(this.shadowRoot.querySelector(".appearance-reset"),"appearance_reset");
      this._renderCustomButtons();
      this.shadowRoot.querySelector(".appearance-theme").addEventListener("change",event=>{
        this._playSelectionSound(); this._changeAppearance("theme",event.target.value,true);
      });
      this.shadowRoot.querySelectorAll(".appearance-color").forEach(input=>{
        input.addEventListener("input",()=>this._changeAppearance(input.dataset.appearance,input.value,false,input));
        input.addEventListener("change",()=>{this._playSelectionSound();this._changeAppearance(input.dataset.appearance,input.value,true);});
      });
      this.shadowRoot.querySelector(".appearance-reset").addEventListener("click",()=>{
        this._playSelectionSound();this._appearance={...this._appearanceDefaults};this._appearanceSaveFailed=false;
        try { window.localStorage?.removeItem(this._appearanceStorageKey); } catch { this._appearanceSaveFailed=true; }
        this._applyAppearance(true);
      });
      this._applyAppearance(true);
      this._frontModel=new FloorRobotModel.FloorRobot(this._robot.querySelector("canvas"));
      this._frontDock=this._scene.querySelector(".dock");
      this._front.layoutDirty=true;
      this._front.dust=[];for(const piece of oldDust)this._addFrontDust(piece);
      this._scenery.attach();this._drawFront();
      this._resize?.observe(this._scene);
    }
    _update(force = false) {
      if(!this._card || !this._hass) return;
      this._applyAppearance();
      const state = this._hass.states?.[this._config.entity];
      const raw = state?.state || "unavailable";
      const mode = LABELS[raw] ? raw : "unknown";
      const active = ["cleaning","paused","returning"].includes(mode);
      this._card.dataset.mode = mode; this._card.dataset.active = String(active);
      this._scene.setAttribute("aria-label",mode === "cleaning" ? "Aspirador percorrendo o card durante a limpeza. Movimento ilustrativo." : mode === "docked" ? "Aspirador na base à direita" : LABELS[mode]);
      this.shadowRoot.querySelector(".state-text").textContent = state ? LABELS[mode] : "Entidade não encontrada";
      this.shadowRoot.querySelector(".stats").setAttribute("aria-hidden",String(active));
      this.shadowRoot.querySelector(".top-battery").setAttribute("aria-hidden",String(!active));
      this.shadowRoot.querySelector(".activity").setAttribute("aria-hidden",String(!active));
      const battery = readMetric(this._hass,this._config,"battery",["battery_level","battery"]);
      const b = number(battery.value); const value = b === null ? null : clamp(b,0,100);
      this.shadowRoot.querySelectorAll(".battery-value").forEach(el => el.textContent = value === null ? "—" : `${Math.round(value)}%`);
      this.shadowRoot.querySelectorAll(".battery-fill").forEach(el => el.style.width = `${value ?? 0}%`);
      this.shadowRoot.querySelectorAll(".battery-track").forEach(el => {
        if(value === null) { el.removeAttribute("aria-valuenow"); el.setAttribute("aria-valuetext","Bateria sem informação"); }
        else { el.setAttribute("aria-valuenow",String(Math.round(value))); el.removeAttribute("aria-valuetext"); }
      });
      const clean = duration(readMetric(this._hass,this._config,"cleaning_time",["cleaning_time","clean_time"]));
      const mop = duration(readMetric(this._hass,this._config,"mop_time",["mop_time_left","mop_remaining"]));
      this.shadowRoot.querySelectorAll(".clean-value").forEach(el => el.textContent = clean);
      this.shadowRoot.querySelectorAll(".mop-value").forEach(el => el.textContent = mop);
      this._refreshButtons();
      if(mode !== this._mode || force) { const previous = this._mode; this._mode = mode; if(this.isConnected) this._animate(mode,previous); }
      this._scene.setAttribute("aria-label",this._mode === "cleaning" ? "Visão frontal do aspirador limpando o chão, com movimento em profundidade. Animação ilustrativa." : "Visão frontal do aspirador e da base, ao nível do chão.");
      if(this._mode === "idle" && (this._front.pose.z<.75 || Math.abs(this._front.pose.x-DOCK.x)>.16)) {
        this._card.dataset.active="true";
        this.shadowRoot.querySelector(".stats").setAttribute("aria-hidden","true");
        this.shadowRoot.querySelector(".top-battery").setAttribute("aria-hidden","false");
        this.shadowRoot.querySelector(".activity").setAttribute("aria-hidden","false");
      }
    }
    _loadAppearance() {
      this._appearanceDefaults=normalizeAppearance(this._config);
      this._appearanceBasis=JSON.stringify(this._appearanceDefaults);
      const identity=this._config.appearance_id || [window.location?.pathname || "",this._config.entity,this._config.name];
      this._appearanceStorageKey="vaccum-card-animations:appearance:v1:"+JSON.stringify(identity);
      this._appearance={...this._appearanceDefaults}; this._appearanceSaveFailed=false;
      try {
        const saved=JSON.parse(window.localStorage?.getItem(this._appearanceStorageKey) || "null");
        if(saved?.version === 1 && saved.basis === this._appearanceBasis && saved.settings && typeof saved.settings === "object") this._appearance=normalizeAppearance(saved.settings);
      } catch {}
    }
    _changeAppearance(key,value,persist,editingInput=null) {
      if(!["theme",...Object.keys(APPEARANCE_COLORS)].includes(key)) return;
      if(key !== "theme" && !normalizeHex(value)) return;
      this._appearance=normalizeAppearance({...this._appearance,[key]:value});
      if(persist) {
        try {
          if(!window.localStorage) throw new Error("Storage unavailable");
          window.localStorage.setItem(this._appearanceStorageKey,JSON.stringify({version:1,basis:this._appearanceBasis,settings:this._appearance}));
          this._appearanceSaveFailed=false;
        } catch { this._appearanceSaveFailed=true; }
      }
      this._applyAppearance(true,editingInput);
    }
    _resolveThemeColor(value,fallback,background) {
      if(typeof value !== "string" || !value.trim()) return fallback;
      let parsed=colorChannels(value);
      if(!parsed) {
        this._colorProbe.style.color="";
        this._colorProbe.style.color=value;
        if(!this._colorProbe.style.color) return fallback;
        parsed=colorChannels(getComputedStyle(this._colorProbe).color);
      }
      if(!parsed) return fallback;
      const base=colorChannels(background);
      return channelsHex(parsed.slice(0,3).map((channel,index)=>channel*parsed[3]+base[index]*(1-parsed[3])));
    }
    _applyAppearance(force=false,editingInput=null) {
      if(!this._card || !this._appearance) return;
      const theme=this._appearance.theme;
      const available=this._hass?.themes?.themes || {};
      const names=Object.keys(available).filter(name=>available[name] && typeof available[name] === "object" && !Array.isArray(available[name])).sort();
      const selected=theme.startsWith("ha:") ? available[theme.slice(3)] : null;
      let dark=theme === "dark" || (theme !== "light" && (typeof this._hass?.themes?.darkMode === "boolean" ? this._hass.themes.darkMode : this._colorMedia.matches));
      if(selected?.modes?.dark && !selected.modes.light) dark=true;
      if(selected?.modes?.light && !selected.modes.dark) dark=false;
      const named=Boolean(selected && typeof selected === "object" && !Array.isArray(selected));
      const {modes,...baseRules}=named ? selected : {};
      const rules=named ? {...baseRules,...modes?.[dark ? "dark" : "light"]} : {};
      const inherit=theme === "auto" || (theme.startsWith("ha:") && !named);
      const computed=getComputedStyle(this);
      const properties=["ha-card-background","card-background-color","primary-background-color","primary-text-color","secondary-text-color","primary-color","text-primary-color","error-color"];
      const inherited=Object.fromEntries(properties.map(name=>[name,inherit ? String(computed.getPropertyValue?.("--"+name) || "").trim() : ""]));
      const signature=JSON.stringify([this._appearance,rules,dark,names,inherited]);
      if(!force && signature === this._appearanceSignature) return;
      this._appearanceSignature=signature;
      this._card.style.colorScheme=dark ? "dark" : "light";
      for(const key of this._probeThemeKeys) this._colorProbe.style.removeProperty(key);
      this._probeThemeKeys=[];
      const base=PALETTES[dark ? "dark" : "light"];
      const defaults={"ha-card-background":base.bg,"card-background-color":base.bg,"primary-background-color":base.bg,"primary-text-color":base.ink,"secondary-text-color":base.muted,"primary-color":base.accent,"text-primary-color":base.buttonInk,"error-color":base.error};
      if(named) for(const [name,value] of Object.entries({...defaults,...rules})) {
        if(/^[a-z0-9_-]+$/i.test(name) && ["string","number"].includes(typeof value)) {
          const key="--"+name;this._colorProbe.style.setProperty(key,String(value));this._probeThemeKeys.push(key);
        }
      }
      const raw=name=>named ? rules[name] : inherited[name];
      const background=this._resolveThemeColor(raw("ha-card-background") || raw("card-background-color") || raw("primary-background-color"),base.bg,base.bg);
      const surfaceDark=luminance(background)<0.35;
      this._card.style.colorScheme=surfaceDark ? "dark" : "light";
      const floor=mixColor(background,surfaceDark ? "#ffffff" : "#000000",surfaceDark ? 0.045 : 0.035);
      const backgrounds=[background,floor];
      const palette={bg:background,floor,line:mixColor(background,surfaceDark ? "#ffffff" : "#000000",0.16),shadow:surfaceDark ? "#00000040" : "#213e4220"};
      const requested={
        ink:this._appearance.text_color || this._resolveThemeColor(raw("primary-text-color"),base.ink,background),
        muted:this._appearance.secondary_text_color || this._resolveThemeColor(raw("secondary-text-color"),base.muted,background),
        values:this._appearance.value_color || this._appearance.text_color || this._resolveThemeColor(raw("primary-text-color"),base.ink,background)
      };
      for(const key of ["ink","muted","values"]) palette[key]=readableColor(requested[key],backgrounds);
      palette.accent=readableColor(this._resolveThemeColor(raw("primary-color"),base.accent,background),backgrounds,3);
      palette.buttonInk=readableColor(this._resolveThemeColor(raw("text-primary-color"),base.buttonInk,palette.accent),[palette.accent]);
      palette.error=readableColor(this._resolveThemeColor(raw("error-color"),base.error,background),backgrounds);
      this._resolvedPalette=palette;
      for(const [key,value] of Object.entries(palette)) this._card.style.setProperty("--vca-"+(key === "buttonInk" ? "button-ink" : key),value);
      this._card.dataset.theme=theme;
      const select=this.shadowRoot.querySelector(".appearance-theme");
      const choices=[["auto","Automático · Home Assistant"],["light","Claro"],["dark","Escuro"],...names.map(name=>["ha:"+name,name])];
      if(!choices.some(([value])=>value === theme)) choices.push([theme,theme.slice(3)+" · indisponível"]);
      const optionsSignature=JSON.stringify(choices);
      if(select.dataset.options !== optionsSignature) {
        select.replaceChildren();select.dataset.options=optionsSignature;
        for(const [value,label] of choices) { const option=document.createElement("option");option.value=value;option.textContent=label;select.append(option); }
      }
      select.value=theme;
      for(const input of this.shadowRoot.querySelectorAll(".appearance-color")) if(input !== editingInput) input.value=palette[APPEARANCE_COLORS[input.dataset.appearance]];
      this.shadowRoot.querySelector(".appearance-note").textContent=this._appearanceSaveFailed ? "Escolhas aplicadas nesta sessão; este navegador não permitiu salvá-las." : "Suas escolhas ficam salvas neste dispositivo.";
      const adjusted=Object.entries(APPEARANCE_COLORS).some(([key,color])=>this._appearance[key] && requested[color] !== palette[color]);
      const message=this.shadowRoot.querySelector(".appearance-adjusted");
      message.hidden=!adjusted && !(theme.startsWith("ha:") && !named);
      message.textContent=theme.startsWith("ha:") && !named ? "Tema indisponível. O card está acompanhando a aparência atual do Home Assistant." : "Uma cor foi ajustada para manter os textos legíveis.";
    }
    _frontGeometry() {return {width:this._scene.clientWidth || this._width || 414,height:310};}
    _projectFront(p,g=this._frontGeometry()) {
      const depth=(.48-clamp(p.z,0,1))*400;
      const scale=800/(800-depth*Math.cos(20*Math.PI/180));
      return {x:g.width/2+(p.x-.5)*Math.max(130,g.width-160)*scale,y:210+depth*Math.sin(20*Math.PI/180)*scale,scale};
    }
    _drawFront() {
      if(!this._robot || !this._frontDock) return;
      const f=this._front,g=this._frontGeometry(),p=this._projectFront(f.pose,g);
      this._robot.style.transform=`translate3d(${p.x-80*p.scale}px,${p.y-91*p.scale}px,0) scale(${p.scale})`;
      this._frontModel?.draw(f.pose.yaw || 0,f.brushTime);
      if(f.layoutWidth !== g.width || f.layoutDirty) {
        const dock=this._projectFront({...DOCK,z:.94},g);
        this._frontDock.style.transform=`translate3d(${dock.x-53*dock.scale}px,${dock.y-120*dock.scale}px,0) scale(${dock.scale})`;
        for(const piece of f.dust) {
          const q=this._projectFront(piece,g);
          const size=q.scale*piece.size;
          piece.element.style.transform=`translate3d(${q.x}px,${q.y}px,0) scale(${size},${size*.52}) rotate(${piece.angle}deg) translate(-9px,-8px)`;
        }
        f.layoutWidth=g.width;f.layoutDirty=false;
      }
      this._debrisLayer.hidden=!f.dust.length;
    }
    _addFrontDust(piece) {
      const element=document.createElement("span");element.setAttribute("class","debris");element.innerHTML="<i></i>".repeat(piece.grains || 3);
      element.dataset.revealed=String((piece.age || 0)>=(piece.delay || 0));
      element.dataset.collected=String(Boolean(piece.collected));this._debrisLayer.append(element);
      this._front.dust.push({...piece,collected:Boolean(piece.collected),element});
      this._front.layoutDirty=true;
    }
    _seedFrontDust() {
      this._front.dust=[];this._debrisLayer.replaceChildren();
      const lengths=CORNERS.map((p,i)=>metric(p,CORNERS[(i+1)%4]));
      const perimeter=lengths.reduce((sum,length)=>sum+length,0);
      for(let n=0;n<12;n++) {
        let candidate;
        for(let attempt=0;attempt<60;attempt++) {
          let distance=this._frontRandom()*perimeter,segment=0;
          while(segment<3 && distance>lengths[segment]){distance-=lengths[segment];segment++;}
          const a=CORNERS[segment],b=CORNERS[(segment+1)%4],t=distance/lengths[segment];
          candidate={x:lerp(a.x,b.x,t),z:lerp(a.z,b.z,t)};
          if(a.z===b.z)candidate.z+=(this._frontRandom()-.5)*.14;
          else candidate.x+=(this._frontRandom()-.5)*.10;
          if(!this._front.dust.some(piece=>metric(piece,candidate)<.065))break;
        }
        this._addFrontDust({...candidate,size:.65+this._frontRandom()*.65,angle:this._frontRandom()*360,grains:2+Math.floor(this._frontRandom()*2),delay:this._frontRandom()*1.6,age:0});
      }
    }
    _frontRandom() {return Math.random();}
    _collectFrontDust(previous,pose) {
      const dx=pose.x-previous.x,dz=(pose.z-previous.z)*.72,length=dx*dx+dz*dz;
      for(const piece of this._front.dust) {
        if(piece.collected || piece.age<piece.delay) continue;
        const px=piece.x-previous.x,pz=(piece.z-previous.z)*.72;
        const t=length ? clamp((px*dx+pz*dz)/length,0,1) : 0;
        if(Math.hypot(px-dx*t,pz-dz*t)<.071) {piece.collected=true;piece.element.dataset.collected="true";}
      }
    }
    _appendTurn(segments,cursor,yaw) {
      const delta=angleDelta(cursor.yaw,yaw);
      if(Math.abs(delta)<.05)return;
      const to={...cursor,yaw:cursor.yaw+delta};
      segments.push({type:"turn",from:{...cursor},to,duration:.3+Math.abs(delta)/100});
      Object.assign(cursor,to);
    }
    _appendTravel(segments,cursor,to,duration,reverse=false) {
      if(metric(cursor,to)<.0001)return;
      const span=Math.max(130,this._frontGeometry().width-160);
      const heading=Math.atan2((to.x-cursor.x)*span,-(to.z-cursor.z)*400)*180/Math.PI+(reverse?180:0);
      this._appendTurn(segments,cursor,heading);
      const target={...to,yaw:cursor.yaw};
      segments.push({type:"move",from:{...cursor},to:target,duration,reverse});
      Object.assign(cursor,target);
    }
    _frontPlan(kind) {
      const f=this._front,segments=[],cursor={...f.pose};
      if(kind === "cleaning") {
        const seconds=Math.max(24,this._config.cycle_seconds)-4.8;
        for(const target of [CORNERS[1],CORNERS[2],CORNERS[3],CORNERS[0]]) {
          const length=metric(cursor,target);
          this._appendTravel(segments,cursor,target,seconds*length/(2*(.68+.46*.72)));
        }
      } else if(kind === "depart") {
        this._appendTravel(segments,cursor,CORNERS[0],Math.max(1.2,metric(cursor,CORNERS[0])*15));
        this._appendTurn(segments,cursor,-90);
      } else {
        const staging={x:DOCK.x,z:.73};
        if(cursor.z>.73 && Math.abs(cursor.x-DOCK.x)<.03) {
          this._appendTurn(segments,cursor,0);
        } else {
          this._appendTravel(segments,cursor,staging,Math.max(1.4,metric(cursor,staging)*7));
          this._appendTurn(segments,cursor,0);
        }
        // Back into the station while the front keeps facing the room.
        this._appendTravel(segments,cursor,DOCK,1.8,true);
      }
      f.task=segments.length?{kind,segments,index:0,segmentTime:0,time:0,distance:0}:null;
    }
    _animate(mode,previous) {
      if(!this._front || !this._robot || !this.isConnected) return;
      const f=this._front,old=f.lastMode || previous;
      const reduced=this._media.matches || this._config.animation === false || typeof window.requestAnimationFrame !== "function";
      this._card.dataset.motion=String(!reduced);
      if(reduced && mode === "docked") { f.pose={...DOCK};f.task=null; }
      if(mode === "cleaning") {
        if(!["cleaning","paused"].includes(old) || !f.task || !["depart","cleaning"].includes(f.task.kind)) this._frontPlan("depart");
        if(this._config.dirt !== false && !reduced && (!f.dust.length || !["cleaning","paused"].includes(old)))this._seedFrontDust();
      } else if(mode === "returning") {
        if(old !== "returning" || !f.task || f.task.kind !== "return") this._frontPlan("return");
      } else if(mode === "docked") {
        if(f.task?.kind === "return") { /* Finish the same approach if the state updates early. */ }
        else if(old && old !== "docked" && metric(f.pose,DOCK)>.001)this._frontPlan("dock");
        else {f.pose={...DOCK};f.task=null;}
      }
      if(!["cleaning","paused"].includes(mode) || this._config.dirt === false || reduced) {f.dust=[];this._debrisLayer.replaceChildren();}
      f.lastMode=mode;
      if(mode === "paused" || ["idle","error","unknown","unavailable"].includes(mode) || reduced || this._controlsOpen) {
        this._motion?.pause();this._frontHalt();this._drawFront();return;
      }
      if(!f.task) {
        this._motion?.cancel();this._drawFront();
        if(mode === "returning")Promise.resolve().then(()=>{
          if(this.isConnected && this._mode === "returning" && !f.task)this.dispatchEvent(new CustomEvent("vaccum-animation-docked"));
        });
        return;
      }
      if(!this._motion || this._motion.playState === "idle") {
        const motion={playState:"paused",pause:()=>{motion.playState="paused";this._frontHalt();},play:()=>{
          if(document.hidden || this._controlsOpen || this._media.matches || this._config.animation === false || !["cleaning","returning","docked"].includes(this._mode))return;
          if(motion.playState !== "running")f.playTime=0;
          motion.playState="running";this._frontSchedule();
        },cancel:()=>{motion.playState="idle";this._frontHalt();}};
        this._motion=motion;
      }
      this._drawFront();this._motion.play();
    }
    _frontHalt() {
      if(this._front.frame != null)window.cancelAnimationFrame?.(this._front.frame);
      this._front.frame=null;this._front.lastTime=null;
      if(this._card)this._card.dataset.frontRunning="false";
    }
    _frontSchedule() {
      const f=this._front;if(f.frame != null || !f.task)return;
      this._card.dataset.frontRunning="true";
      const tick=time=>{
        f.frame=null;
        if(!this.isConnected || this._motion?.playState !== "running" || this._controlsOpen || document.hidden || !["cleaning","returning","docked"].includes(this._mode)) {this._frontHalt();return;}
        const dt=f.lastTime == null ? 0 : clamp((time-f.lastTime)/1000,0,.1);f.lastTime=time;
        this._advanceFront(dt);this._drawFront();
        if(f.task)f.frame=window.requestAnimationFrame(tick);
        else {this._motion.playState="finished";this._frontHalt();}
      };
      f.frame=window.requestAnimationFrame(tick);
    }
    _advanceFront(dt) {
      const f=this._front,task=f.task;if(!task)return;
      f.playTime+=dt;const step=dt*ease(clamp(f.playTime/.45,0,1));
      const previous={...f.pose},segment=task.segments[task.index];
      if(!segment){f.task=null;return;}
      task.segmentTime=Math.min(segment.duration,task.segmentTime+step);task.time+=step;
      const t=task.segmentTime/segment.duration,progress=segment.type === "turn"?ease(t):travelProgress(t);
      f.pose={x:lerp(segment.from.x,segment.to.x,progress),z:lerp(segment.from.z,segment.to.z,progress),yaw:lerp(segment.from.yaw,segment.to.yaw,progress)};
      task.distance+=metric(previous,f.pose);
      if(this._mode === "cleaning") {
        f.brushTime+=step;
        for(const piece of f.dust)if(piece.age<piece.delay) {
          piece.age+=step;
          if(piece.age>=piece.delay)piece.element.dataset.revealed="true";
        }
        this._collectFrontDust(previous,f.pose);
      }
      if(t>=1) {
        task.index++;task.segmentTime=0;
        if(task.index>=task.segments.length) {
          if(task.kind === "depart" || task.kind === "cleaning")this._frontPlan("cleaning");
          else {f.pose={...DOCK};f.task=null;this.dispatchEvent(new CustomEvent("vaccum-animation-docked"));}
        }
      }
    }
    _supports(service) {
      const features=number(this._hass?.states?.[this._config.entity]?.attributes?.supported_features) || 0;
      return (features & FEATURES[service]) === FEATURES[service];
    }
    _renderIcon(parent,name,image) {
      if(!parent) return;
      const signature=String(name)+String(image || "")+String(Boolean(customElements.get("ha-icon")));
      if(parent.dataset.iconKey === signature) return;
      parent.dataset.iconKey=signature;
      if(typeof image === "string" && (/^\/(?!\/)/.test(image) || /^https?:\/\//i.test(image))) {
        const img=document.createElement("img"); img.src=image; img.alt=""; img.setAttribute("aria-hidden","true");
        img.addEventListener("error",()=>{if(parent.dataset.iconKey === signature) parent.innerHTML=iconSVG(name);},{once:true});
        parent.replaceChildren(img);
      } else if(typeof name === "string" && /^mdi:[a-z0-9-]+$/.test(name) && customElements.get("ha-icon")) {
        const icon=document.createElement("ha-icon"); icon.setAttribute("icon",name); icon.setAttribute("aria-hidden","true"); parent.replaceChildren(icon);
      } else parent.innerHTML=iconSVG(name);
    }
    _setButtonContent(button,key) {
      const definition=buttonDefinition(this._config,key);
      button.querySelector(".button-label").textContent=definition.name;
      this._renderIcon(button.querySelector(".button-icon"),definition.icon,definition.icon_image);
    }
    _renderCustomButtons() {
      const grid=this.shadowRoot.querySelector(".custom-grid"); grid.replaceChildren();
      this._config.custom_buttons.forEach((definition,index)=>{
        const btn=document.createElement("button"); btn.type="button"; btn.setAttribute("class","control-tile cursor-interaction"); btn.setAttribute("data-custom",String(index));
        btn.innerHTML='<span class="button-icon"></span><span class="button-label"></span>';
        btn.querySelector(".button-label").textContent=definition.name || "Meu atalho";
        this._renderIcon(btn.querySelector(".button-icon"),definition.icon || "room",definition.icon_image);
        btn.addEventListener("click",()=>{
          if(btn.disabled) return;
          this._playSelectionSound(); this._runCustom(index);
        }); grid.append(btn);
      });
      this.shadowRoot.querySelector(".custom-heading").hidden=this._config.custom_buttons.length === 0;
      const message=this.shadowRoot.querySelector(".panel-message");
      message.hidden=this._config.custom_buttons.length>0;
      message.textContent="Adicione seus atalhos para cômodos e mops no editor do cartão.";
    }
    _showControls(open) {
      this._controlsOpen=Boolean(open);
      if(open) { this._width=this._scene.clientWidth || this._width; this._motion?.pause(); this._frontHalt(); }
      this._scene.hidden=this._controlsOpen;
      this.shadowRoot.querySelector(".controls-panel").hidden=!this._controlsOpen;
      this.shadowRoot.querySelector(".main-actions").hidden=this._controlsOpen;
      const button=this.shadowRoot.querySelector(".more-controls"); button.setAttribute("aria-expanded",String(this._controlsOpen));
      this._setButtonContent(button,open ? "back" : "more");
      if(!open && this._mode) this._animate(this._mode,this._mode);
      if(open) this.shadowRoot.querySelector(".controls-panel button:not(:disabled)")?.focus();
      else button.focus?.();
    }
    _playSelectionSound() {
      const volume=this._config.sound_volume;
      if(this._config.sound === false || !volume || document.hidden) return;
      const Audio=window.AudioContext || window.webkitAudioContext;
      if(!Audio) return;
      try {
        if(!this._audio || this._audio.state === "closed") {
          this._audio=new Audio(); this._lastSoundAt=-1;
        }
        const audio=this._audio;
        const play=()=>{
          if(this._audio !== audio || audio.state !== "running" || !this.isConnected) return;
          if(this._config.sound === false || !this._config.sound_volume || document.hidden) return;
          const now=audio.currentTime;
          if(now-this._lastSoundAt<0.08) return;
          this._lastSoundAt=now;
          const tone=audio.createOscillator(), gain=audio.createGain();
          tone.type="sine";
          tone.frequency.setValueAtTime(740,now);
          tone.frequency.setValueAtTime(990,now+0.055);
          gain.gain.setValueAtTime(0,now);
          gain.gain.linearRampToValueAtTime(this._config.sound_volume,now+0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001,now+0.13);
          tone.connect(gain); gain.connect(audio.destination);
          tone.onended=()=>{tone.disconnect();gain.disconnect();};
          tone.start(now); tone.stop(now+0.14);
        };
        // Unlock audio inside a user gesture; audio failure never blocks the action.
        if(audio.state !== "running") Promise.resolve(audio.resume()).then(play).catch(()=>{});
        else play();
      } catch {}
    }
    _customRequest(definition) {
      if(!definition) return null;
      if(typeof definition.entity === "string" && /^script\.[a-z0-9_]+$/.test(definition.entity)) {
        return {domain:"script",service:"turn_on",data:{entity_id:definition.entity}};
      }
      if(typeof definition.service !== "string" || !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(definition.service)) return null;
      const [domain,service]=definition.service.split(".");
      const data=definition.data && typeof definition.data === "object" && !Array.isArray(definition.data) ? {...definition.data} : {};
      const target=definition.target && typeof definition.target === "object" && !Array.isArray(definition.target) ? {...definition.target} : undefined;
      if(domain === "vacuum" && !data.entity_id && !Object.keys(target || {}).length) data.entity_id=this._config.entity;
      if(domain !== "vacuum" && ["turn_on","turn_off","toggle","trigger","press"].includes(service) && !data.entity_id && !Object.keys(target || {}).length) return null;
      return {domain,service,data,target};
    }
    _customAvailable(definition) {
      const request=this._customRequest(definition);
      if(!request) return false;
      if(this._hass?.services && !this._hass.services[request.domain]?.[request.service]) return false;
      if(request.domain === "vacuum" && FEATURES[request.service] && !this._supports(request.service)) return false;
      const ids=request.target?.entity_id || request.data.entity_id || (request.domain === "script" && request.service !== "turn_on" ? `script.${request.service}` : []);
      return (Array.isArray(ids) ? ids : [ids]).every(id=>typeof id === "string" && this._hass?.states?.[id] && !["unknown","unavailable"].includes(this._hass.states[id].state));
    }
    _refreshFan(unavailable) {
      const attrs=this._hass?.states?.[this._config.entity]?.attributes || {};
      const speeds=Array.isArray(attrs.fan_speed_list) ? attrs.fan_speed_list.filter(s=>typeof s === "string") : [];
      const select=this.shadowRoot.querySelector(".fan-select");
      const signature=JSON.stringify(speeds);
      if(select.dataset.options !== signature) {
        select.dataset.options=signature; select.replaceChildren();
        const placeholder=document.createElement("option"); placeholder.value=""; placeholder.textContent="Escolha a potência"; select.append(placeholder);
        speeds.forEach(speed=>{const option=document.createElement("option"); option.value=speed; option.textContent=speed; select.append(option);});
      }
      select.value=speeds.includes(attrs.fan_speed) ? attrs.fan_speed : "";
      select.disabled=this._pending || unavailable || !this._supports("set_fan_speed") || !speeds.length;
      this.shadowRoot.querySelector(".fan-field").hidden=!this._supports("set_fan_speed") || !speeds.length;
    }
    _refreshButtons() {
      const service=this._card.dataset.mode === "cleaning" ? "pause" : "start";
      const key=service === "pause" ? "pause" : this._card.dataset.mode === "paused" ? "resume" : "start";
      const unavailable=["unavailable","unknown","error"].includes(this._card.dataset.mode);
      for(const btn of this.shadowRoot.querySelectorAll('[data-action="primary"]')) {
        this._setButtonContent(btn,key);
        btn.disabled=this._pending || unavailable || !this._supports(service);
      }
      for(const [action,command] of [["return","return_to_base"],["stop","stop"],["spot","clean_spot"],["locate","locate"]]) {
        for(const btn of this.shadowRoot.querySelectorAll(`[data-action="${action}"]`)) btn.disabled=this._pending || unavailable || (command === "return_to_base" && this._card.dataset.mode === "docked") || !this._supports(command);
      }
      this.shadowRoot.querySelectorAll("[data-custom]").forEach(btn=>btn.disabled=this._pending || unavailable || !this._customAvailable(this._config.custom_buttons[Number(btn.dataset.custom)]));
      this._refreshFan(unavailable);
    }
    async _act(action) {
      const service=action === "primary" ? (this._mode === "cleaning" ? "pause" : "start") : {return:"return_to_base",stop:"stop",spot:"clean_spot",locate:"locate"}[action];
      if(this._pending || !this._supports(service) || ["unavailable","unknown","error"].includes(this._mode)) return;
      if(service === "return_to_base" && this._mode === "docked") return;
      await this._send({domain:"vacuum",service,data:{entity_id:this._config.entity}});
    }
    async _runCustom(index) {
      const definition=this._config.custom_buttons[index];
      if(this._pending || ["unavailable","unknown","error"].includes(this._mode) || !this._customAvailable(definition)) return;
      await this._send(this._customRequest(definition));
    }
    async _setFan(value) {
      const speeds=this._hass?.states?.[this._config.entity]?.attributes?.fan_speed_list || [];
      if(this._pending || ["unavailable","unknown","error"].includes(this._mode) || !this._supports("set_fan_speed") || !speeds.includes(value)) return;
      await this._send({domain:"vacuum",service:"set_fan_speed",data:{entity_id:this._config.entity,fan_speed:value}});
    }
    async _send(request) {
      if(!request || !this._hass?.callService) return;
      const message=this.shadowRoot.querySelector(".service-message"); message.hidden=true;
      this._pending=true; this._refreshButtons();
      try {
        if(request.target) await this._hass.callService(request.domain,request.service,request.data,request.target);
        else await this._hass.callService(request.domain,request.service,request.data);
      }
      catch(error) { message.textContent=`Não foi possível enviar o comando: ${error?.message || "verifique a conexão"}`; message.hidden=false; }
      finally { this._pending=false; this._refreshButtons(); }
    }
  }

  class VaccumCardAnimationsEditor extends HTMLElement {
    constructor() { super(); this.attachShadow({mode:"open"}); }
    setConfig(config) { this._config={...config}; this._render(); }
    set hass(value) { this._hass=value; this._fillOptions(); this._fillShortcutOptions(); }
    _render() {
      this.shadowRoot.innerHTML=`<style>:host{display:block;color:var(--primary-text-color);font-family:Roboto,Arial,sans-serif}label{display:grid;gap:7px;margin:16px 0;font-size:14px}input,select{width:100%;padding:11px;border:1px solid var(--divider-color,#888);border-radius:8px;background:var(--card-background-color);color:inherit;font-size:16px;box-sizing:border-box}.check{display:flex;align-items:center;gap:9px}.check input{width:auto}small{color:var(--secondary-text-color);font-size:12px}.shortcut{padding:6px 0 18px;border-bottom:1px solid var(--divider-color,#888)}.shortcut h4{font-size:14px;font-weight:500;margin:10px 0}.shortcut-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px}.shortcut .wide{grid-column:1/-1}.shortcut label{min-width:0}.editor-button{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:10px 14px;color:inherit;background:var(--secondary-background-color,#8882);border:0;border-radius:10px;font:400 14px Roboto,Arial,sans-serif;margin-top:10px}.editor-button svg{width:20px;height:20px}.editor-button:disabled{opacity:.45}h3{font-size:16px;font-weight:500;margin-top:26px}.button-settings{margin-top:22px}.button-settings summary{min-height:44px;padding:12px 0;font-size:14px}[hidden]{display:none!important}@media(max-width:360px){.shortcut-fields{grid-template-columns:1fr}}</style>
      <label>Nome do card<input name="name" type="text"></label>
      <label>Aspirador<select name="entity"></select></label>
      <label>Sensor da bateria<select name="battery_entity"></select></label>
      <label>Sensor do tempo de limpeza<select name="cleaning_time_entity"></select></label>
      <label>Sensor do tempo dos mops<select name="mop_time_entity"></select></label>
      <label>Texto dos mops<input name="mop_label" type="text"></label>
      <label class="check"><input name="show_controls" type="checkbox">Mostrar controles</label>
      <label class="check"><input name="animation" type="checkbox">Animar o aspirador</label>
      <label class="check"><input name="dirt" type="checkbox">Mostrar sujeiras no percurso</label>
      <label class="check"><input name="sound" type="checkbox">Som de seleção nos botões</label>
      <label>Volume do som<input name="sound_volume" type="range" min="0" max="1" step="0.01"></label>
      <small>Sem sensor selecionado, o card usa os atributos do aspirador. Ajuste unidades e atributos pelo YAML quando necessário.</small>
      <details class="button-settings"><summary class="cursor-interaction">Personalizar todos os botões</summary>
        <label>Botão<select data-button-picker></select></label>
        <label>Nome exibido<input type="text" data-control-field="name" maxlength="120"></label>
        <label>Ícone<input type="text" data-control-field="icon" list="vca-button-icons" placeholder="pause ou mdi:pause-circle"></label>
        <datalist id="vca-button-icons"></datalist>
        <label>Imagem do ícone (opcional)<input type="text" data-control-field="icon_image" placeholder="/local/icones/meu-icone.svg"></label>
        <button type="button" class="editor-button reset-control cursor-interaction">Restaurar este botão</button>
      </details>
      <h3>Botões personalizados</h3><div class="shortcut-list"></div><button type="button" class="editor-button add-shortcut cursor-interaction">${iconSVG("add")}Adicionar botão</button>`;
      for(const key of ["name","mop_label"]) this.shadowRoot.querySelector(`[name="${key}"]`).value=this._config[key] || (key === "name" ? CARD_NAME : "Mops · tempo restante");
      for(const key of ["show_controls","animation","dirt","sound"]) this.shadowRoot.querySelector(`[name="${key}"]`).checked=this._config[key] !== false;
      this.shadowRoot.querySelector('[name="sound_volume"]').value=clamp(number(this._config.sound_volume) ?? 0.18,0,1);
      this._fillOptions();
      this.shadowRoot.querySelectorAll("input[name],select[name]").forEach(input=>input.addEventListener("change",()=> {
        const value=input.type === "checkbox" ? input.checked : input.name === "sound_volume" ? Number(input.value) : input.value;
        const config={...this._config,[input.name]:value};
        if(value === "") delete config[input.name];
        this._config=config;
        this.dispatchEvent(new CustomEvent("config-changed",{detail:{config},bubbles:true,composed:true}));
      }));
      this._renderButtonSettings();
      this.shadowRoot.querySelector(".add-shortcut").addEventListener("click",()=>{
        const buttons=[...(this._config.custom_buttons || [])];
        if(buttons.length>=12) return;
        buttons.push({name:"Limpar cômodo",icon:"room",entity:""});
        this._config={...this._config,custom_buttons:buttons}; this._renderShortcuts(); this._emit();
      });
      this._renderShortcuts();
    }
    _emit() { this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:true,composed:true})); }
    _renderButtonSettings() {
      const picker=this.shadowRoot.querySelector("[data-button-picker]");
      for(const [key,definition] of Object.entries(BUTTONS)) {
        const option=document.createElement("option");option.value=key;option.textContent=definition.name;picker.append(option);
      }
      picker.value=this._selectedButton && BUTTONS[this._selectedButton] ? this._selectedButton : "start";
      picker.addEventListener("change",()=>{this._selectedButton=picker.value;this._fillButtonSettings();});
      const suggestions=this.shadowRoot.querySelector("datalist");
      for(const [key,label] of Object.entries(iconNames)) {
        const option=document.createElement("option");option.value=key;option.textContent=label;suggestions.append(option);
      }
      for(const input of this.shadowRoot.querySelectorAll("[data-control-field]")) input.addEventListener("change",()=>{
        const key=picker.value,field=input.dataset.controlField;if(!Object.prototype.hasOwnProperty.call(BUTTONS,key)) return;
        const buttons={...this._config.buttons},current={...buttons[key]};
        if(input.value.trim()) current[field]=input.value.trim();else delete current[field];
        if(Object.keys(current).length) buttons[key]=current;else delete buttons[key];
        this._config={...this._config,buttons};this._emit();this._fillButtonSettings();
      });
      this.shadowRoot.querySelector(".reset-control").addEventListener("click",()=>{
        const key=picker.value,buttons={...this._config.buttons},icons={...this._config.icons};delete buttons[key];delete icons[key];
        if(key === "resume" && icons.start) buttons.resume={icon:BUTTONS.resume.icon};
        this._config={...this._config,buttons,icons};this._emit();this._fillButtonSettings();
      });
      this._fillButtonSettings();
    }
    _fillButtonSettings() {
      const key=this.shadowRoot.querySelector("[data-button-picker]").value;
      if(!Object.prototype.hasOwnProperty.call(BUTTONS,key)) return;
      const definition=buttonDefinition(this._config,key);
      for(const field of ["name","icon","icon_image"]) this.shadowRoot.querySelector(`[data-control-field="${field}"]`).value=definition[field];
    }
    _renderShortcuts() {
      const list=this.shadowRoot.querySelector(".shortcut-list"); if(!list) return;
      list.replaceChildren();
      const buttons=Array.isArray(this._config.custom_buttons) ? this._config.custom_buttons : [];
      buttons.forEach((definition,index)=>{
        const row=document.createElement("section"); row.setAttribute("class","shortcut"); row.setAttribute("data-shortcut",String(index));
        row.innerHTML=`<h4>Botão personalizado</h4><div class="shortcut-fields"><label>Nome<input type="text" data-field="name"></label><label>Ícone<select data-field="icon"></select></label><label class="wide">Script do atalho<select data-field="entity"></select></label><label class="wide">Imagem do ícone (opcional)<input type="text" data-field="icon_image" placeholder="/local/icones/meu-icone.svg"></label></div><button type="button" class="editor-button remove-shortcut cursor-interaction">${iconSVG("trash")}Remover botão</button>`;
        row.querySelector('[data-field="name"]').value=definition.name || "Meu atalho";
        row.querySelector('[data-field="icon_image"]').value=definition.icon_image || "";
        const iconSelect=row.querySelector('[data-field="icon"]');
        const names={...iconNames}; if(definition.icon && !names[definition.icon]) names[definition.icon]=definition.icon;
        for(const [value,label] of Object.entries(names)) { const option=document.createElement("option"); option.value=value; option.textContent=label; iconSelect.append(option); }
        iconSelect.value=definition.icon || "room";
        row.querySelectorAll("input,select").forEach(input=>input.addEventListener("change",()=>{
          const field=input.dataset.field; const next=[...(this._config.custom_buttons || [])]; const current=next[index] || definition;
          next[index]=field === "entity" ? {name:current.name,icon:current.icon,icon_image:current.icon_image,entity:input.value} : {...current,[field]:input.value};
          this._config={...this._config,custom_buttons:next}; this._emit();
        }));
        row.querySelector(".remove-shortcut").addEventListener("click",()=>{
          this._config={...this._config,custom_buttons:(this._config.custom_buttons || []).filter((_,i)=>i !== index)}; this._renderShortcuts(); this._emit();
        });
        list.append(row);
      });
      this.shadowRoot.querySelector(".add-shortcut").disabled=buttons.length>=12;
      this._fillShortcutOptions();
    }
    _fillShortcutOptions() {
      for(const row of this.shadowRoot.querySelectorAll("[data-shortcut]")) {
        const index=Number(row.dataset.shortcut); const definition=this._config?.custom_buttons?.[index] || {};
        const selected=definition.entity || (typeof definition.target?.entity_id === "string" && definition.target.entity_id.startsWith("script.") ? definition.target.entity_id : "");
        const ids=Object.keys(this._hass?.states || {}).filter(id=>id.startsWith("script.")).sort();
        if(selected && !ids.includes(selected)) ids.unshift(selected);
        const select=row.querySelector('[data-field="entity"]'); const signature=JSON.stringify([ids,selected]);
        if(select.dataset.signature === signature) continue;
        select.dataset.signature=signature; select.replaceChildren();
        const option=document.createElement("option"); option.value=""; option.textContent=definition.service && !selected ? "Ação configurada pelo YAML" : "Selecione um script"; select.append(option);
        for(const id of ids) { const option=document.createElement("option"); option.value=id; option.textContent=this._hass?.states?.[id]?.attributes?.friendly_name || id; select.append(option); }
        select.value=selected;
      }
    }
    _fillOptions() {
      if(!this._config || !this.shadowRoot.querySelector("select")) return;
      for(const select of this.shadowRoot.querySelectorAll("select[name]")) {
        const prefix=select.name === "entity" ? "vacuum." : "sensor.";
        const ids=Object.keys(this._hass?.states || {}).filter(id=>id.startsWith(prefix)).sort();
        const selected=this._config[select.name] || "";
        if(selected && !ids.includes(selected)) ids.unshift(selected);
        const signature=JSON.stringify([ids,selected]);
        if(select.dataset.signature === signature) continue;
        select.dataset.signature=signature; select.replaceChildren();
        const automatic=document.createElement("option"); automatic.value=""; automatic.textContent=prefix === "vacuum." ? "Selecione o aspirador" : "Usar atributo do aspirador"; select.append(automatic);
        for(const id of ids) { const option=document.createElement("option"); option.value=id; option.textContent=`${this._hass?.states?.[id]?.attributes?.friendly_name || id} (${id})`; select.append(option); }
        select.value=selected;
      }
    }
  }
  if(!customElements.get(TYPE)) customElements.define(TYPE,VaccumCardAnimations);
  if(!customElements.get(TYPE+"-editor")) customElements.define(TYPE+"-editor",VaccumCardAnimationsEditor);
  if(!customElements.get(LEGACY_TYPE)) customElements.define(LEGACY_TYPE,class extends VaccumCardAnimations {});
  if(!customElements.get(LEGACY_TYPE+"-editor")) customElements.define(LEGACY_TYPE+"-editor",class extends VaccumCardAnimationsEditor {});
  window.customCards=window.customCards || [];
  // Replace the old picker entry if an earlier bundle was already loaded.
  window.customCards=window.customCards.filter(card=>card.type !== LEGACY_TYPE);
  if(!window.customCards.some(card=>card.type === TYPE)) window.customCards.push({type:TYPE,name:CARD_NAME,description:"Aspirador em visão frontal, cenário personalizável, temas, controles e som de seleção.",preview:true,getEntitySuggestion:(hass,entityId)=>entityId.startsWith("vacuum.") ? {entity:entityId} : null});
})();
