/* Standalone preview: all data and actions are simulated locally. */
(() => {
  const root=document.getElementById("aspirador-vivo-preview");
  if(!root) return;
  const card=root.querySelector("aspirador-vivo-card");
  const status=root.querySelector(".demo-state");
  const labels={docked:"Na base",cleaning:"Limpando",paused:"Pausado",returning:"Voltando à base",idle:"Parado",unavailable:"Indisponível",error:"Precisa de atenção"};
  let state="docked", battery=86, minutes=0, mopMinutes=28, returningTimer=null, startedAt=0, accumulated=0, fan="Padrão", notice="";
  const config={entity:"vacuum.demonstracao",name:"Aspirador Vivo",battery_entity:"sensor.demo_bateria",cleaning_time_entity:"sensor.demo_tempo",mop_time_entity:"sensor.demo_mops",custom_buttons:[
    {name:"Limpar sala",icon:"room",entity:"script.demo_sala"},
    {name:"Limpar cozinha",icon:"kitchen",entity:"script.demo_cozinha"},
    {name:"Limpar com mops",icon:"mop",entity:"script.demo_mops"}
  ]};
  card.setConfig(config);
  function publish() {
    const seconds=accumulated+(state === "cleaning" ? (Date.now()-startedAt)/1000 : 0);
    const elapsed=Math.floor(seconds/60);
    const values={
      "vacuum.demonstracao":{entity_id:"vacuum.demonstracao",state,attributes:{friendly_name:"Aspirador Vivo",supported_features:8192|4|8|16|32|512|1024,fan_speed:fan,fan_speed_list:["Silencioso","Padrão","Turbo"]}},
      "sensor.demo_bateria":{state:String(battery),attributes:{unit_of_measurement:"%"}},
      "sensor.demo_tempo":{state:String(minutes+elapsed),attributes:{unit_of_measurement:"min"}},
      "sensor.demo_mops":{state:String(Math.max(0,mopMinutes-elapsed)),attributes:{unit_of_measurement:"min"}},
      "script.demo_sala":{state:"off",attributes:{friendly_name:"Limpar sala"}},
      "script.demo_cozinha":{state:"off",attributes:{friendly_name:"Limpar cozinha"}},
      "script.demo_mops":{state:"off",attributes:{friendly_name:"Limpar com mops"}}
    };
    card.hass={states:values,services:{vacuum:{start:{},pause:{},stop:{},return_to_base:{},clean_spot:{},locate:{},set_fan_speed:{}},script:{turn_on:{}}},callService:async(domain,service,data)=> {
      if(domain === "script") {
        setState("cleaning");
        notice=data.entity_id === "script.demo_mops" ? "Mops · simulação" : data.entity_id === "script.demo_cozinha" ? "Cozinha · simulação" : "Sala · simulação";
        publish(); return;
      }
      if(service === "start" || service === "clean_spot") setState("cleaning");
      if(service === "pause") setState("paused");
      if(service === "stop") setState("idle");
      if(service === "return_to_base") setState("returning");
      if(service === "locate") {notice="Sinal sonoro simulado";publish();}
      if(service === "set_fan_speed") {fan=data.fan_speed;notice=`Potência · ${fan}`;publish();}
    }};
    status.textContent=notice || labels[state] || state;
  }
  function setState(next) {
    clearTimeout(returningTimer);
    notice="";
    if(state === "cleaning") accumulated+=(Date.now()-startedAt)/1000;
    if(next === "cleaning") {
      if(state === "docked") { accumulated=0; minutes=0; }
      startedAt=Date.now();
    }
    state=next;
    publish();
    if(next === "returning") returningTimer=setTimeout(()=>setState("docked"),2800);
  }
  const timer=setInterval(()=> {
    if(state === "cleaning") { battery=Math.max(15,battery-1); publish(); }
    else if(state === "docked" && battery<100) { battery=Math.min(100,battery+1); publish(); }
    if(!root.isConnected) {clearInterval(timer);clearTimeout(returningTimer);}
  },7000);
  publish();
})();
