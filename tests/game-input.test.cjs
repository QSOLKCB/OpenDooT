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
assert.equal(keyboard(" ",true),false,"Space must activate focused button natively");
assert.equal(input.jump,false,"Space on sound button must not jump");
keyboard(" ",false);
assert.equal(keyboard("p"),true,"P pauses from focused HUD control");
assert.equal(state.mode,"paused");
assert.equal(keyboard("Escape"),true,"Escape resumes from focused HUD control");
assert.equal(state.mode,"running");
assert.equal(doc.activeElement,el("gameCanvas"),"Resuming returns focus to canvas");

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
console.log("DooT Escape focused sound button, pause, movement and typing regression: PASS");
