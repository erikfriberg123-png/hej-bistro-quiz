/**
 * Hej Bistro Quiz — sound generator
 * Run: node generate-sounds.js
 * Outputs WAV files to assets/sounds/
 * No external dependencies required.
 */

const fs   = require('fs');
const path = require('path');

const SR  = 44100; // sample rate
const OUT = path.join(__dirname, 'assets', 'sounds');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// ─── WAV writer ───────────────────────────────────────────────────────────────

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const buf = Buffer.alloc(44 + data.length);
  buf.write('RIFF',   0, 'ascii');
  buf.writeUInt32LE(36 + data.length, 4);
  buf.write('WAVE',   8, 'ascii');
  buf.write('fmt ',  12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1,  20); // PCM
  buf.writeUInt16LE(1,  22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28); // byte rate
  buf.writeUInt16LE(2,  32); // block align
  buf.writeUInt16LE(16, 34); // bits
  buf.write('data',  36, 'ascii');
  buf.writeUInt32LE(data.length, 40);
  data.copy(buf, 44);
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`  ✓  ${name}`);
}

// ─── Primitives ───────────────────────────────────────────────────────────────

/** Sine wave at fixed frequency */
function sine(freq, durSec, amp = 0.6) {
  const n = Math.ceil(SR * durSec);
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++)
    a[i] = amp * Math.sin(2 * Math.PI * freq * i / SR);
  return a;
}

/** Band-limited chirp: frequency sweeps from f0 to f1 */
function chirp(f0, f1, durSec, amp = 0.6) {
  const n = Math.ceil(SR * durSec);
  const a = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t    = i / n;
    const freq = f0 * Math.pow(f1 / f0, t);
    a[i]       = amp * Math.sin(phase);
    phase     += 2 * Math.PI * freq / SR;
  }
  return a;
}

/** White noise */
function noise(durSec, amp = 0.4) {
  const n = Math.ceil(SR * durSec);
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = amp * (Math.random() * 2 - 1);
  return a;
}

/** Bell-like tone: sine + two decaying harmonics */
function bell(freq, durSec, amp = 0.65) {
  const n = Math.ceil(SR * durSec);
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    a[i] = amp * (
      0.6 * Math.sin(2 * Math.PI * freq       * t) * Math.exp(-t * 4)  +
      0.25 * Math.sin(2 * Math.PI * freq * 2.76 * t) * Math.exp(-t * 9)  +
      0.15 * Math.sin(2 * Math.PI * freq * 5.4  * t) * Math.exp(-t * 18)
    );
  }
  return a;
}

// ─── Envelopes ────────────────────────────────────────────────────────────────

/** ADSR in seconds; sustainLevel 0–1 */
function adsr(a, attackS, decayS, sustainLevel, releaseS) {
  const n  = a.length;
  const aS = Math.min(Math.ceil(SR * attackS), n);
  const dS = Math.min(Math.ceil(SR * decayS),  n - aS);
  const rS = Math.min(Math.ceil(SR * releaseS), n - aS - dS);
  const sS = n - aS - dS - rS;
  for (let i = 0; i < n; i++) {
    let env;
    if      (i < aS)            env = i / aS;
    else if (i < aS + dS)       env = 1 - (i - aS) / dS * (1 - sustainLevel);
    else if (i < aS + dS + sS)  env = sustainLevel;
    else                        env = sustainLevel * (1 - (i - aS - dS - sS) / Math.max(rS, 1));
    a[i] *= Math.max(0, env);
  }
  return a;
}

/** Fade out over last fadeS seconds */
function fadeOut(a, fadeS) {
  const rampLen = Math.min(Math.ceil(SR * fadeS), a.length);
  const start   = a.length - rampLen;
  for (let i = 0; i < rampLen; i++) a[start + i] *= 1 - i / rampLen;
  return a;
}

// ─── Combinators ──────────────────────────────────────────────────────────────

/** Add src into dst starting at offsetMs */
function addAt(dst, src, offsetMs) {
  const off = Math.floor(SR * offsetMs / 1000);
  for (let i = 0; i < src.length; i++) {
    const j = off + i;
    if (j < dst.length) dst[j] += src[i];
  }
}

/** Mix all arrays into a new one long enough to hold all of them */
function mix(...arrays) {
  const len = Math.max(...arrays.map(a => a.length));
  const out = new Float32Array(len);
  for (const a of arrays)
    for (let i = 0; i < a.length; i++) out[i] += a[i];
  return out;
}

/** Normalise peak to targetAmp (default 0.88) */
function norm(a, targetAmp = 0.88) {
  const peak = a.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  if (peak > 0.001) for (let i = 0; i < a.length; i++) a[i] *= targetAmp / peak;
  return a;
}

/** Allocate a silent buffer of durationMs */
function buf(ms) { return new Float32Array(Math.ceil(SR * ms / 1000)); }

// ─── Note frequencies ─────────────────────────────────────────────────────────

const C4=261.63,D4=293.66,E4=329.63,F4=349.23,G4=392.00,A4=440.00,B4=493.88;
const C5=523.25,D5=587.33,E5=659.25,F5=698.46,G5=783.99,A5=880.00,B5=987.77;
const C6=1046.5,D6=1174.7,E6=1318.5,F6=1396.9,G6=1568.0,A6=1760.0,B6=1975.5;
const C7=2093.0;
const Bf2=116.5, F2=87.3, B2=123.5, E3=164.8;

// ─── Sounds ───────────────────────────────────────────────────────────────────

console.log('\nGenerating sounds…\n');

// answer_correct – bright upward ding, major chord high register (400 ms)
writeWav('answer_correct.wav', norm(mix(
  adsr(sine(C6, 0.4, 0.55), 0.005, 0.06, 0.35, 0.28),
  adsr(sine(E6, 0.4, 0.40), 0.005, 0.06, 0.30, 0.28),
  adsr(sine(G6, 0.4, 0.28), 0.005, 0.06, 0.25, 0.28),
)));

// answer_wrong – low muted thud, dissonant (350 ms)
writeWav('answer_wrong.wav', norm(mix(
  adsr(sine(F2,  0.35, 0.70), 0.004, 0.04, 0.20, 0.25),
  adsr(sine(B2,  0.35, 0.45), 0.004, 0.04, 0.15, 0.25),
  adsr(noise(0.35, 0.25),     0.002, 0.02, 0.05, 0.22),
)));

// answer_timeout – soft descending sweep 440 → 220 Hz (500 ms)
writeWav('answer_timeout.wav', norm(
  adsr(chirp(440, 220, 0.5, 0.65), 0.02, 0.05, 0.55, 0.35),
));

// streak_3 – three ascending notes E5 G5 B5 (600 ms)
{
  const b = buf(600);
  [[E5,0],[G5,150],[B5,300]].forEach(([f,ms]) =>
    addAt(b, adsr(sine(f, 0.18, 0.6), 0.008, 0.02, 0.55, 0.12), ms));
  writeWav('streak_3.wav', norm(b));
}

// streak_5 – louder trill G5 B5 D6 + cork-pop accent (700 ms)
{
  const b = buf(700);
  [[G5,0],[B5,140],[D6,280]].forEach(([f,ms]) =>
    addAt(b, adsr(sine(f, 0.18, 0.75), 0.008, 0.02, 0.60, 0.12), ms));
  addAt(b, adsr(noise(0.08, 0.8), 0.001, 0.01, 0.0, 0.07), 560); // pop
  writeWav('streak_5.wav', norm(b));
}

// timer_tick – very soft dry click (80 ms)
writeWav('timer_tick.wav', norm(
  adsr(noise(0.08, 0.9), 0.001, 0.012, 0.0, 0.06),
  0.35,
));

// timer_warning – slightly higher, more tonal tick (80 ms)
writeWav('timer_warning.wav', norm(mix(
  adsr(sine(900, 0.08, 0.7), 0.001, 0.015, 0.05, 0.055),
  adsr(noise(0.08, 0.3),     0.001, 0.008, 0.0,  0.07),
), 0.50));

// battle_start – sharp kitchen bell ring (800 ms)
writeWav('battle_start.wav', norm(mix(
  bell(1200, 0.8, 0.70),
  bell(2400, 0.8, 0.30),
)));

// battle_star_1 – single high chime (400 ms)
writeWav('battle_star_1.wav', norm(bell(A6, 0.4, 0.80)));

// battle_star_2 – two ascending chimes (500 ms)
{
  const b = buf(500);
  addAt(b, bell(A6, 0.25, 0.75), 0);
  addAt(b, bell(C7, 0.25, 0.70), 200);
  writeWav('battle_star_2.wav', norm(b));
}

// battle_star_3 – three chimes + glass clink (1200 ms)
{
  const b = buf(1200);
  addAt(b, bell(A6,  0.28, 0.70),   80);
  addAt(b, bell(C7,  0.28, 0.65),  380);
  addAt(b, bell(E6*2,0.28, 0.60),  680);
  addAt(b, adsr(mix(sine(3520,0.3,0.55),sine(4186,0.3,0.35)),
               0.001,0.03,0.08,0.25), 950); // glass clink
  writeWav('battle_star_3.wav', norm(b));
}

// battle_win – fanfare then chord + applause (2000 ms)
{
  const b = buf(2000);
  [[C5,0],[E5,180],[G5,360],[C6,540]].forEach(([f,ms]) =>
    addAt(b, adsr(sine(f, 0.28, 0.60), 0.01, 0.04, 0.50, 0.20), ms));
  [C5,E5,G5,C6].forEach(f =>
    addAt(b, adsr(sine(f, 0.80, 0.45), 0.02, 0.05, 0.50, 0.65), 800));
  addAt(b, adsr(noise(0.75, 0.40), 0.06, 0.10, 0.50, 0.55), 1100);
  writeWav('battle_win.wav', norm(b));
}

// battle_lose – slow descending chord, sympathetic (1500 ms)
{
  const b = buf(1500);
  [[A4,0],[E4,220],[C4,440]].forEach(([f,ms]) =>
    addAt(b, adsr(sine(f, 0.9, 0.45), 0.06, 0.10, 0.40, 0.75), ms));
  writeWav('battle_lose.wav', norm(fadeOut(b, 0.4)));
}

// battle_draw – two equal notes side by side (800 ms)
{
  const b = buf(800);
  [0, 330].forEach(ms => addAt(b, adsr(sine(G5, 0.28, 0.55), 0.01, 0.04, 0.40, 0.20), ms));
  writeWav('battle_draw.wav', norm(b));
}

// ui_tap – subtle wooden tap (100 ms)
writeWav('ui_tap.wav', norm(mix(
  adsr(sine(180, 0.10, 0.50), 0.001, 0.015, 0.10, 0.08),
  adsr(noise(0.10, 0.30),     0.001, 0.010, 0.00, 0.09),
), 0.55));

// ui_swipe – quick air whoosh (150 ms)
{
  const n = Math.ceil(SR * 0.15);
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    a[i] = 0.55 * (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * Math.exp(-t * 5);
  }
  writeWav('ui_swipe.wav', norm(a, 0.55));
}

// ui_category_select – warmer tap (150 ms)
writeWav('ui_category_select.wav', norm(mix(
  adsr(sine(220, 0.15, 0.55), 0.001, 0.02, 0.15, 0.11),
  adsr(sine(440, 0.15, 0.25), 0.001, 0.02, 0.08, 0.11),
), 0.60));

// game_start – quick 3-note ascending fanfare (600 ms)
{
  const b = buf(600);
  [[C5,0],[E5,170],[G5,340]].forEach(([f,ms]) =>
    addAt(b, adsr(sine(f, 0.20, 0.65), 0.01, 0.025, 0.55, 0.15), ms));
  writeWav('game_start.wav', norm(b));
}

// game_end_win – upbeat jingle, clinking glasses (1800 ms)
{
  const b = buf(1800);
  [[C5,0],[E5,160],[G5,320],[C6,480],[E6,640]].forEach(([f,ms]) =>
    addAt(b, adsr(sine(f, 0.24, 0.58), 0.01, 0.03, 0.42, 0.18), ms));
  [[C6,900],[E6,1080],[G6,1260]].forEach(([f,ms]) =>
    addAt(b, bell(f, 0.32, 0.55), ms));
  writeWav('game_end_win.wav', norm(fadeOut(b, 0.3)));
}

// game_end_neutral – warm single chord resolve (800 ms)
writeWav('game_end_neutral.wav', norm(mix(
  adsr(sine(C4, 0.8, 0.45), 0.03, 0.05, 0.42, 0.55),
  adsr(sine(E4, 0.8, 0.38), 0.03, 0.05, 0.40, 0.55),
  adsr(sine(G4, 0.8, 0.30), 0.03, 0.05, 0.38, 0.55),
)));

// xp_gain – rising shimmer / sparkle (400 ms)
{
  const b = buf(400);
  [[C6,0],[E6,60],[G6,120],[C7,180]].forEach(([f,ms]) =>
    addAt(b, adsr(sine(f, 0.16, 0.45 - ms/400*0.15), 0.008, 0.02, 0.30, 0.12), ms));
  writeWav('xp_gain.wav', norm(b));
}

// level_up – triumphant ascending jingle (2000 ms)
{
  const b = buf(2000);
  [[C4,0],[E4,160],[G4,320],[C5,480],[E5,640],[G5,800],[C6,960]].forEach(([f,ms]) =>
    addAt(b, adsr(sine(f, 0.22, 0.62), 0.01, 0.035, 0.50, 0.16), ms));
  [C5,E5,G5,C6].forEach(f =>
    addAt(b, adsr(sine(f, 0.65, 0.50), 0.02, 0.05, 0.55, 0.48), 1300));
  writeWav('level_up.wav', norm(fadeOut(b, 0.35)));
}

// daily_challenge_unlock – friendly double chime (500 ms)
{
  const b = buf(500);
  addAt(b, bell(E6, 0.22, 0.72), 0);
  addAt(b, bell(G6, 0.22, 0.65), 210);
  writeWav('daily_challenge_unlock.wav', norm(b));
}

console.log('\nDone! All 23 sounds written to assets/sounds/\n');
