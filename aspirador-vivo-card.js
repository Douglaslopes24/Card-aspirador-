/* Aspirador Vivo 1.2.0 — Home Assistant custom card, no external dependencies. */
(() => {
  "use strict";
  const TYPE = "aspirador-vivo-card";
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
  const iconSVG = name => `<svg class="av-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.controls}</svg>`;
  const iconNames = {clean:"Aspirador",pause:"Pausa",stop:"Parar",dock:"Base",spot:"Limpeza pontual",locate:"Localizar",room:"Cômodo",kitchen:"Cozinha",mop:"Mops",fan:"Potência",controls:"Controles"};
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

  const CSS = `
    :host { display:block; font-family:var(--paper-font-body1_-_font-family,Roboto,Arial,sans-serif); color-scheme:inherit;
      --av-bg:var(--ha-card-background,var(--card-background-color,light-dark(#f8fafb,#17212b)));
      --av-ink:var(--primary-text-color,light-dark(#182b36,#edf4f8));
      --av-muted:var(--secondary-text-color,light-dark(#526773,#aabfcf));
      --av-accent:var(--primary-color,light-dark(#087f92,#6bdace));
      --av-line:light-dark(#dde6eb,#2b3c49); --av-floor:light-dark(#edf3f5,#1b2a34);
      --av-error:light-dark(#a73535,#ffb2a9); --av-shadow:light-dark(#213e4220,#00000040); }
    * { box-sizing:border-box; }
    ha-card { display:block; position:relative; overflow:hidden; background:var(--av-bg); color:var(--av-ink);
      border-radius:var(--ha-card-border-radius,24px); border:1px solid var(--av-line); box-shadow:var(--ha-card-box-shadow,0 12px 32px var(--av-shadow)); container-type:inline-size; }
    header { display:flex; align-items:center; gap:12px; padding:20px 22px 10px; }
    .heading { min-width:0; flex:1; }
    .name { margin:0 0 5px; font-size:17px; font-weight:500; overflow-wrap:anywhere; }
    .state { display:flex; align-items:center; gap:7px; color:var(--av-muted); font-size:12px; }
    .dot { flex:none; width:6px; height:6px; border-radius:50%; background:var(--av-muted); }
    [data-mode=cleaning] .dot, [data-mode=docked] .dot { background:var(--av-accent); }
    [data-mode=error] .dot { background:var(--av-error); }
    .badge { color:var(--av-muted); font-size:11px; letter-spacing:1.4px; padding:8px 0 8px 8px; }
    .scene { position:relative; height:248px; margin:0 8px; overflow:hidden; }
    .floor { position:absolute; inset:64px 8px 7px; border-radius:20px; background:linear-gradient(180deg,transparent,var(--av-floor)); }
    .tiles { position:absolute; inset:88px 10px 10px; background-image:linear-gradient(90deg,var(--av-line) 1px,transparent 1px),linear-gradient(var(--av-line) 1px,transparent 1px); background-size:46px 46px; opacity:.22; mask-image:linear-gradient(transparent,#000); }
    .stats { position:absolute; top:24px; left:14px; right:132px; display:grid; gap:18px; transition:opacity .35s,transform .35s; }
    .metric { min-width:0; }
    .metric-label { color:var(--av-muted); font-size:12px; margin-bottom:5px; line-height:1.4; }
    .metric-value { font-size:22px; font-weight:500; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
    .metric:not(:first-child) .metric-value { font-size:17px; }
    .battery-track { margin-top:9px; height:4px; max-width:126px; background:var(--av-line); border-radius:3px; overflow:hidden; }
    .battery-fill { height:100%; width:0; background:var(--av-accent); border-radius:inherit; transition:width .5s; }
    .top-battery { position:absolute; top:12px; left:14px; right:14px; display:grid; grid-template-columns:1fr auto; gap:7px 15px; align-items:center;
      opacity:0; transform:translateY(-8px); pointer-events:none; transition:opacity .35s,transform .35s; }
    .top-battery .metric-label { margin:0; }
    .top-battery strong { font-size:22px; font-weight:500; font-variant-numeric:tabular-nums; }
    .top-battery .battery-track { grid-column:1/-1; margin:0; max-width:none; }
    .activity { position:absolute; bottom:13px; left:14px; right:115px; display:flex; gap:15px; flex-wrap:wrap; color:var(--av-muted); font-size:12px; opacity:0; transition:opacity .35s; }
    .activity span { white-space:nowrap; }
    .activity b { color:var(--av-ink); font-weight:500; font-variant-numeric:tabular-nums; }
    [data-active=true] .stats { opacity:0; transform:translateX(-8px); pointer-events:none; }
    [data-active=true] .top-battery, [data-active=true] .activity { opacity:1; transform:none; }
    .dock { position:absolute; right:16px; bottom:46px; width:70px; height:116px; }
    .dock-shadow { position:absolute; bottom:-20px; left:-9px; width:89px; height:37px; background:var(--av-shadow); border-radius:50%; filter:blur(6px); }
    .tower { position:absolute; inset:0 2px 6px; border-radius:15px 15px 10px 10px; background:linear-gradient(110deg,#fff,#e0e6e9 60%,#b7c3cc); box-shadow:inset 2px 0 3px #fff,4px 5px 6px #0002; }
    .tower::before { content:""; position:absolute; top:6px; left:10px; right:10px; height:3px; background:#c6d0d6; border-radius:4px; }
    .dock-face { position:absolute; top:27px; left:8px; right:8px; height:40px; border-radius:6px; background:linear-gradient(120deg,#36434b,#1a242c); }
    .dock-led { position:absolute; top:12px; left:27px; width:8px; height:3px; border-radius:5px; background:#7ddbc7; box-shadow:0 0 5px #58d6b980; }
    .dock-port { position:absolute; bottom:8px; left:15px; right:15px; height:22px; background:#45545e; border-radius:8px 8px 0 0; }
    .tray { position:absolute; bottom:-24px; left:-9px; width:88px; height:47px; border-radius:12px 12px 23px 23px; background:linear-gradient(#bdcbd2,#dce3e8); box-shadow:0 3px 4px #0002; }
    .dock-label { position:absolute; bottom:-42px; left:0; right:0; text-align:center; color:var(--av-muted); font-size:11px; }
    .mover { position:absolute; left:0; top:0; width:70px; height:70px; will-change:transform; z-index:2; }
    .robot-shadow { position:absolute; inset:6px -3px -6px; border-radius:50%; background:#0003; filter:blur(4px); }
    .halo { position:absolute; inset:-12px; border-radius:50%; background:radial-gradient(circle,#65dcca28,transparent 67%); opacity:0; transition:opacity .3s; }
    .mop { position:absolute; bottom:-3px; width:24px; height:24px; border-radius:50%; background:repeating-conic-gradient(#63bfb4 0deg 20deg,#abd9d1 20deg 40deg); box-shadow:0 0 0 2px #2d5a5815; animation:av-spin 2s linear infinite paused; }
    .mop.left { left:5px; } .mop.right { right:5px; animation-direction:reverse; }
    .brush { position:absolute; left:-7px; top:9px; width:29px; height:29px; animation:av-spin 1.1s linear infinite paused; }
    .brush i { position:absolute; top:13px; left:14px; width:19px; height:2px; border-radius:2px; background:#57757d; transform-origin:0 50%; }
    .brush i:nth-child(2) { transform:rotate(120deg); } .brush i:nth-child(3) { transform:rotate(240deg); }
    .shell { position:absolute; inset:0; border-radius:50%; background:linear-gradient(135deg,#fff 10%,#f1f5f7 46%,#b4c3cd); box-shadow:inset 0 -4px 0 #869ba8,inset 0 2px 1px #fff,0 2px 5px #0003; }
    .shell::before { content:""; position:absolute; inset:5px; border:1px solid #afc0cb80; border-radius:50%; }
    .bumper { position:absolute; top:4px; left:22px; width:26px; height:4px; border-radius:6px; background:#3c505d; }
    .lidar { position:absolute; top:22px; left:24px; width:22px; height:22px; border-radius:50%; background:linear-gradient(135deg,#fff,#adbecb); box-shadow:0 2px 3px #0003,inset 0 0 0 1px #acbac4; }
    .lidar::after { content:""; position:absolute; inset:4px; border-radius:50%; background:linear-gradient(120deg,#687d8c,#324956); border:2px solid #d6e0e5; }
    .robot-led { position:absolute; bottom:10px; left:31px; width:8px; height:3px; border-radius:5px; background:#5bc8b3; }
    [data-mode=cleaning] .mop, [data-mode=cleaning] .brush { animation-play-state:running; }
    [data-motion=false] .mop, [data-motion=false] .brush { animation:none; }
    [data-mode=cleaning] .halo { opacity:1; }
    [data-mode=error] .robot-led { background:#f07c70; }
    [data-mode=unavailable] .mover, [data-mode=unknown] .mover, [data-mode=unavailable] .dock, [data-mode=unknown] .dock { opacity:.4; }
    footer { padding:12px 20px 16px; border-top:1px solid var(--av-line); }
    .main-actions { display:flex; gap:8px; }
    button { min-height:44px; flex:1; border:0; border-radius:12px; font:500 13px Roboto,Arial,sans-serif; background:var(--av-floor); color:var(--av-ink); padding:10px 9px; }
    button.primary { background:var(--av-accent); color:var(--text-primary-color,light-dark(#fff,#102932)); }
    button:disabled { opacity:.45; cursor:default; }
    button:focus-visible { outline:2px solid var(--av-accent); outline-offset:2px; }
    .av-icon { display:block; width:22px; height:22px; flex:none; }
    .button-icon { display:inline-flex; align-items:center; justify-content:center; color:inherit; }
    .button-icon ha-icon { --mdc-icon-size:22px; }
    .button-icon img { width:24px; height:24px; object-fit:contain; }
    .main-actions button, .more-controls { display:flex; align-items:center; justify-content:center; gap:7px; }
    .main-actions .av-icon { width:19px; height:19px; }
    .more-controls { width:100%; margin-top:9px; background:transparent; color:var(--av-muted); min-height:44px; font-weight:400; }
    .controls-panel { padding:12px 20px 18px; animation:av-panel .24s ease-out; }
    .panel-heading { margin:0 0 14px; font-size:15px; font-weight:500; }
    .control-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
    .control-tile { display:flex; flex-direction:column; gap:8px; align-items:flex-start; justify-content:center; padding:14px; min-height:83px; text-align:left; }
    .control-tile .button-icon { color:var(--av-accent); }
    .control-tile .button-label { overflow-wrap:anywhere; line-height:1.4; }
    .fan-field { display:grid; grid-template-columns:auto 1fr; gap:9px 11px; align-items:center; margin-top:16px; }
    .fan-field .button-icon { color:var(--av-accent); }
    .fan-field label { color:var(--av-muted); font-size:12px; }
    .fan-select { grid-column:1/-1; min-height:44px; padding:10px 12px; border:1px solid var(--av-line); border-radius:10px; color:var(--av-ink); background:var(--av-floor); font:400 16px Roboto,Arial,sans-serif; width:100%; }
    .custom-heading { margin:20px 0 12px; color:var(--av-muted); font-size:12px; font-weight:400; }
    .panel-message { margin:14px 0 0; color:var(--av-muted); font-size:12px; line-height:1.5; }
    .service-message { padding:0 22px 13px; color:var(--av-error); font-size:12px; overflow-wrap:anywhere; }
    [hidden] { display:none !important; }
    @keyframes av-spin { to { transform:rotate(360deg); } }
    @keyframes av-panel { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
    @container (max-width:330px) { header { padding:18px 16px 9px; } .stats { right:120px; left:8px; } .activity { left:8px; gap:7px; right:108px; } .metric-label { font-size:11px; } footer { padding:11px 14px 14px; } .controls-panel { padding:12px 14px 16px; } .control-tile { padding:12px; } }
    @media (prefers-reduced-motion:reduce) { .mop,.brush,.controls-panel { animation:none; } .stats,.top-battery,.activity,.battery-fill { transition:none; } }
  `;

  class AspiradorVivoCard extends HTMLElement {
    constructor() {
      super(); this.attachShadow({mode:"open"}); this._mode = null; this._motion = null; this._pending = false; this._controlsOpen = false;
      this._media = window.matchMedia("(prefers-reduced-motion: reduce)");
      this._mediaChanged = () => { if(this.isConnected) this._animate(this._mode,this._mode); };
      this._visibility = () => { if(!this._motion) return; if(document.hidden || this._controlsOpen) this._motion.pause(); else this._motion.play(); };
      this.shadowRoot.addEventListener("keydown",event=>{if(event.key === "Escape" && this._controlsOpen) this._showControls(false);});
    }
    static getConfigElement() { return document.createElement(TYPE + "-editor"); }
    static getStubConfig(hass) { return {entity:Object.keys(hass?.states || {}).find(id => id.startsWith("vacuum.")) || "vacuum.seu_aspirador", name:"Aspirador Vivo"}; }
    setConfig(config) {
      if (!config || typeof config.entity !== "string" || !config.entity.startsWith("vacuum.")) throw new Error("Escolha uma entidade vacuum para o Aspirador Vivo.");
      if(config.custom_buttons !== undefined && (!Array.isArray(config.custom_buttons) || config.custom_buttons.length>12)) throw new Error("Use uma lista de até 12 botões personalizados.");
      this._config = {name:"Aspirador Vivo", show_controls:true, animation:true, sound:true, sound_volume:0.18, cycle_seconds:18, mop_label:"Mops · tempo restante", custom_buttons:[], icons:{}, ...config};
      this._config.sound_volume=clamp(number(config.sound_volume) ?? 0.18,0,1);
      this._config.custom_buttons=this._config.custom_buttons.filter(b=>b && typeof b === "object").map(b=>({...b}));
      this._controlsOpen=false;
      this._config.cycle_seconds = clamp(number(config.cycle_seconds) || 18,8,90);
      this._render(); this._mode = null; this._update();
    }
    set hass(value) { this._hass = value; if(this._config) this._update(); }
    get hass() { return this._hass; }
    getCardSize() { return Math.ceil((this._card?.offsetHeight || (this._controlsOpen ? 650 : this._config?.show_controls === false ? 320 : 426))/50); }
    getGridOptions() { return {columns:12,min_columns:12}; }
    connectedCallback() {
      this._media.addEventListener?.("change", this._mediaChanged);
      document.addEventListener("visibilitychange",this._visibility);
      if(typeof ResizeObserver !== "undefined") {
        this._resize = new ResizeObserver(entries => {
          const width = Math.round(entries[0].contentRect.width);
          if(width && width !== this._width) { this._width = width; if(this._mode) this._animate(this._mode,this._mode); }
        });
        if(this._scene) this._resize.observe(this._scene);
      }
      if(this._config) this._update(true);
    }
    disconnectedCallback() {
      this._motion?.cancel(); this._motion = null; this._resize?.disconnect();
      this._media.removeEventListener?.("change",this._mediaChanged);
      document.removeEventListener("visibilitychange",this._visibility);
      const audio=this._audio; this._audio=null;
      if(audio && audio.state !== "closed") {
        try { Promise.resolve(audio.close()).catch(()=>{}); } catch {}
      }
    }
    _render() {
      this._motion?.cancel(); this._resize?.disconnect();
      this._hasPlaced=false;
      this.shadowRoot.innerHTML = `<style>${CSS}</style>
        <ha-card data-mode="unknown" data-active="false">
          <header><div class="heading"><h2 class="name"></h2><div class="state" role="status" aria-live="polite"><span class="dot" aria-hidden="true"></span><span class="state-text">Sem informação</span></div></div><span class="badge" aria-hidden="true">VIVO</span></header>
          <div class="scene" role="group" aria-label="Aspirador na base à direita">
            <div class="floor" aria-hidden="true"></div><div class="tiles" aria-hidden="true"></div>
            <div class="stats">
              <div class="metric"><div class="metric-label">Bateria</div><div class="metric-value battery-value">—</div><div class="battery-track" role="progressbar" aria-label="Bateria" aria-valuemin="0" aria-valuemax="100"><div class="battery-fill"></div></div></div>
              <div class="metric"><div class="metric-label">Tempo de limpeza</div><div class="metric-value clean-value">—</div></div>
              <div class="metric"><div class="metric-label mop-label"></div><div class="metric-value mop-value">—</div></div>
            </div>
            <div class="top-battery" aria-hidden="true"><div class="metric-label">Bateria</div><strong class="battery-value">—</strong><div class="battery-track" role="progressbar" aria-label="Bateria" aria-valuemin="0" aria-valuemax="100"><div class="battery-fill"></div></div></div>
            <div class="dock" aria-hidden="true"><div class="dock-shadow"></div><div class="tray"></div><div class="tower"><div class="dock-face"><span class="dock-led"></span></div><div class="dock-port"></div></div><div class="dock-label">BASE</div></div>
            <div class="mover" aria-hidden="true"><div class="robot-shadow"></div><div class="halo"></div><div class="mop left"></div><div class="mop right"></div><div class="brush"><i></i><i></i><i></i></div><div class="shell"><div class="bumper"></div><div class="lidar"></div><div class="robot-led"></div></div></div>
            <div class="activity" aria-hidden="true"><span>Limpeza <b class="clean-value">—</b></span><span>Mops <b class="mop-value">—</b></span></div>
          </div>
          <section class="controls-panel" id="av-controls" aria-label="Controles do aspirador" hidden>
            <h3 class="panel-heading">Controles do aspirador</h3>
            <div class="control-grid">
              <button type="button" class="control-tile cursor-interaction" data-action="primary"><span class="button-icon"></span><span class="button-label">Iniciar limpeza</span></button>
              <button type="button" class="control-tile cursor-interaction" data-action="return"><span class="button-icon"></span><span class="button-label">Voltar à base</span></button>
              <button type="button" class="control-tile cursor-interaction" data-action="stop"><span class="button-icon"></span><span class="button-label">Parar limpeza</span></button>
              <button type="button" class="control-tile cursor-interaction" data-action="spot"><span class="button-icon"></span><span class="button-label">Limpeza pontual</span></button>
              <button type="button" class="control-tile cursor-interaction" data-action="locate"><span class="button-icon"></span><span class="button-label">Encontrar robô</span></button>
            </div>
            <div class="fan-field"><span class="button-icon fan-icon"></span><label for="av-fan">Potência de aspiração</label><select id="av-fan" class="fan-select" aria-label="Potência de aspiração"></select></div>
            <h4 class="custom-heading">Seus atalhos</h4><div class="control-grid custom-grid"></div>
            <p class="panel-message" hidden></p>
          </section>
          <footer><div class="main-actions"><button type="button" class="primary cursor-interaction" data-action="primary"><span class="button-icon"></span><span class="button-label">Iniciar limpeza</span></button><button type="button" class="cursor-interaction" data-action="return"><span class="button-icon"></span><span class="button-label">Voltar à base</span></button></div><button type="button" class="more-controls cursor-interaction" aria-expanded="false" aria-controls="av-controls"><span class="button-icon"></span><span class="button-label">Mais controles</span></button></footer>
          <div class="service-message" role="alert" hidden></div>
        </ha-card>`;
      this._card = this.shadowRoot.querySelector("ha-card"); this._scene = this.shadowRoot.querySelector(".scene"); this._robot = this.shadowRoot.querySelector(".mover");
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
      for(const btn of this.shadowRoot.querySelectorAll('[data-action="return"]')) this._renderIcon(btn.querySelector(".button-icon"),this._config.icons?.return || "dock");
      for(const [action,icon] of [["stop","stop"],["spot","spot"],["locate","locate"]]) this._renderIcon(this.shadowRoot.querySelector(`[data-action="${action}"] .button-icon`),this._config.icons?.[action] || icon);
      this._renderIcon(this.shadowRoot.querySelector(".fan-icon"),this._config.icons?.fan || "fan");
      this._renderIcon(this.shadowRoot.querySelector(".more-controls .button-icon"),this._config.icons?.more || "controls");
      this._renderCustomButtons();
      this._resize?.observe(this._scene);
    }
    _update(force = false) {
      if(!this._card || !this._hass) return;
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
    }
    _geometry() {
      const width = this._scene.clientWidth || this._width || 384; const height = this._scene.clientHeight || 248;
      return {width,height,dock:{x:width-51,y:height-53,a:0},left:49,right:Math.max(121,width-119),top:105,bottom:height-100};
    }
    _pose() {
      try {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(this._robot).transform);
        return {x:matrix.m41+35,y:matrix.m42+35,a:Math.atan2(matrix.m12,matrix.m11)*180/Math.PI};
      } catch { return this._lastPose || this._geometry().dock; }
    }
    _transform(p) { return `translate(${p.x-35}px,${p.y-35}px) rotate(${p.a || 0}deg)`; }
    _stop(p) { this._motion?.cancel(); this._motion=null; this._lastPose=p; this._robot.style.transform=this._transform(p); }
    _animate(mode,previous) {
      if(!this._robot || !this.isConnected) return;
      const g=this._geometry();
      const pose = previous && this._hasPlaced ? this._pose() : g.dock;
      this._hasPlaced=true;
      this._stop(pose);
      const reduced = this._media.matches || this._config.animation === false || typeof this._robot.animate !== "function";
      this._card.dataset.motion=String(!reduced);
      if(this._controlsOpen) return;
      if(mode === "cleaning") {
        const destination={x:g.right,y:g.bottom,a:-90};
        if(reduced) { this._stop(destination); return; }
        this._motion=this._robot.animate([{transform:this._transform(pose)},{transform:this._transform(destination)}],{duration:1400,easing:"ease-in-out",fill:"forwards"});
        this._motion.onfinish=()=> { if(this._mode === "cleaning" && this.isConnected) this._sweep(g); };
      } else if(mode === "returning") {
        const target={...g.dock,x:g.dock.x-10,a:90};
        this._moveTo(pose,target,reduced ? 0 : 2300);
      } else if(mode === "docked") {
        this._moveTo(pose,g.dock,reduced || !previous ? 0 : 900);
      } else if(mode === "idle") {
        this._stop({x:g.dock.x-16,y:g.dock.y,a:0});
      } else if(!previous) this._stop({x:g.right,y:g.bottom,a:0});
      if(document.hidden) this._motion?.pause();
    }
    _moveTo(start,end,ms) {
      if(!ms) { this._stop(end); return; }
      this._motion=this._robot.animate([{transform:this._transform(start)},{transform:this._transform(end)}],{duration:ms,easing:"ease-in-out",fill:"forwards"});
      const animation=this._motion;
      animation.onfinish=()=> { if(this._motion===animation) this._stop(end); };
    }
    _sweep(g) {
      this._motion?.cancel();
      const points=[
        [g.right,g.bottom,-90,0],[g.left,g.bottom,-90,.32],[g.left,g.bottom,0,.37],
        [g.left,g.top,0,.46],[g.left,g.top,90,.51],[g.right,g.top,90,.83],
        [g.right,g.top,180,.88],[g.right,g.bottom,180,.97],[g.right,g.bottom,270,1]
      ];
      const frames=points.map(([x,y,a,offset])=>({transform:this._transform({x,y,a}),offset}));
      this._motion=this._robot.animate(frames,{duration:this._config.cycle_seconds*1000,iterations:Infinity,easing:"linear"});
      if(document.hidden) this._motion.pause();
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
      if(open) { this._width=this._scene.clientWidth || this._width; this._motion?.pause(); }
      this._scene.hidden=this._controlsOpen;
      this.shadowRoot.querySelector(".controls-panel").hidden=!this._controlsOpen;
      this.shadowRoot.querySelector(".main-actions").hidden=this._controlsOpen;
      const button=this.shadowRoot.querySelector(".more-controls"); button.setAttribute("aria-expanded",String(this._controlsOpen));
      button.querySelector(".button-label").textContent=open ? "Voltar ao robô" : "Mais controles";
      this._renderIcon(button.querySelector(".button-icon"),open ? "back" : this._config.icons?.more || "controls");
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
      const label=service === "pause" ? "Pausar" : this._card.dataset.mode === "paused" ? "Continuar" : "Iniciar limpeza";
      const unavailable=["unavailable","unknown","error"].includes(this._card.dataset.mode);
      for(const btn of this.shadowRoot.querySelectorAll('[data-action="primary"]')) {
        btn.querySelector(".button-label").textContent=label;
        this._renderIcon(btn.querySelector(".button-icon"),this._config.icons?.[service] || (service === "pause" ? "pause" : "clean"));
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

  class AspiradorVivoEditor extends HTMLElement {
    constructor() { super(); this.attachShadow({mode:"open"}); }
    setConfig(config) { this._config={...config}; this._render(); }
    set hass(value) { this._hass=value; this._fillOptions(); this._fillShortcutOptions(); }
    _render() {
      this.shadowRoot.innerHTML=`<style>:host{display:block;color:var(--primary-text-color);font-family:Roboto,Arial,sans-serif}label{display:grid;gap:7px;margin:16px 0;font-size:14px}input,select{width:100%;padding:11px;border:1px solid var(--divider-color,#888);border-radius:8px;background:var(--card-background-color);color:inherit;font-size:16px;box-sizing:border-box}.check{display:flex;align-items:center;gap:9px}.check input{width:auto}small{color:var(--secondary-text-color);font-size:12px}.shortcut{padding:6px 0 18px;border-bottom:1px solid var(--divider-color,#888)}.shortcut h4{font-size:14px;font-weight:500;margin:10px 0}.shortcut-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px}.shortcut .wide{grid-column:1/-1}.shortcut label{min-width:0}.editor-button{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:10px 14px;color:inherit;background:var(--secondary-background-color,#8882);border:0;border-radius:10px;font:400 14px Roboto,Arial,sans-serif;margin-top:10px}.editor-button svg{width:20px;height:20px}.editor-button:disabled{opacity:.45}h3{font-size:16px;font-weight:500;margin-top:26px}@media(max-width:360px){.shortcut-fields{grid-template-columns:1fr}}</style>
      <label>Nome do card<input name="name" type="text"></label>
      <label>Aspirador<select name="entity"></select></label>
      <label>Sensor da bateria<select name="battery_entity"></select></label>
      <label>Sensor do tempo de limpeza<select name="cleaning_time_entity"></select></label>
      <label>Sensor do tempo dos mops<select name="mop_time_entity"></select></label>
      <label>Texto dos mops<input name="mop_label" type="text"></label>
      <label class="check"><input name="show_controls" type="checkbox">Mostrar controles</label>
      <label class="check"><input name="animation" type="checkbox">Animar o aspirador</label>
      <label class="check"><input name="sound" type="checkbox">Som de seleção nos botões</label>
      <label>Volume do som<input name="sound_volume" type="range" min="0" max="1" step="0.01"></label>
      <small>Sem sensor selecionado, o card usa os atributos do aspirador. Ajuste unidades e atributos pelo YAML quando necessário.</small>
      <h3>Botões personalizados</h3><div class="shortcut-list"></div><button type="button" class="editor-button add-shortcut cursor-interaction">${iconSVG("add")}Adicionar botão</button>`;
      for(const key of ["name","mop_label"]) this.shadowRoot.querySelector(`[name="${key}"]`).value=this._config[key] || (key === "name" ? "Aspirador Vivo" : "Mops · tempo restante");
      for(const key of ["show_controls","animation","sound"]) this.shadowRoot.querySelector(`[name="${key}"]`).checked=this._config[key] !== false;
      this.shadowRoot.querySelector('[name="sound_volume"]').value=clamp(number(this._config.sound_volume) ?? 0.18,0,1);
      this._fillOptions();
      this.shadowRoot.querySelectorAll("input,select").forEach(input=>input.addEventListener("change",()=> {
        const value=input.type === "checkbox" ? input.checked : input.name === "sound_volume" ? Number(input.value) : input.value;
        const config={...this._config,[input.name]:value};
        if(value === "") delete config[input.name];
        this._config=config;
        this.dispatchEvent(new CustomEvent("config-changed",{detail:{config},bubbles:true,composed:true}));
      }));
      this.shadowRoot.querySelector(".add-shortcut").addEventListener("click",()=>{
        const buttons=[...(this._config.custom_buttons || [])];
        if(buttons.length>=12) return;
        buttons.push({name:"Limpar cômodo",icon:"room",entity:""});
        this._config={...this._config,custom_buttons:buttons}; this._renderShortcuts(); this._emit();
      });
      this._renderShortcuts();
    }
    _emit() { this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:true,composed:true})); }
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
  if(!customElements.get(TYPE)) customElements.define(TYPE,AspiradorVivoCard);
  if(!customElements.get(TYPE+"-editor")) customElements.define(TYPE+"-editor",AspiradorVivoEditor);
  window.customCards=window.customCards || [];
  if(!window.customCards.some(card=>card.type === TYPE)) window.customCards.push({type:TYPE,name:"Aspirador Vivo",description:"Robô animado, bateria ao vivo, controles personalizados e som de seleção.",preview:true,getEntitySuggestion:(hass,entityId)=>entityId.startsWith("vacuum.") ? {entity:entityId} : null});
})();
