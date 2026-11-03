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
      const tagName = ["muteGame","touchPause","gameStart","restartGame"].includes(id) ? "BUTTON" : id==="gameCanvas" ? "CANVAS" : "DIV";
      const item = {
        id,tagName,textContent:"",hidden:false,attributes:{},handlers:{},
        classList:{toggle(){}},
        setAttribute(k,v){this.attributes[k]=v;},
        addEventListener(type,fn){this.handlers[type]=fn;},
        focus(){doc.activeElement=this;}
      };
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
const win = {addEventListener(type,fn){hooks.set("window:"+type,fn);}};
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
  el(id).handlers.click({detail});
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
  button.handlers.click({detail:0});
  assert.equal(input.jump,false,"Space button interaction must not leave jump held");
}
let ms=1000;
function tick(frames=2){
  for(let i=0;i<frames;i++){ms+=17;frame(ms);}
}

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
console.log("DooT Escape full Space keydown/keyup, native button activation, focus, movement and typing: PASS");
