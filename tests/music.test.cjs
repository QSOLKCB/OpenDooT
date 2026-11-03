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
  resume(){return {catch(){}};}
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
assert.equal(music.play(),false,"Cannot start soundtrack without opt-in");
assert.equal(created.contexts,0,"Cannot allocate audio during denied autoplay");

// Enabling while on menu keeps silent until game start.
assert.equal(music.toggle(false),true);
assert.equal(music.enabled(),true);
assert.equal(music.isPlaying(),false);
assert.equal(created.contexts,1);
assert.equal(timers.size,0);
assert.equal(music.play(),true);
assert.equal(music.isPlaying(),true);
assert.equal(timers.size,1);
assert.ok(created.starts>0,"Music must synthesise voice, bass and rhythm");
assert.equal(music.play(),false,"Repeated play must not allocate duplicate schedulers");
assert.equal(timers.size,1);
const before=created.starts;
AudioContextMock.last.currentTime+=0.4;
for(const step of [...timers.values()])step();
assert.ok(created.starts>before,"Scheduler must progress after time advances");
music.pause();
assert.equal(music.isPlaying(),false);
assert.equal(timers.size,0,"No scheduler after pause");
assert.ok(created.stops>0,"Pause stops scheduled musical sources");
assert.equal(music.play(),true,"Resume restarts phrase only when enabled");
assert.equal(timers.size,1);
assert.equal(music.toggle(true),false,"Opt-out immediately disables");
assert.equal(music.enabled(),false);
assert.equal(music.isPlaying(),false);
assert.equal(timers.size,0);
assert.equal(music.play(),false,"Disabled soundtrack remains silent");

const unsupported={};
vm.runInNewContext(source,{
  window:unsupported,
  setInterval(){throw Error("Unsupported engine must not schedule audio");},
  clearInterval(){},
  Math,Object,Float32Array
});
assert.equal(unsupported.DootMusic.supported,false);
assert.equal(unsupported.DootMusic.toggle(true),false);
assert.equal(unsupported.DootMusic.play(),false);

console.log("The Doot Song: exact score, mathematics-only synth, opt-in, scheduler, pause, and fallback PASS");
