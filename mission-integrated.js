/* Integrated mission operations — development candidate; educational abstractions. */
(() => {
"use strict";
const prior={update,hud,objectiveBlocker,openExpedition,expeditionButtons,markSpecialPad,openLocationGallery,missionOverlay};
const panel=document.createElement('section');
panel.id='integratedMission'; panel.hidden=true; panel.setAttribute('aria-label','Live mission operations');
panel.innerHTML='<div class="im-top"><div><small id="im-tag"></small><strong id="im-title"></strong></div><span id="im-state"></span></div><p id="im-copy"></p><div class="im-meter"><i id="im-fill"></i></div><div class="im-controls"><div id="im-dpad" hidden><button data-im="up" aria-label="Forward">↑</button><button data-im="left" aria-label="Left">←</button><button data-im="down" aria-label="Backward">↓</button><button data-im="right" aria-label="Right">→</button></div><button class="primary" id="im-action"></button><button id="im-extra" hidden></button></div><small id="im-hint"></small>';
document.querySelector('.scene').after(panel);
const css=document.createElement('style');
css.textContent='#integratedMission[hidden],#integratedMission [hidden]{display:none!important}#integratedMission{margin:8px 0 10px;padding:12px 14px;border:1px solid #43616f;border-radius:12px;background:linear-gradient(120deg,#152a38,#192734);color:#e8f4f5;box-shadow:0 6px 18px #08131c33}#integratedMission[data-alert="true"]{border-color:#ffaf73;background:linear-gradient(120deg,#38282b,#1c2b37)}.im-top{display:flex;justify-content:space-between;align-items:center;gap:10px}.im-top small{display:block;color:#9cbdc8;font:700 10px system-ui;letter-spacing:.14em}.im-top strong{display:block;margin-top:4px;font-size:17px}.im-top span{font:700 11px system-ui;color:#9eeac8;border:1px solid #496c69;border-radius:999px;padding:5px 8px;text-align:center}.im-top span[data-warning="true"]{color:#ffc395;border-color:#c7845b}#im-copy{font-size:13px;line-height:1.45;margin:8px 0;color:#d3e4e8}.im-meter{height:5px;background:#0d1b25;border-radius:5px;overflow:hidden}.im-meter i{display:block;height:100%;background:linear-gradient(90deg,#5abcae,#adf2c7);transition:width .2s}.im-controls{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin:9px 0 6px}.im-controls button{min-height:40px;touch-action:none}.im-controls #im-dpad{display:flex;gap:4px}.im-controls #im-dpad button{min-width:40px;padding:4px 8px}#im-hint{display:block;color:#a4bdc8;font-size:11px;line-height:1.35}@media(max-width:580px){#integratedMission{padding:10px}.im-top strong{font-size:15px}.im-controls button{min-height:44px}.im-controls #im-dpad button{min-width:44px}}';
document.head.append(css);
const el=id=>document.getElementById(id);
const held=new Set();
let action='',extra='',sceneRef=null,rig=null,lastStage=null;
const active=()=>view==='play'&&!briefPhase&&w?.missionPhase==='build'&&!sortie&&!inside;
const stageEligible=()=>m?.id==='iss'||m?.id==='tranquility';
function state(){
 if(!w||!stageEligible())return null;
 if(!w.integratedOps)w.integratedOps=m.id==='iss'?{kind:'iss',storm:'waiting',time:0,retryAt:0,exposure:0,sheltered:false,dock:'waiting',dx:4.25,dz:1.65,faultLine:0,supply:false}:{kind:'moon',phase:'ready',x:-2.8,z:2.65,h:1.55,vy:0,foot:0,fuel:100,stepDone:false,rover:'waiting',rx:0,rz:2.8,heading:0,sample:false,roverDone:false};
 return w.integratedOps;
}
function log(name,details={}){emit(w,name,details);}
function sayNow(msg){say(msg,7);sound('clear');}
function completeStorm(s){s.storm='done';s.time=0;score(w,2);log('TRAINING_SOLAR_SHELTER_COMPLETE',{exposureIndex:s.exposure});sayNow('Crew protected. Resume construction and prepare for the cargo rendezvous.');}
function updateISS(s,dt){
 if(!clockArmed)return;
 const built=count(w,'solar')+count(w,'battery')+count(w,'oxygen')+count(w,'water');
 if(s.storm==='waiting'&&(built>=1||gameSeconds>=25)||s.storm==='missed'&&gameSeconds>=s.retryAt){s.storm='warning';s.time=10;s.sheltered=false;log('TRAINING_SOLAR_ALERT');say('Solar particle alert. Send the crew to the protected compartment.',8);sound('alert');}
 if(s.storm==='warning'){s.time-=dt;if(s.time<=0){s.storm='active';s.time=6;log('TRAINING_SOLAR_STORM');}}
 else if(s.storm==='active'){s.time-=dt;if(!s.sheltered)s.exposure=Math.min(100,s.exposure+dt*8);
  if(s.time<=0){if(s.sheltered)completeStorm(s);else{s.storm='missed';s.retryAt=gameSeconds+12;score(w,-2);log('TRAINING_SOLAR_SHELTER_MISSED');say('Shelter was missed. Prepare for a repeat training alert.',7);}}}
 if(s.storm==='done'&&s.dock==='waiting'&&count(w,'solar')&&count(w,'battery')){s.dock='fault';s.faultLine=w.lines;log('TRAINING_DRAGON_FAULT');say('Dragon alignment sensor fault. Clear a cargo row to deliver repair parts.',9);}
 if(s.dock==='approach'&&s.storm==='done'){const x=Number(held.has('right'))-Number(held.has('left')),z=Number(held.has('down'))-Number(held.has('up'));s.dx=clamp(s.dx+x*dt*1.65,.86,5.5);s.dz=clamp(s.dz+z*dt*1.65,-2.9,2.9);}
}
function lunarMotion(s,dt){
 const x=Number(held.has('right'))-Number(held.has('left')),z=Number(held.has('down'))-Number(held.has('up')),n=Math.hypot(x,z);
 if(s.phase==='ladder'){
  if(held.has('down'))s.h=Math.max(0,s.h-dt*.7);
  if(s.h<=.001){s.h=0;s.phase='out';s.x=-2.1;log('TRAINING_LUNAR_FIRST_STEP');sayNow('First step! Use gentle hops to reach the marked instrument.');}
 }else if(s.phase==='out'||s.phase==='return'){
  if(n){s.x=clamp(s.x+x/n*dt*1.65,-6,6);s.z=clamp(s.z+z/n*dt*1.65,-4,5);s.heading=Math.atan2(x,z);
   if(s.h<=.02&&s.vy<=0)s.vy=1.05;}
  if(s.h>0||s.vy>0){s.vy-=1.62*dt;s.h=Math.max(0,s.h+s.vy*dt);if(s.h===0){s.vy=0;s.foot++;}}
  if(s.h>2.7){s.h=2.7;s.vy=Math.min(0,s.vy);}
 }
 if(s.rover==='out'||s.rover==='return'){
  if(n){s.rx=clamp(s.rx+x/n*dt*2.5,-6,6);s.rz=clamp(s.rz+z/n*dt*2.5,-4,5);s.heading=Math.atan2(x,z);}
 }
}
const near=(x,z,a,b,r=.85)=>Math.hypot(x-a,z-b)<r;
function controls(which){
 if(!active()||!stageEligible())return;
 const s=state(); if(!s)return;
 clockArmed=true;
 if(which==='shelter'&&(s.storm==='warning'||s.storm==='active')){s.sheltered=true;held.clear();log('TRAINING_CREW_SHELTERED');sound('clear');}
 else if(which==='repair'&&s.dock==='fault'&&w.lines>s.faultLine){s.dock='approach';log('TRAINING_DRAGON_REPAIRED',{cargoRows:w.lines-s.faultLine});sayNow('Sensor restored. Guide Dragon to the green capture ring.');}
 else if(which==='capture'&&s.dock==='approach'&&s.dx<1.02&&Math.abs(s.dz)<.28){s.dock='docked';s.dx=.86;s.dz=0;held.clear();score(w,2);s.supply=true;w.resources.oxygen=Math.min(oxygenCapacity(w,m),w.resources.oxygen+.025);log('TRAINING_DRAGON_DOCKED');sayNow('Capture complete. Training oxygen resupply transferred to the station.');}
 else if(which==='start'&&s.phase==='ready'){s.phase='ladder';s.h=1.55;s.x=-2.8;s.z=2.65;s.vy=0;held.clear();log('TRAINING_LUNAR_EVA_STARTED');sound('clear');}
 else if(which==='hop'&&['out','return'].includes(s.phase)&&s.h<.05){s.vy=2.55;s.h=.025;sound('click');}
 else if(which==='assist'&&['out','return'].includes(s.phase)&&s.h>.10&&s.fuel>=10){s.fuel-=10;s.vy=-1.7;log('TRAINING_FICTIONAL_HOP_ASSIST');sound('click');}
 else if(which==='instrument'&&s.phase==='out'&&near(s.x,s.z,2.7,-1.5)&&s.h<.25){s.phase='return';score(w,2);log('TRAINING_LUNAR_INSTRUMENT_DEPLOYED');sayNow('Instrument deployed. Return to the lander.');}
 else if(which==='evaReturn'&&s.phase==='return'&&near(s.x,s.z,-2.1,2.65)&&s.h<.25){s.phase='done';s.stepDone=true;held.clear();log('TRAINING_LUNAR_EVA_RETURNED');sound('clear');}
 else if(which==='rover'&&s.stepDone&&s.rover==='waiting'){s.rover='out';s.rx=0;s.rz=2.8;held.clear();log('TRAINING_LUNAR_ROVER_STARTED');sayNow('Drive to the green sampling target and collect a simulated core.');}
 else if(which==='sample'&&s.rover==='out'&&near(s.rx,s.rz,-4.5,-2.1)){s.rover='return';s.sample=true;log('TRAINING_LUNAR_SAMPLE_COLLECTED');sayNow('Sample sealed. Drive back to the base.');}
 else if(which==='unload'&&s.rover==='return'&&near(s.rx,s.rz,0,2.8)){s.rover='done';s.roverDone=true;held.clear();score(w,3);w.lunarReturns||=[];if(!w.lunarReturns.includes('integrated'))w.lunarReturns.push('integrated');log('TRAINING_LUNAR_SAMPLE_RETURNED');sayNow('Sample returned. Finish the greenhouse and habitat systems.');}
 sync();
}
function setText(id,t){const e=el(id);if(e.textContent!==t)e.textContent=t;}
function sync(){
 const s=state();panel.hidden=!active()||!s;if(panel.hidden){held.clear();return;}
 let title,copy,status,pct=0,warning=false,move=false,btn='',key='',disabled=false,ex='',exkey='',exdisabled=false,hint='';
 if(s.kind==='iss'){
  setText('im-tag','ISS · LIVE MISSION OBJECTIVES');
  if(s.storm==='waiting'){title='Build & prepare';copy='Keep clearing Tetris cargo. A solar particle alert can interrupt construction.';status='STANDBY';pct=10;}
  else if(s.storm==='warning'||s.storm==='active'){warning=true;title=s.storm==='warning'?'Solar particle storm warning':'Solar particle storm passing';status=Math.ceil(Math.max(0,s.time))+' s';copy=s.sheltered?'Crew is sheltered. Keep the station systems running.':'Move the crew into the protected compartment before the training exposure rises.';btn=s.sheltered?'Crew sheltered ✓':'Send crew to shelter';key='shelter';disabled=s.sheltered;pct=40;hint='Training alert and exposure index; not a forecast or flight procedure.';}
  else if(s.storm==='missed'){warning=true;title='Recovery drill';status='RETRY';copy='Exposure increased because the shelter was missed. A new warning will arrive automatically.';pct=25;}
  else if(s.dock==='waiting'){title='Prepare for Dragon';status='SHELTER ✓';copy='Install the solar wing and battery using the cargo puzzle to start the rendezvous.';pct=55;}
  else if(s.dock==='fault'){title='Dragon sensor fault';status='REPAIR';copy='Clear one more Tetris cargo row to deliver the replacement sensor.';btn='Install repair part';key='repair';disabled=w.lines<=s.faultLine;pct=65;}
  else if(s.dock==='approach'){title='Dragon docking';status='ALIGN';move=true;copy='Guide the miniature capsule to the glowing green capture ring in the station scene.';btn='Capture & transfer supplies';key='capture';disabled=s.dx>=1.02||Math.abs(s.dz)>=.28;pct=78;hint='WASD or touch controls move Dragon. Arrows operate the puzzle when its board is focused.';}
  else{title='Crew operations complete';status='COMPLETE ✓';copy='Solar shelter and Dragon docking are complete. Finish any remaining Tetris systems.';pct=100;}
 }else{
  setText('im-tag','SEA OF TRANQUILITY · LIVE EXPEDITION');
  if(s.phase==='ready'){title='First steps';status='READY';copy='Descend the lunar module ladder, deploy the instrument, and return. Construction continues in this same mission.';btn='Begin lunar EVA';key='start';pct=10;}
  else if(s.phase==='ladder'){title='Descend the lander';status='EVA';copy='Hold ↓ to climb down the ladder. Your astronaut moves in the actual 3D lunar scene.';move=true;pct=15;hint='WASD or touch controls. The puzzle keeps its own controls.';}
  else if(s.phase==='out'||s.phase==='return'){const back=s.phase==='return';title=back?'Return to the lander':'Deploy surface instrument';status='EVA · '+Math.round(s.fuel)+'% assist';copy=back?'Follow the pulsing green marker back to the ladder.':'Hop and steer to the green instrument marker.';move=true;btn=back?'Confirm safe return':'Deploy instrument';key=back?'evaReturn':'instrument';disabled=!(back?near(s.x,s.z,-2.1,2.65):near(s.x,s.z,2.7,-1.5))||s.h>=.25;ex=s.h>.1?'Use hop assist':'Hop';exkey=s.h>.1?'assist':'hop';exdisabled=s.h>.1&&s.fuel<10;pct=back?45:30;hint='Low-gravity game physics. Hop assist is fictional; Apollo suits did not have this feature.';}
  else if(s.rover==='waiting'){title='Lunar rover sampling';status='EVA ✓';copy='Drive the rover to a nearby sample site and bring the core back to the habitat.';btn='Board rover';key='rover';pct=55;}
  else if(s.rover==='out'||s.rover==='return'){const back=s.rover==='return';title=back?'Return simulated core':'Drive to sampling target';status=back?'CORE SEALED':'ROVER';copy=back?'Drive back to the lit base marker to unload.':'Follow the green target ring and collect a simulated sample.';move=true;btn=back?'Unload sample':'Collect core';key=back?'unload':'sample';disabled=!(back?near(s.rx,s.rz,0,2.8):near(s.rx,s.rz,-4.5,-2.1));pct=back?85:68;hint='WASD / arrows when the scene controls are focused / touch. Fictional training traverse.';}
  else{title='Lunar expeditions complete';status='COMPLETE ✓';copy='Astronaut and rover have returned. Finish the habitat and greenhouse systems.';pct=100;}
 }
 panel.dataset.alert=String(warning);el('im-state').dataset.warning=String(warning);
 setText('im-title',title);setText('im-copy',copy);setText('im-state',status);setText('im-hint',hint);
 el('im-fill').style.width=pct+'%';el('im-dpad').hidden=!move;
 const a=el('im-action'),b=el('im-extra');a.hidden=!btn;b.hidden=!ex;a.disabled=disabled;b.disabled=exdisabled;
 if(btn)setText('im-action',btn);if(ex)setText('im-extra',ex);action=key;extra=exkey;
}
el('im-action').onclick=()=>controls(action);el('im-extra').onclick=()=>controls(extra);
for(const b of panel.querySelectorAll('[data-im]')){
 const key=b.dataset.im;
 b.addEventListener('pointerdown',e=>{e.preventDefault();b.focus({preventScroll:true});held.add(key);try{b.setPointerCapture(e.pointerId)}catch{}});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>held.delete(key));
 b.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();held.add(key);}});
 b.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();held.delete(key);}});
}
const keymap={KeyW:'up',KeyA:'left',KeyS:'down',KeyD:'right',ArrowUp:'up',ArrowLeft:'left',ArrowDown:'down',ArrowRight:'right'};
function keyDown(e){if(panel.hidden||el('im-dpad').hidden||e.altKey||e.ctrlKey||e.metaKey||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
 const k=keymap[e.code];if(!k)return;if(e.code.startsWith('Arrow')&&!panel.contains(document.activeElement)&&document.activeElement!==el('viewport'))return;
 e.preventDefault();e.stopImmediatePropagation();held.add(k);}
window.addEventListener('keydown',keyDown,true);
window.addEventListener('keyup',e=>{const k=keymap[e.code];if(k)held.delete(k);},true);
window.addEventListener('blur',()=>held.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)held.clear();});
function ring(p,r=.55){const g=group(p);const o=mesh(g,new THREE.TorusGeometry(r,.035,10,64),'#8dffd0',0,0,0,{emissive:'#39eaa2',emissiveIntensity:1.2});o.rotation.x=Math.PI/2;return g;}
function dragon(p){
 const g=group(p);tube(g,0,0,0,.39,1.12,'#e3e7e7',.47).rotation.z=Math.PI/2;
 tube(g,-.68,0,0,.27,.26,'#b7c7cc',.38).rotation.z=Math.PI/2;
 tube(g,.62,0,0,.39,.42,'#475b66',.48).rotation.z=Math.PI/2;
 for(let i=0;i<24;i++){const a=i*Math.PI/12;const o=cub(g,.65,Math.cos(a)*.41,Math.sin(a)*.41,.36,.15,.035,i%2?'#294760':'#355a79',{metalness:.45});o.rotation.x=a;}
 for(const z of [-.26,.26]){ball(g,-.27,.31,z,.105,'#183644',{metalness:.7,roughness:.24});cub(g,.12,.40,z,.16,.026,.1,'#34444a');}
 for(const z of [-.28,.28])for(const y of [-.27,.27]){tube(g,.43,y,z,.07,.19,'#222b31').rotation.z=Math.PI/2;}
 return g;
}
function lander(p){
 const g=group(p,-2.8,terrainY(-2.8,2.65),2.65);
 const base=tube(g,0,.56,0,.72,.42,'#b88e43',.82);
 cub(g,0,.88,0,1.12,.26,1.12,'#dfb860');cub(g,0,1.26,0,.92,.7,.91,'#b9c0bc');
 cub(g,0,1.62,0,.63,.24,.66,'#c9ceca');for(const x of [-.25,.25])cub(g,x,1.35,.47,.25,.26,.06,'#263f4b',{metalness:.5});
 for(const x of [-1,1])for(const z of [-1,1]){strut(g,[x*.48,.60,z*.48],[x*.92,.10,z*.92],.052,'#c2bda4');tube(g,x*.93,.055,z*.93,.21,.07,'#9ea39e');}
 for(const x of [-.17,.17])strut(g,[x,.16,.69],[x,1.49,.69],.025,'#bfc7c8');
 for(let i=0;i<10;i++)strut(g,[-.17,.21+i*.13,.69],[.17,.21+i*.13,.69],.019,'#bfc7c8');
 strut(g,[0,1.67,0],[0,2.07,0],.026,'#bfc7c8');ball(g,0,2.09,0,.13,'#d0d6cd');return g;
}
function rover(p){
 const g=group(p);
 cub(g,0,.48,0,.95,.26,.72,'#b5a786');cub(g,0,.65,-.10,.75,.15,.52,'#d4ccaa');cub(g,0,.86,-.24,.55,.34,.14,'#b4bdba');
 for(const x of [-.47,.47])for(const z of [-.42,.42]){const wheel=tube(g,x,.28,z,.23,.13,'#343c40');wheel.rotation.z=Math.PI/2;for(let i=0;i<10;i++){const a=i*Math.PI/5;const tread=cub(g,x,.28+.22*Math.cos(a),z+.22*Math.sin(a),.145,.045,.075,'#788084');tread.rotation.x=a;}}
 strut(g,[0,.7,.1],[.30,1.0,.28],.045,'#c1cec9');strut(g,[.30,1.0,.28],[.52,.65,.48],.035,'#aab8b6');cub(g,.52,.58,.48,.12,.23,.12,'#d6b565');
 strut(g,[-.28,.66,-.26],[-.28,1.38,-.26],.022,'#bbc7c5');ball(g,-.28,1.40,-.26,.09,'#d8aa63');return g;
}
function sceneVisual(){
 if(!stageEligible()||!w||!stage||inside||briefPhase||sortie)return;
 const s=state();if(!s)return;
 if(sceneRef!==stage||lastStage!==m.id){sceneRef=stage;lastStage=m.id;rig={};
  if(s.kind==='iss'){
   rig.dragon=dragon(stage);rig.marker=ring(stage,.36);rig.marker.rotation.z=Math.PI/2;
   rig.port=tube(stage,1.89,.85,0,.37,.15,'#7e9299');rig.port.rotation.z=Math.PI/2;
  }else{
   rig.lander=lander(stage);rig.marker=ring(stage,.55);rig.rover=rover(stage);const a=makeSuit(stage,true);a.tether.visible=false;a.load.visible=false;a.jets.visible=false;rig.actor=a;
   rig.instrument=group(stage,2.7,terrainY(2.7,-1.5),-1.5);cub(rig.instrument,0,.12,0,.38,.22,.38,'#d6b668');strut(rig.instrument,[0,.17,0],[0,.68,0],.025,'#b9c7c7');ball(rig.instrument,0,.69,0,.09,'#c7e9ec');
  }
 }
 const pulse=reduceMotion?1:1+.14*Math.sin(performance.now()/170);
 if(s.kind==='iss'){
  const on=s.dock==='fault'||s.dock==='approach'||s.dock==='docked';
  rig.dragon.visible=on;rig.port.visible=on;rig.dragon.position.set(1.89+s.dx,.85,s.dz);
  rig.marker.visible=s.dock==='approach';rig.marker.position.set(2.76,.85,0);rig.marker.scale.setScalar(pulse);
 }else{
  const eva=['ladder','out','return'].includes(s.phase);
  rig.actor.g.visible=eva;rig.actor.g.position.set(s.phase==='ladder'?-2.8:s.x,terrainY(s.x,s.z)+s.h,s.phase==='ladder'?3.34:s.z);
  rig.actor.g.rotation.y=s.heading||0;rig.actor.g.scale.setScalar(1.13);
  rig.actor.jets.visible=eva&&s.vy< -1.25&&s.h>.12;
  rig.rover.visible=s.stepDone;rig.rover.position.set(s.rx,terrainY(s.rx,s.rz),s.rz);rig.rover.rotation.y=s.heading||0;
  const t=s.phase==='out'?[2.7,-1.5]:s.phase==='return'?[-2.1,2.65]:s.rover==='out'?[-4.5,-2.1]:s.rover==='return'?[0,2.8]:null;
  rig.marker.visible=!!t;rig.instrument.visible=s.phase==='return'||s.phase==='done';
  if(t){rig.marker.position.set(t[0],terrainY(t[0],t[1])+.06,t[1]);rig.marker.scale.setScalar(pulse);}
 }
}
window.__astroIntegratedRender=sceneVisual;
function overlay(){
 prior.missionOverlay();
 if(!active()||m.id!=='iss')return;
 const s=state();if(s?.storm!=='active'&&s?.storm!=='warning')return;
 const c=el('worldFX').getContext('2d'),W=c.canvas.width,H=c.canvas.height,t=performance.now()/1000;
 c.save();const opacity=s.storm==='active'?.24:.07;let glow=c.createLinearGradient(0,0,W,H);glow.addColorStop(0,'rgba(255,113,45,'+opacity+')');glow.addColorStop(.7,'rgba(255,173,79,0)');c.fillStyle=glow;c.fillRect(0,0,W,H);
 if(!reduceMotion&&s.storm==='active'){for(let i=0;i<58;i++){const x=((i*73+t*(95+i%5*35))%(W+200))-100,y=(i*41.33+t*22)%H;c.strokeStyle='rgba(255,180,92,'+(.12+i%5*.065)+')';c.lineWidth=1+i%3*.45;c.beginPath();c.moveTo(x,y);c.lineTo(x-26-i%5*9,y-8);c.stroke();}}
 c.restore();
}
missionOverlay=overlay;
update=function(dt){
 if(active()&&stageEligible()&&!paused&&!el('modal').open){const s=state();if(s.kind==='iss')updateISS(s,dt);else lunarMotion(s,dt);}
 prior.update(dt);
};
hud=function(){prior.hud();sync();};
objectiveBlocker=function(){const s=state();if(s){if(s.kind==='iss'){if(s.storm!=='done')return 'Complete the solar particle shelter drill.';if(s.dock!=='docked')return 'Repair and dock Dragon after the solar drill.';}else{if(!s.stepDone)return 'Complete the lunar first-steps expedition and return.';if(!s.roverDone)return 'Return a lunar rover sample to base.';}}return prior.objectiveBlocker();};
openExpedition=function(key){if(m.id==='tranquility'&&['lunar','lunarsample'].includes(key)){if(!active())return;panel.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'nearest'});if(key==='lunar'&&state().phase==='ready')controls('start');else if(key==='lunarsample'&&state().stepDone&&state().rover==='waiting')controls('rover');return;}return prior.openExpedition(key);};
expeditionButtons=function(){prior.expeditionButtons();if(m.id==='tranquility'){for(const b of el('specialMissions').querySelectorAll('[data-expedition="lunar"],[data-expedition="lunarsample"]'))b.hidden=true;}};
markSpecialPad=function(labels){if(m.id==='tranquility')return;return prior.markSpecialPad(labels);};
openLocationGallery=function(reuse=false){prior.openLocationGallery(reuse);const b=el('firstStepsLearn');if(b){const section=b.closest('section');if(section)section.remove();}};
})();
