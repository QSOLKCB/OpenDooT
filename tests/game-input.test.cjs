"use strict";
// No DOM packages or browser required. Exercise the actual game event handlers
// and fixed-step update in a tiny deterministic DOM/Canvas harness.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const code = fs.readFileSync(path.resolve(__dirname, "../game.js"), "utf8");
const hooks = new Map();
const elementCache = new Map();
const doc = {
  body: {tagName:"BODY"},
  activeElement: null,
  hidden: false,
  addEventListener(type, handler) {hooks.set("document:"+type, handler);},
  querySelectorAll() {return [];},
  getElementById(id) {
    if(!elementCache.has(id)) {
      const tagName = ["muteGame","musicGame","musicPreview","touchPause","gameStart","restartGame"].includes(id) ? "BUTTON" : id==="gameCanvas" ? "CANVAS" : "DIV";
      const item = {
        id,tagName,textContent:"",hidden:false,attributes:{},handlers:{},
        classList:{toggle(){}},
        setAttribute(k,v){this.attributes[k]=v;},
        addEventListener(type,fn){this.handlers[type]=fn;},
        focus(){doc.activeElement=this;}
      };
      // Mirror browser behavior: disabling an active button removes focus.
      // This makes focus regressions observable in the test harness.
      let disabled=false;
      Object.defineProperty(item,"disabled",{
        get(){return disabled;},
        set(value){
          disabled=Boolean(value);
          if(disabled && doc.activeElement===item)doc.activeElement=doc.body;
        }
      });
      if(id==="gameCanvas"){
        item.getContext=()=>ctx;
      }
      elementCache.set(id,item);
    }
    return elementCache.get(id);
  }
};
const ctx = {
  createLinearGradient() {return {addColorStop(){}};},
  beginPath(){},rect(){},clip(){},roundRect(){},fill(){},save(){},
  restore(){},fillRect(){},stroke(){},moveTo(){},lineTo(){},
  arc(){},fillText(){}
};
let frame;
const soundtrack = {
  supported:true,active:false,playing:false,playCalls:0,pauseCalls:0,
  toggleCalls:0,delayNext:false,finishPending:null,
  enabled(){return this.active;},
  isPlaying(){return this.playing;},
  toggle(shouldPlay) {
    this.toggleCalls++;
    this.active=!this.active;
    if(shouldPlay && this.delayNext){
      this.delayNext=false;
      this.playing=false;
      return new Promise(resolve=>{
        this.finishPending=()=>{this.playing=true;resolve(true);};
      });
    }
    this.playing=this.active&&shouldPlay;
    return this.playing;
  },
  play(){this.playCalls++;if(this.active){this.playing=true;return true;}return false;},
  pause(){this.pauseCalls++;this.playing=false;}
};
const win = {
  DootMusic:soundtrack,
  addEventListener(type,fn){hooks.set("window:"+type,fn);}
};
const sandbox = {
  window:win,
  document:doc,
  requestAnimationFrame(fn){frame=fn;},
  console,
  Math,
  Date
};
// Read-only instrumentation in the test VM; not shipped with the game.
const end = "})();";
assert.ok(code.trimEnd().endsWith(end), "Game closure changed; update the test hook");
const instrumented = code.trimEnd().slice(0,-end.length) +
    "globalThis.__testState = {state,input};\n" + end;
vm.runInNewContext(instrumented,sandbox,{filename:"game.js"});
const {state,input}=sandbox.__testState;
const el=id=>doc.getElementById(id);
const click=(id,detail=1)=>{
  doc.activeElement=el(id);
  el(id).handlers.click({detail,currentTarget:el(id)});
};
const keyboard=(key,pressed=true)=>{
  let prevented=false;
  const ev={key,repeat:false,target:doc.activeElement,
    preventDefault(){prevented=true;}};
  const handler=hooks.get("window:"+(pressed?"keydown":"keyup"));
  assert.ok(handler,"Event listener registered");
  handler(ev);
  return prevented;
};
function spaceActivate(id){
  // Browsers activate a focused button with Space on keyup, unless canceled.
  // Simulate that default behavior to verify the complete event sequence.
  const button=el(id);
  doc.activeElement=button;
  assert.equal(keyboard(" ",true),false,"Space keydown must preserve "+id+" activation");
  assert.equal(keyboard(" ",false),false,"Space keyup must preserve "+id+" activation");
  button.handlers.click({detail:0,currentTarget:button});
  assert.equal(input.jump,false,"Space button interaction must not leave jump held");
}
async function flushMusic() {
  // Process the .then(), .catch() and .finally() microtasks on an audio request.
  await new Promise(resolve=>setImmediate(resolve));
}
let ms=1000;
function tick(frames=2){
  for(let i=0;i<frames;i++){ms+=17;frame(ms);}
}

async function run() {
// The real focusable preview button must survive pending audio startup.
assert.equal(state.mode,"ready");
const preview=el("musicPreview");
soundtrack.delayNext=true;
spaceActivate("musicPreview");
assert.equal(doc.activeElement,preview,"Space focuses the preview button");
assert.equal(preview.disabled,false,"Pending playback must not disable its button");
assert.equal(preview.attributes["aria-busy"],"true","Pending audio uses aria-busy instead");
assert.equal(el("musicGame").disabled,false,"HUD button remains focusable too");
const pendingCalls=soundtrack.toggleCalls;
spaceActivate("musicPreview");
assert.equal(soundtrack.toggleCalls,pendingCalls,"Repeated clicks while pending must not start a second request");
assert.equal(doc.activeElement,preview,"Repeated Space while pending must preserve focus");
soundtrack.finishPending();
await flushMusic();
assert.equal(preview.attributes["aria-busy"],"false","Busy state clears after audio settles");
assert.equal(doc.activeElement,preview,"The preview stays keyboard-focused after audio starts");
assert.equal(soundtrack.isPlaying(),true,"Completing resume starts the track");
spaceActivate("musicPreview");
await flushMusic();
assert.equal(soundtrack.enabled(),false,"Second Space turns off playback from the same focused button");
assert.equal(doc.activeElement,preview,"Stopping must not lose keyboard focus");

// The new lyric-sheet control must actually play before the game starts.
assert.equal(state.mode,"ready");
click("musicPreview",1);
await flushMusic();
assert.equal(soundtrack.enabled(),true,"Preview click enables audio in the menu");
assert.equal(soundtrack.isPlaying(),true,"Preview is audible without first starting gameplay");
click("musicPreview",1);
await flushMusic();
assert.equal(soundtrack.enabled(),false,"Second preview click disables music");
assert.equal(soundtrack.isPlaying(),false);

// Start via the real button handler. The game itself should own focus.
click("gameStart");
assert.equal(state.mode,"running");
assert.equal(doc.activeElement,el("gameCanvas"));
tick();

// Reproduces the exact P2: clicking sound must not strand focus on muteGame.
click("muteGame",1);
assert.equal(doc.activeElement,el("gameCanvas"),"Pointer toggle should return focus to game canvas");
let x=state.player.x;
assert.equal(keyboard("d"),true,"Movement should suppress browser scrolling");
tick();
assert.ok(state.player.x>x,"Movement must resume after sound click");
keyboard("d",false);

// Music must remain a separate opt-in switch from sound effects.
assert.equal(soundtrack.enabled(),false,"No soundtrack autoplay");
click("musicGame",1);
await flushMusic();
assert.equal(doc.activeElement,el("gameCanvas"),"Pointer music toggle returns focus to canvas");
assert.equal(soundtrack.enabled(),true,"Music is enabled only after explicit click");
assert.equal(soundtrack.playing,true,"Music starts during an active game");
spaceActivate("musicGame");
await flushMusic();
assert.equal(doc.activeElement,el("musicGame"),"HUD button stays focused after stopping with Space");
assert.equal(soundtrack.enabled(),false,"Keyboard Space toggles music off");
spaceActivate("musicGame");
await flushMusic();
assert.equal(doc.activeElement,el("musicGame"),"HUD button stays focused after starting with Space");
assert.equal(soundtrack.enabled(),true,"Keyboard Space toggles music back on");
spaceActivate("musicPreview");
await flushMusic();
assert.equal(soundtrack.enabled(),false,"Space activates lyric-sheet button");
spaceActivate("musicPreview");
await flushMusic();
assert.equal(soundtrack.enabled(),true,"Lyric-sheet button can re-enable song");
assert.equal(keyboard("p"),true,"P should pause when the music button is focused");
assert.equal(state.mode,"paused");
assert.equal(soundtrack.playing,false,"Paused gameplay silences the soundtrack");
assert.equal(keyboard("Escape"),true);
assert.equal(state.mode,"running");
assert.equal(soundtrack.playing,true,"Resuming gameplay resumes opted-in music");
assert.equal(doc.activeElement,el("gameCanvas"));

// Keyboard activation keeps the sound button focused for accessibility,
// but movement, arrow jumping and pause must still work there.
click("muteGame",0);
assert.equal(doc.activeElement,el("muteGame"),"Keyboard activation must preserve button focus");
x=state.player.x;
assert.equal(keyboard("ArrowRight"),true,"Game key should work on game HUD button");
tick();
assert.ok(state.player.x>x,"Arrow movement while mute button focused");
keyboard("ArrowRight",false);
const oldSound=state.sound;
spaceActivate("muteGame");
assert.equal(state.sound,!oldSound,"Keyboard Space must actually toggle sound");
assert.equal(doc.activeElement,el("muteGame"),"Keyboard sound activation must retain focus");
assert.equal(keyboard("p"),true,"P pauses from focused HUD control");
assert.equal(state.mode,"paused");
assert.equal(keyboard("Escape"),true,"Escape resumes from focused HUD control");
assert.equal(state.mode,"running");
assert.equal(doc.activeElement,el("gameCanvas"),"Resuming returns focus to canvas");

// The same native Space keyup mechanism must work on pause and restart.
spaceActivate("touchPause");
assert.equal(state.mode,"paused","Space must activate the focused pause button");
spaceActivate("touchPause");
assert.equal(state.mode,"running","Space must resume from focused pause button");
spaceActivate("restartGame");
assert.equal(state.mode,"ready","Space must activate the focused restart button");
assert.equal(soundtrack.playing,false,"Restart ends active music");
spaceActivate("gameStart");
assert.equal(state.mode,"running","Space must activate the focused start button");
assert.equal(doc.activeElement,el("gameCanvas"),"Start should return game focus");
doc.activeElement=el("gameCanvas");
input.jump=true;
assert.equal(keyboard(" ",false),true,"Canvas Space keyup should still prevent scroll");
assert.equal(input.jump,false,"Canvas Space keyup must release held jump");

// Preserve normal typing and unrelated button activation. Key-up always
// releases held movement even if focus moves away before the release.
const textInput={tagName:"INPUT"};
doc.activeElement=textInput;
x=state.player.x;
keyboard("d");
tick();
assert.equal(state.player.x,x,"Typing into an input must not move the player");
keyboard("d",false);

doc.activeElement=el("gameCanvas");
keyboard("d");
assert.equal(input.right,true);
doc.activeElement=textInput;
keyboard("d",false);
assert.equal(input.right,false,"Releasing a game key after focus change must not stick");

doc.activeElement={tagName:"BUTTON"};
keyboard("d");
assert.equal(input.right,false,"Unrelated focused buttons remain untouched");
console.log("DooT Escape music buttons retain keyboard focus across pending audio, Space, pause/resume and typing: PASS");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
