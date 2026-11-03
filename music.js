"use strict";
/*
 * The Doot Song — entirely original, generated with mathematics and Web Audio.
 * No sound files, speechSynthesis API, samples, network, cookies, or storage.
 * The user's exact lyric order is the score; formant resonators mimic
 * robot vowels, deterministic noise creates consonants, and oscillators
 * provide bass and rhythm. Audio is always opt-in.
 */
(() => {
  const SONG_LINES = Object.freeze([
    Object.freeze(["Doot", "Doot", "Doot", "Doot"]),
    Object.freeze(["Doot", "Doot", "Doot", "Email"]),
    Object.freeze(["Doot", "Doot", "Doot", "Doot"]),
    Object.freeze(["Doot", "Doot", "Doot", "Doot"]),
    Object.freeze(["Email", "Doot", "Doot", "Doot"]),
    Object.freeze(["Doot", "Doot", "Doot"]),
    Object.freeze(["Doot", "Doot"]),
    Object.freeze(["Doot"]),
    Object.freeze(["Weee", "Weee", "Weee", "Weee", "Doooooooot"])
  ]);
  const BPM = 142;
  const BEAT = 60 / BPM;
  const SCALE = [0, 3, 5, 7, 10, 12, 15, 17]; // original C-minor-ish arcade contour
  const MELODY = [0, 2, 4, 2, 1, 3, 5, 3, 0, 4, 3, 1, 2, 5, 4, 3];
  const BASS = [36, 43, 39, 41]; // C, G, Eb, F
  const NOTE = midi => 440 * Math.pow(2, (midi - 69) / 12);

  // Deterministic score, preserving all nine lines and every syllable.
  const score = [];
  let totalBeats = 0;
  let ordinal = 0;
  SONG_LINES.forEach((line, lineNumber) => {
    line.forEach(word => {
      const beats = word === "Email" ? 1.75 : word === "Doooooooot" ? 4 : 1;
      const pitch = 60 + SCALE[MELODY[(ordinal + lineNumber * 2) % MELODY.length] % SCALE.length];
      score.push({kind: "word", word, line: lineNumber, beat: totalBeats, beats, pitch});
      totalBeats += beats;
      ordinal++;
    });
    totalBeats += lineNumber === SONG_LINES.length - 1 ? 1 : 0.55;
  });
  const events = [...score];
  for (let b = 0; b < totalBeats - 0.4; b += 1) {
    events.push({kind: "bass", beat: b, pitch: BASS[Math.floor(b / 8) % BASS.length]});
    events.push({kind: "hat", beat: b + 0.5, accent: false});
    if (b % 4 === 0) events.push({kind: "hat", beat: b, accent: true});
  }
  events.sort((a, b) => a.beat - b.beat);
  Object.freeze(events);
  const duration = totalBeats * BEAT;

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  let context = null;
  let mix = null;
  let noise = null;
  let on = false;
  let playing = false;
  let timer = null;
  let position = 0;
  let origin = 0;
  let generation = 0; // Invalidates pending audio-resume requests on pause/opt-out.
  const active = new Set();

  async function ensure() {
    if (!AudioCtor) return false;
    try {
      if (!context) {
        context = new AudioCtor();
        mix = context.createGain();
        mix.gain.value = 0.42; // audible but conservatively below clipping
        mix.connect(context.destination);
        const samples = Math.ceil(context.sampleRate * 0.055);
        noise = context.createBuffer(1, samples, context.sampleRate);
        const output = noise.getChannelData(0);
        let seed = 0xD0072026;
        for (let i = 0; i < samples; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          output[i] = ((seed >>> 8) / 0x1000000) * 2 - 1;
        }
      }
      // The browser's promise, not merely a click, establishes audio readiness.
      // resume() is invoked synchronously from the click before the first await.
      await context.resume();
      return !context.state || context.state === "running";
    } catch (_error) {
      return false;
    }
  }

  function track(source, extras = []) {
    const entry = {source, extras};
    active.add(entry);
    source.onended = () => {
      if (!active.delete(entry)) return;
      for (const n of [source, ...extras]) {
        try { n.disconnect(); } catch (_error) { /* already disconnected */ }
      }
    };
  }

  // A synthesised phoneme: pitched sawtooth source through three formant bands.
  // F1/F2/F3 define the mouth's acoustic peaks, not a prerecorded voice.
  function vowel(start, length, midi, formants, slide = 1, peak = 0.085) {
    if (length <= 0.02) return;
    const osc = context.createOscillator();
    const envelope = context.createGain();
    osc.type = "sawtooth";
    const fundamental = NOTE(midi);
    osc.frequency.setValueAtTime(fundamental * 0.965, start);
    osc.frequency.linearRampToValueAtTime(fundamental * slide, start + length * 0.88);

    const attack = Math.min(0.025, length * 0.16);
    const release = Math.min(0.09, length * 0.3);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(peak, start + attack);
    envelope.gain.setValueAtTime(peak, start + length - release);
    envelope.gain.linearRampToValueAtTime(0, start + length);
    envelope.connect(mix);

    const filters = [];
    formants.forEach((hz, index) => {
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(hz, start);
      filter.frequency.linearRampToValueAtTime(hz * (slide > 1.1 ? 1.08 : 1), start + length);
      filter.Q.value = [2.9, 4.2, 6.5][index];
      const band = context.createGain();
      band.gain.value = [0.8, 1, 0.6][index];
      osc.connect(filter);
      filter.connect(band);
      band.connect(envelope);
      filters.push(filter, band);
    });
    track(osc, [...filters, envelope]);
    osc.start(start);
    osc.stop(start + length + 0.002);
  }

  // Seeded white-noise plosive for the D / T and M consonant edges.
  function burst(start, length, hz = 950, strength = 0.018) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = noise;
    filter.type = "highpass";
    filter.frequency.value = hz;
    envelope.gain.setValueAtTime(strength, start);
    envelope.gain.linearRampToValueAtTime(0, start + length);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(mix);
    track(source, [filter, envelope]);
    source.start(start);
    source.stop(start + length);
  }

  function word(event, when) {
    const length = Math.max(0.1, event.beats * BEAT * 0.9);
    if (event.word === "Email") {
      // EE + M-AY-L: two vowel resonances and a soft consonant onset.
      vowel(when, length * 0.38, event.pitch + 4, [260, 2380, 3020], 1.07);
      burst(when + length * 0.39, 0.027, 520, 0.012);
      vowel(when + length * 0.44, length * 0.53, event.pitch, [495, 1720, 2650], 0.96);
    } else if (event.word === "Weee") {
      // W glide into sustained /i:/; deliberately ridiculous pitch bend.
      vowel(when, length, event.pitch + 5, [285, 2370, 3130], 1.28, 0.073);
    } else {
      const long = event.word === "Doooooooot";
      burst(when, 0.022, 1200, 0.027);
      vowel(when + 0.018, length - 0.033, event.pitch + (long ? -5 : 0),
        [325, 865, 2230], long ? 1.18 : 1.015, long ? 0.105 : 0.085);
      burst(when + length - 0.025, 0.025, 2000, 0.009);
    }
  }

  function bass(event, when) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(NOTE(event.pitch), when);
    osc.frequency.linearRampToValueAtTime(NOTE(event.pitch) * 0.996, when + BEAT * 0.65);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(0.12, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + BEAT * 0.67);
    osc.connect(gain); gain.connect(mix);
    track(osc, [gain]); osc.start(when); osc.stop(when + BEAT * 0.69);
  }

  function hat(event, when) {
    burst(when, event.accent ? 0.045 : 0.027, 3600, event.accent ? 0.028 : 0.015);
  }

  function schedule() {
    if (!playing || !context) return;
    const now = context.currentTime;
    // After browser suspension, restart instead of synthesising hours of backlog.
    if (now - origin > duration * 2) { position = 0; origin = now + 0.06; }
    const horizon = now + 0.16;
    let n = 0;
    while (playing && n++ < 32) {
      const event = events[position];
      const when = origin + event.beat * BEAT;
      if (when > horizon) break;
      if (when >= now - 0.025) {
        if (event.kind === "word") word(event, Math.max(when, now));
        else if (event.kind === "bass") bass(event, Math.max(when, now));
        else hat(event, Math.max(when, now));
      }
      position++;
      if (position === events.length) {
        position = 0;
        origin += duration; // phase-locked seamless loop
      }
    }
  }

  function pause() {
    ++generation;
    playing = false;
    if (timer !== null) { clearInterval(timer); timer = null; }
    for (const item of active) {
      try { item.source.stop(0); } catch (_error) { /* already stopped */ }
      for (const node of [item.source, ...item.extras]) {
        try { node.disconnect(); } catch (_error) { /* already disconnected */ }
      }
    }
    active.clear();
    position = 0;
  }

  async function play() {
    if (!on || playing) return false;
    const requested = ++generation;
    const ready = await ensure();
    if (requested !== generation || !on) return false; // stale async completion
    if (!ready) {
      on = false;
      pause();
      return false;
    }
    try {
      playing = true;
      position = 0;
      origin = context.currentTime + 0.065;
      schedule();
      timer = setInterval(schedule, 45);
      return true;
    } catch (_error) {
      on = false;
      pause();
      return false;
    }
  }

  async function toggle(shouldPlay = true) {
    if (on) {
      on = false;
      pause();
      return false;
    }
    on = true;
    // The UI may only say "playing" after resume() and scheduling succeed.
    return shouldPlay ? play() : true;
  }

  window.DootMusic = Object.freeze({
    toggle,
    play,
    pause,
    enabled: () => on,
    isPlaying: () => playing,
    supported: Boolean(AudioCtor),
    lines: SONG_LINES,
    bpm: BPM,
    duration
  });
})();
