"use strict";
// Deterministic Web Audio lifecycle + original-score verification. No packages.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.resolve(__dirname, "../music.js"), "utf8");

const expectedLines = [
  ["Doot","Doot","Doot","Doot"],
  ["Doot","Doot","Doot","Email"],
  ["Doot","Doot","Doot","Doot"],
  ["Doot","Doot","Doot","Doot"],
  ["Email","Doot","Doot","Doot"],
  ["Doot","Doot","Doot"],
  ["Doot","Doot"],
  ["Doot"],
  ["Weee","Weee","Weee","Weee","Doooooooot"]
];
function parameter() {
  return {value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};
}
const created = {contexts:0,starts:0,stops:0,disconnected:0};
const timers = new Map();
let nextTimer = 1;
function node() {
  return {
    gain:parameter(),frequency:parameter(),Q:parameter(),
    connect(){return this;},
    disconnect(){created.disconnected++;},
    start(){created.starts++;},
    stop(){created.stops++;},
    onended:null
  };
}
class AudioContextMock {
  constructor() {
    created.contexts++;
    this.currentTime=0;
    this.sampleRate=48000;
    this.destination=node();
    AudioContextMock.last=this;
  }
  createGain(){return node();}
  createOscillator(){return node();}
  createBufferSource(){return node();}
  createBiquadFilter(){return node();}
  createBuffer(_channels,frames){return {getChannelData(){return new Float32Array(frames);}};}
  resume(){this.state="running";return Promise.resolve();}
}
const browser = {
  AudioContext: AudioContextMock
};
vm.runInNewContext(source,{
  window:browser,
  setInterval(fn,interval){assert.equal(interval,45);const id=nextTimer++;timers.set(id,fn);return id;},
  clearInterval(id){timers.delete(id);},
  Math,Object,Float32Array
},{filename:"music.js"});
const music=browser.DootMusic;
async function run() {
assert.ok(music,"Global song controller exposed");
assert.equal(music.supported,true);
assert.equal(music.bpm,142);
assert.equal(JSON.stringify(music.lines),JSON.stringify(expectedLines),"Every user-supplied lyric must be preserved");
assert.equal(music.lines.length,9);
assert.equal(music.lines.flat().length,31);
assert.ok(music.duration>12 && music.duration<28,"Bounded, audible looping phrase");
assert.equal(music.enabled(),false,"Music must default to disabled");
assert.equal(music.isPlaying(),false,"Music must default to silent");
assert.equal(created.contexts,0,"AudioContext must NOT be constructed on page load");
assert.equal(timers.size,0,"No background timer before user opt-in");
assert.equal(await music.play(),false,"Cannot start soundtrack without opt-in");
assert.equal(created.contexts,0,"Cannot allocate audio during denied autoplay");

// Clicking a real preview button must schedule audio immediately, including
// when the level is still on its title screen.
assert.equal(await music.toggle(true),true,"Opt-in must await audio readiness");
assert.equal(music.enabled(),true);
assert.equal(music.isPlaying(),true,"Preview must be playing immediately after opt-in resolves");
assert.equal(created.contexts,1);
assert.equal(timers.size,1);
assert.ok(created.starts>0,"Music must synthesise voice, bass and rhythm");
assert.equal(await music.play(),false,"Repeated play must not allocate duplicate schedulers");
assert.equal(timers.size,1);
const before=created.starts;
AudioContextMock.last.currentTime+=0.4;
for(const step of [...timers.values()])step();
assert.ok(created.starts>before,"Scheduler must progress after time advances");
music.pause();
assert.equal(music.isPlaying(),false);
assert.equal(timers.size,0,"No scheduler after pause");
assert.ok(created.stops>0,"Pause stops scheduled musical sources");
assert.equal(await music.play(),true,"Resume restarts phrase only when enabled");
assert.equal(timers.size,1);
assert.equal(await music.toggle(true),false,"Opt-out immediately disables");
assert.equal(music.enabled(),false);
assert.equal(music.isPlaying(),false);
assert.equal(timers.size,0);
assert.equal(await music.play(),false,"Disabled soundtrack remains silent");

const unsupported={};
vm.runInNewContext(source,{
  window:unsupported,
  setInterval(){throw Error("Unsupported engine must not schedule audio");},
  clearInterval(){},
  Math,Object,Float32Array
});
assert.equal(unsupported.DootMusic.supported,false);
assert.equal(await unsupported.DootMusic.toggle(true),false);
assert.equal(await unsupported.DootMusic.play(),false);

// A rejected AudioContext resume must never leave a false "on" state.
class RejectedContext extends AudioContextMock {
  resume(){return Promise.reject(new Error("Audio blocked"));}
}
const rejected={AudioContext:RejectedContext};
vm.runInNewContext(source,{
  window:rejected,Math,Object,Float32Array,
  setInterval(){throw Error("Rejected audio must never start a scheduler");},
  clearInterval(){}
});
assert.equal(await rejected.DootMusic.toggle(true),false,"Reject browser audio failure");
assert.equal(rejected.DootMusic.enabled(),false,"Failed resume must clear enabled state");
assert.equal(rejected.DootMusic.isPlaying(),false,"Failed resume must stay silent");

// Pausing/cancelling while resume is pending must not start music later.
let releaseResume=null;
class DeferredContext extends AudioContextMock {
  resume(){
    return new Promise(resolve=>{
      releaseResume=()=>{this.state="running";resolve();};
    });
  }
}
const deferredTimers=new Map();
const deferred={AudioContext:DeferredContext};
vm.runInNewContext(source,{
  window:deferred,Math,Object,Float32Array,
  setInterval(fn,interval){const id=deferredTimers.size+1;deferredTimers.set(id,fn);return id;},
  clearInterval(id){deferredTimers.delete(id);}
});
const pending=deferred.DootMusic.toggle(true);
assert.equal(deferred.DootMusic.isPlaying(),false);
assert.equal(await deferred.DootMusic.toggle(true),false,"Turning off pending playback succeeds");
assert.ok(releaseResume,"Browser resume attempt must have been started");
releaseResume();
assert.equal(await pending,false,"Stale browser resume cannot start audio");
assert.equal(deferred.DootMusic.isPlaying(),false);
assert.equal(deferredTimers.size,0,"No leaked scheduler after cancelled resume");
console.log("The Doot Song: real preview, resume readiness, rejection, cancellation, exact lyrics and scheduler PASS");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
