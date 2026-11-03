"use strict";
// DooT Escape: self-contained fixed-step Canvas platformer. No dependencies or networking.
(() => {
const $ = id => document.getElementById(id);
const canvas = $("gameCanvas");
const ctx = canvas.getContext("2d");
const soundtrack = window.DootMusic; // Loaded before game.js, optional for isolated tests.
function updateMusicUI() {
 if (!soundtrack?.supported) return;
 const active=!!soundtrack.isPlaying();
 const enabled=!!soundtrack?.enabled();
 $("musicGame").setAttribute("aria-pressed", String(active));
 $("musicGame").textContent=active ? "⏸ Doot Song playing" : "♫ Doot Song off";
 $("musicPreview").setAttribute("aria-pressed", String(active));
 $("musicPreview").textContent=active ? "⏸ Stop Doot Song" : "▶ Hear the Doot Song";
 if (enabled && !active) $("musicGame").textContent="▶ Resume Doot Song";
}
if(!ctx) { $("gameMessage").textContent="Canvas is unavailable in this browser.";return; }
const W=960,H=480,WORLD=3320,GRAVITY=1750,SPEED=340,JUMP=-700,STEP=1/60;
const ground=[
 {x:0,y:416,w:850,h:64},{x:938,y:416,w:850,h:64},
 {x:1878,y:416,w:852,h:64},{x:2820,y:416,w:500,h:64}
];
const steps=[
 {x:235,y:323,w:155,h:18},{x:594,y:296,w:160,h:18},
 {x:1105,y:315,w:156,h:18},{x:1450,y:290,w:175,h:18},
 {x:2025,y:317,w:155,h:18},{x:2400,y:291,w:160,h:18},
 {x:2800,y:322,w:168,h:18}
];
const platforms=ground.concat(steps);
const tokenLayouts=[
 [182,369],[308,277],[670,251],[985,369],[1174,270],[1499,244],
 [1680,369],[2095,271],[2460,245],[2855,277],[3010,369]
];
const foeLayouts=[
 [494,385,50,1.8],[1230,385,55,1.6],[1652,385,65,1.3],
 [2215,385,65,1.7],[2624,385,53,2.1],[3070,385,46,1.5]
];
const skyStars=Array.from({length:68},(_,i)=>({
 x:((i*941+117)%998)/998*W,
 y:((i*353+31)%317),
 size:1+(i%3===0?1:0)
}));
const input={left:false,right:false,jump:false,jumpBuffer:0};
const state={
 mode:"ready",player:{x:75,y:300,w:28,h:38,vx:0,vy:0,onGround:false,coyote:0,invulnerable:0},
 tokens:[],lives:3,collected:0,seconds:0,elapsed:0,camera:0,checkpoint:75,
 animation:0,lastTime:0,accumulator:0,sound:false,audio:null,messageTimer:0
};
let lastHud=-1;
function reset(){
 state.player={x:75,y:280,w:28,h:38,vx:0,vy:0,onGround:false,coyote:0,invulnerable:0};
 state.tokens=tokenLayouts.map((p,i)=>({x:p[0],y:p[1],got:false,id:i}));
 state.lives=3;state.collected=0;state.seconds=0;state.elapsed=0;state.camera=0;
 state.checkpoint=75;state.messageTimer=0;state.accumulator=0;
 input.left=false;input.right=false;input.jump=false;input.jumpBuffer=0;
 updateHud(true);
}
function updateHud(force){
 const tick=Math.floor(state.seconds*4);
 if(!force&&tick===lastHud)return;
 lastHud=tick;
 $("coinCount").textContent=String(state.collected)+" / 7";
 $("lifeCount").textContent="♥ ".repeat(state.lives).trim() || "—";
 const sec=Math.floor(state.seconds);$("gameTime").textContent=Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0");
}
function showOverlay(kicker,title,description,buttonLabel){
 $("overlayKicker").textContent=kicker;$("overlayTitle").textContent=title;
 $("overlayDescription").textContent=description;$("gameStart").textContent=buttonLabel;
 $("gameOverlay").hidden=false;
}
function start(){
 if(state.mode==="running")return;
 if(state.mode==="ready"||state.mode==="lost"||state.mode==="won")reset();
 state.mode="running";$("gameOverlay").hidden=true;
 if(soundtrack?.enabled() && !soundtrack.isPlaying()) {
   Promise.resolve(soundtrack.play()).then(updateMusicUI).catch(updateMusicUI);
 }
 $("gameMessage").textContent="DooT is very upset about your progress. Excellent.";
 canvas.focus?.({preventScroll:true});
}
function pause(){
 if(state.mode!=="running")return;
 state.mode="paused";soundtrack?.pause();updateMusicUI();input.left=false;input.right=false;input.jump=false;input.jumpBuffer=0;
 showOverlay("HAPPILY UNINTERRUPTED","Paused. Beautiful silence.","Even DooT cannot interrupt a paused game. Press Resume to continue.","▶ Resume escape");
}
function restart(){
 soundtrack?.pause();updateMusicUI();
 reset();state.mode="ready";
 showOverlay("RESTART REQUEST ACCEPTED","You have one job.","Collect seven quiet tokens and reach UNSUBSCRIBE while dodging unsolicited notifications.","▶ Start escaping");
 $("gameMessage").textContent="Fresh start. No progress data is stored.";
}
function finish(win){
 state.mode=win?"won":"lost";soundtrack?.pause();updateMusicUI();input.left=input.right=input.jump=false;
 if(win){
  showOverlay("CONGRATULATIONS: BOUNDARIES ESTABLISHED","YOU UNSUBSCRIBED!","You collected "+state.collected+" quiet tokens in "+Math.floor(state.seconds)+" seconds. DooT has been assigned to a very distant server farm.","↻ Play again");
  $("gameMessage").textContent="Achievement: a notification-free existence. Outstanding.";
  blip(660);blip(990);
 } else {
  showOverlay("URGENT PERSONAL NOTIFICATION","DOOT GOT YOU.","Three unsolicited alerts. Your inbox was never actually touched. Try escaping again.","↻ Try again");
  $("gameMessage").textContent="Game over. Your actual privacy remains unaffected.";
  blip(140);
 }
}
function blip(frequency) {
 if(!state.sound)return;
 try{
  const Constructor=window.AudioContext||window.webkitAudioContext;
  if(!Constructor)return;
  if(!state.audio)state.audio=new Constructor();
  if(state.audio.state==="suspended")state.audio.resume();
  const o=state.audio.createOscillator(),g=state.audio.createGain(),t=state.audio.currentTime;
  o.type="square";o.frequency.setValueAtTime(frequency,t);
  g.gain.setValueAtTime(.025,t);g.gain.exponentialRampToValueAtTime(.0001,t+.095);
  o.connect(g).connect(state.audio.destination);o.start(t);o.stop(t+.1);
 }catch(_err){state.sound=false;$("muteGame").textContent="🔇 Sound off";}
}
function hit(){
 const p=state.player;if(p.invulnerable>0||state.mode!=="running")return;
 state.lives--;blip(150);
 if(state.lives<=0){finish(false);return;}
 p.x=state.checkpoint;p.y=240;p.vx=0;p.vy=0;p.invulnerable=1.5;p.onGround=false;
 $("gameMessage").textContent="A notification hit you! "+state.lives+" lives remaining. Sent back to the last checkpoint.";
 updateHud(true);
}
function overlap(a,b){return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;}
function enemyBox(def){
 return {x:def[0]+Math.sin(state.elapsed*def[3])*def[2]-16,y:def[1]-17,w:32,h:33};
}
function update(dt){
 const p=state.player;state.elapsed+=dt;state.seconds+=dt;
 p.invulnerable=Math.max(0,p.invulnerable-dt);
 p.coyote=p.onGround?.085:Math.max(0,p.coyote-dt);
 input.jumpBuffer=Math.max(0,input.jumpBuffer-dt);
 if(input.jump && input.jumpBuffer===0 && p.onGround)input.jumpBuffer=.12;
 const direction=Number(input.right)-Number(input.left);
 p.vx=direction*SPEED;
 if(input.jumpBuffer>0 && p.coyote>0){
  p.vy=JUMP;p.onGround=false;p.coyote=0;input.jumpBuffer=0;blip(340);
 }
 const oldBottom=p.y+p.h;
 p.x=Math.max(0,Math.min(WORLD-p.w,p.x+p.vx*dt));
 p.vy=Math.min(1250,p.vy+GRAVITY*dt);p.y+=p.vy*dt;
 p.onGround=false;
 if(p.vy>=0){
  let landing=Infinity;
  for(const plat of platforms){
   if(p.x+p.w<=plat.x+4||p.x>=plat.x+plat.w-4)continue;
   if(oldBottom<=plat.y+4 && p.y+p.h>=plat.y && plat.y<landing)landing=plat.y;
  }
  if(landing!==Infinity){p.y=landing-p.h;p.vy=0;p.onGround=true;}
 }
 if(p.y>H+90){hit();if(state.mode!=="running")return;}
 if(p.x>1160 && state.checkpoint<1150) {state.checkpoint=1190;$("gameMessage").textContent="Checkpoint saved in memory (only until you reload).";}
 if(p.x>2140 && state.checkpoint<2100) {state.checkpoint=2190;$("gameMessage").textContent="Second checkpoint. DooT is writing a complaint.";}
 for(const t of state.tokens){
  if(!t.got && Math.hypot(p.x+p.w/2-t.x,p.y+p.h/2-t.y)<30){
   t.got=true;state.collected++;blip(730);updateHud(true);
   if(state.collected===7)$("gameMessage").textContent="Seven quiet tokens! Reach the giant UNSUBSCRIBE door!";
  }
 }
 for(const e of foeLayouts){
  if(overlap(p,enemyBox(e))){hit();break;}
 }
 if(state.mode!=="running")return;
 if(p.x+p.w>3144 && p.y+p.h>315){
  if(state.collected>=7)finish(true);
  else if(state.messageTimer<=0){
   $("gameMessage").textContent="UNSUBSCRIBE requires "+(7-state.collected)+" more quiet token(s). Keep collecting!";
   state.messageTimer=1.7;
  }
 }
 state.messageTimer=Math.max(0,state.messageTimer-dt);
 const target=Math.max(0,Math.min(WORLD-W,p.x-280));
 state.camera+=Math.min(1,dt*8)*(target-state.camera);
 updateHud(false);
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function round(x,y,w,h,r,color){
 ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
}
function background(){
 const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,"#0c1128");grad.addColorStop(1,"#24204c");
 rect(0,0,W,H,grad);
 const shift=state.camera;
 for(const star of skyStars){
  const x=((star.x-shift*.09)%W+W)%W;
  rect(x,star.y,star.size,star.size,"#c3a8f377");
 }
 // Parallax city: buildings and window lights, repeated deterministically.
 for(let i=0;i<32;i++){
  const x=(i*137-shift*.22)%(W+180);
  const bx=x< -130?x+W+180:x;
  const height=85+(i*47)%170;
  rect(bx,H-66-height,93,height,"#212344");
  for(let j=0;j<5;j++)for(let k=0;k<8;k++){
   if((i*7+j*13+k*11)%4===0)rect(bx+12+j*15,H-58-height+k*17,5,8,"#c97ef34a");
  }
 }
 ctx.strokeStyle="#a2a8fc13";ctx.lineWidth=1;
 const off=-(shift*.5%45);
 for(let x=off;x<W;x+=45){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
 for(let y=30;y<H;y+=45){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
 rect(0,449,W,31,"#0b0d1c");
}
function drawPlatforms(){
 for(const p of platforms){
  const x=p.x-state.camera;
  if(x>W+10||x+p.w< -10)continue;
  rect(x,p.y,p.w,p.h,"#252e4f");
  rect(x,p.y,p.w,5,"#74e8d4");
  rect(x,p.y+7,p.w,3,"#3c5073");
  ctx.strokeStyle="#9cbff133";ctx.lineWidth=1;
  for(let d=13;d<p.w;d+=28){ctx.beginPath();ctx.moveTo(x+d,p.y+13);ctx.lineTo(x+d+10,p.y+22);ctx.stroke();}
 }
}
function drawTokens(){
 for(const t of state.tokens){
  if(t.got)continue;
  const x=t.x-state.camera,y=t.y+Math.sin(state.elapsed*4+t.id)*4;
  if(x< -20||x>W+20)continue;
  ctx.save();ctx.shadowColor="#b2ff9e";ctx.shadowBlur=13;
  ctx.fillStyle="#b9ff8d";ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fill();
  ctx.restore();
  ctx.fillStyle="#1b3442";ctx.font="bold 15px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("✓",x,y);ctx.textBaseline="alphabetic";
 }
}
function drawEnemies(){
 for(const e of foeLayouts){
  const b=enemyBox(e),x=b.x-state.camera;
  if(x< -50||x>W+50)continue;
  ctx.save();ctx.shadowColor="#ff637f";ctx.shadowBlur=14;
  round(x,b.y,b.w,b.h,6,"#ff647f");ctx.restore();
  rect(x+4,b.y+7,24,4,"#712346");
  ctx.fillStyle="#fff";ctx.font="bold 17px system-ui";ctx.textAlign="center";
  ctx.fillText("!",x+16,b.y+26);
 }
}
function drawPlayer(){
 const p=state.player,x=p.x-state.camera,y=p.y;
 if(p.invulnerable>0&&Math.floor(state.elapsed*12)%2===0)return;
 ctx.save();ctx.shadowColor="#a484ff";ctx.shadowBlur=18;
 round(x,y,p.w,p.h,8,"#a781ff");ctx.restore();
 rect(x+5,y+9,p.w-10,10,"#202646");
 rect(x+17,y+12,5,5,"#9bffbd");
 rect(x+4,y+29,7,8,"#6951b0");rect(x+17,y+29,7,8,"#6951b0");
 if(Math.abs(p.vx)>0 && p.onGround){
  ctx.fillStyle="#b4faff";ctx.fillRect(x+(p.vx>0?-6:30),y+31,5,3);
 }
}
function drawDoor(){
 const x=3125-state.camera;
 if(x< -100||x>W+100)return;
 ctx.save();ctx.shadowColor="#8fffc4";ctx.shadowBlur=20;
 round(x,292,82,124,12,"#1c4a53");ctx.restore();
 round(x+7,300,68,111,7,"#14333f");
 rect(x+18,320,47,5,"#a8ffd9");
 ctx.fillStyle="#baffd7";ctx.textAlign="center";ctx.font="bold 10px monospace";
 ctx.fillText("UNSUBSCRIBE",x+41,341);ctx.font="bold 25px monospace";ctx.fillText("⇢",x+41,376);
}
function drawMarkers(){
 const points=[{x:1160,label:"CHECKPOINT"},{x:2140,label:"CHECKPOINT"}];
 for(const p of points){
  const x=p.x-state.camera;if(x< -100||x>W+90)continue;
  ctx.strokeStyle="#ffd397";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,416);ctx.lineTo(x,338);ctx.stroke();
  rect(x,337,78,22,"#51324c");
  ctx.font="bold 10px monospace";ctx.fillStyle="#ffe2a8";ctx.textAlign="left";ctx.fillText(p.label,x+4,352);
 }
}
function draw(){
 background();
 ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
 drawDoor();drawMarkers();drawPlatforms();drawTokens();drawEnemies();drawPlayer();
 ctx.restore();
 // World progress
 rect(20,21,200,6,"#ffffff27");
 rect(20,21,200*Math.max(0,state.player.x/WORLD),6,"#ff86b5");
 ctx.fillStyle="#c6cde5";ctx.font="bold 11px monospace";ctx.textAlign="left";
 ctx.fillText("DISTANCE TO FREEDOM",20,15);
}
function loop(ts){
 if(!state.lastTime)state.lastTime=ts;
 const delta=Math.min(.05,(ts-state.lastTime)/1000);state.lastTime=ts;
 if(state.mode==="running"){
  state.accumulator=Math.min(.15,state.accumulator+delta);
  while(state.accumulator>=STEP){
   update(STEP);state.accumulator-=STEP;
   if(state.mode!=="running")break;
  }
 } else state.accumulator=0;
 draw();requestAnimationFrame(loop);
}
function key(event,pressed){
 const key=event.key.toLowerCase();
 const movements=["arrowleft","arrowright","arrowup","a","d","w"," ","p","escape"];
 if(!movements.includes(key))return;
 if(!pressed && key===" " && event.target?.tagName==="BUTTON"){
  // Space activates a focused button on keyup. Don't cancel that native
  // activation, but still release a jump held before focus changed.
  input.jump=false;
  return;
 }
 if(state.mode==="running" || state.mode==="paused"){
  if(event.target===document.body||event.target===canvas||document.activeElement===canvas||
     document.activeElement===$("muteGame")||document.activeElement===$("musicGame")||
     document.activeElement===$("musicPreview")||
     document.activeElement===$("touchPause")||
     document.activeElement===$("restartGame"))event.preventDefault();
 }
 if(key==="p"||key==="escape"){
  if(pressed&&!event.repeat){
   if(state.mode==="running")pause();
   else if(state.mode==="paused")start();
  }
  return;
 }
 if(key==="arrowleft"||key==="a")input.left=pressed;
 if(key==="arrowright"||key==="d")input.right=pressed;
 if(key==="arrowup"||key==="w"||key===" "){
  if(pressed&&!input.jump)input.jumpBuffer=.15;
  input.jump=pressed;
 }
}
window.addEventListener("keydown",event=>{
 const focused=document.activeElement;
 // Typing controls and unrelated buttons must retain their normal keyboard behavior.
 if(focused?.isContentEditable || ["INPUT","TEXTAREA","SELECT"].includes(focused?.tagName))return;
 const gameButton=focused===$("muteGame")||focused===$("musicGame")||
   focused===$("musicPreview")||
   focused===$("touchPause")||focused===$("restartGame");
 if(focused?.tagName==="BUTTON"){
  if(!gameButton)return;
  // Space/Enter must still activate a focused button rather than the player jump.
  if(event.key===" "||event.key==="Enter")return;
 }
 key(event,true);
});
window.addEventListener("keyup",event=>key(event,false));
window.addEventListener("blur",()=>{
 input.left=input.right=input.jump=false;
 if(state.mode==="running")pause();
 else {soundtrack?.pause();updateMusicUI();}
});
document.addEventListener("visibilitychange",()=>{
 if(!document.hidden)return;
 if(state.mode==="running")pause();
 else {soundtrack?.pause();updateMusicUI();}
});
function touchControl(button){
 const action=button.dataset.hold;
 const set=(down)=>{
  button.classList.toggle("held",down);
  if(action==="jump"){
   if(down&&!input.jump)input.jumpBuffer=.15;
   input.jump=down;
  }else input[action]=down;
 };
 button.addEventListener("pointerdown",event=>{event.preventDefault();button.setPointerCapture(event.pointerId);set(true);});
 button.addEventListener("pointerup",()=>set(false));
 button.addEventListener("pointercancel",()=>set(false));
 button.addEventListener("lostpointercapture",()=>set(false));
}
document.querySelectorAll("[data-hold]").forEach(touchControl);
$("touchPause").addEventListener("click",()=>{if(state.mode==="running")pause();else if(state.mode==="paused")start();});
$("gameStart").addEventListener("click",start);
$("restartGame").addEventListener("click",restart);
$("muteGame").addEventListener("click",event=>{
 state.sound=!state.sound;$("muteGame").textContent=state.sound?"🔊 Sound on":"🔇 Sound off";
 $("muteGame").setAttribute("aria-pressed",String(!state.sound));
 if(state.sound)blip(480);
 // Pointer clicks otherwise strand keyboard users on the HUD button.
 // Preserve focus for Space/Enter activation by keyboard (detail === 0).
 if(event.detail!==0)canvas.focus({preventScroll:true});
});
$("musicGame").disabled = !soundtrack?.supported;
$("musicPreview").disabled = !soundtrack?.supported;
if (!soundtrack?.supported) {
 $("musicGame").textContent = "♫ Music unavailable";
 $("musicPreview").textContent = "♫ Music unavailable";
}
let musicRequest = 0;
function clickMusic(event) {
 if (!soundtrack?.supported) return;
 const request=++musicRequest;
 const target=event.currentTarget;
 // A HUD pointer click resumes gameplay keyboard focus; keyboard activation
 // and the explanatory preview button retain their ordinary button focus.
 if(target===$("musicGame") && event.detail!==0)canvas.focus({preventScroll:true});
 $("musicGame").disabled=true;
 $("musicPreview").disabled=true;
 $("gameMessage").textContent="Doot is warming up its mathematical vocal cords…";
 const action = soundtrack.isPlaying() ? soundtrack.toggle(false)
   : soundtrack.enabled() ? soundtrack.play() : soundtrack.toggle(true);
 Promise.resolve(action).then(result=>{
   if(request!==musicRequest)return;
   updateMusicUI();
   $("gameMessage").textContent=soundtrack.isPlaying()
     ? "THE DOOT SONG IS PLAYING. This is not a drill."
     : soundtrack.enabled()
       ? "Doot's music is armed, but paused."
       : result===false
         ? "Doot Song stopped (or the browser could not start audio)."
         : "Doot Song is off.";
 }).catch(()=>{
   if(request!==musicRequest)return;
   soundtrack.pause();
   updateMusicUI();
   $("gameMessage").textContent="Audio could not start. Check browser sound permissions and output.";
 }).finally(()=>{
   if(request!==musicRequest)return;
   $("musicGame").disabled=false;
   $("musicPreview").disabled=false;
 });
}
$("musicGame").addEventListener("click",clickMusic);
$("musicPreview").addEventListener("click",clickMusic);
updateMusicUI();
canvas.setAttribute("tabindex","0");
reset();draw();requestAnimationFrame(loop);
})();
