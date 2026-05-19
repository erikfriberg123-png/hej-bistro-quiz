# Hej Bistro Quiz — Sound & Vibration Scheme

> This document defines every audio and haptic event in the app, describes
> the intended feel of each sound, and gives Claude Code precise instructions
> for wiring everything up. It covers all game modes (solo quiz, daily
> challenge, battle mode).

---

## 1. Design Philosophy

The sound identity of Hej Bistro Quiz should feel like a lively restaurant
at peak service — energetic, warm, a little chaotic, always rewarding. Think
clattering pans, corks popping, a crowded dining room that explodes into
applause when something great happens.

Key rules:
- **Short and punchy.** UI sounds must be ≤ 300 ms. Celebration sounds ≤ 2 s.
- **Layered, not loud.** Sounds stack on top of background music without competing.
- **Haptics mirror audio.** Every sound event has a corresponding vibration
  pattern — users who play with sound off still feel the game.
- **Consistent across modes.** Solo quiz, daily challenge, and battle mode use
  the same sound IDs. Context (e.g., opponent present) can add extra layers but
  never replaces the base sounds.

---

## 2. Master Event Catalog

### 2.1 Gameplay Core

| Event ID | When it fires | Sound description | Duration |
|---|---|---|---|
| `answer_correct` | User taps the correct answer | Bright, upward ding — like a service bell being hit cleanly. Major chord, high register. | 400 ms |
| `answer_wrong` | User taps a wrong answer | Low, muted thud — like a dull knock on a wooden table. Dissonant, but not harsh. | 350 ms |
| `answer_timeout` | Timer expires with no selection | Soft descending tone — like a dying sparkler. Subtle, not punishing. | 500 ms |
| `streak_3` | 3 correct answers in a row | Short ascending trill + a quick sizzle/hiss (like a hot pan). Feels like momentum building. | 600 ms |
| `streak_5` | 5 correct answers in a row | Louder version of streak_3 with a cork-pop accent at the end. | 700 ms |

### 2.2 Timer

| Event ID | When it fires | Sound description | Duration |
|---|---|---|---|
| `timer_tick` | Each second of countdown | Very soft, dry click — like a lighter flicking. Barely audible at normal volume. | 80 ms |
| `timer_warning` | Last 5 seconds | Tick becomes slightly louder and higher-pitched. Pace stays the same — the anxiety comes from pitch, not speed. | 80 ms |

> **Note:** `timer_tick` and `timer_warning` should respect a "mute ticks" user
> setting — some players find constant ticking distracting. All other sounds ignore
> this setting.

### 2.3 Battle Mode

| Event ID | When it fires | Sound description | Duration |
|---|---|---|---|
| `battle_start` | Battle begins, after countdown | A sharp kitchen bell ring ("service!") — like a head chef calling the pass. | 800 ms |
| `battle_star_1` | First star awarded to player | Single high chime. Clean and celebratory. | 400 ms |
| `battle_star_2` | Second star awarded | Two chimes in quick succession, ascending. | 500 ms |
| `battle_star_3` | Third star awarded (perfect round) | Three chimes + layered glass clink sounds. This is the peak of success in battle. Big moment. | 1200 ms |
| `battle_win` | Player wins the battle | Full celebration fanfare — cascading chimes, crowd noise/applause, cork pop. Restaurant erupts. | 2000 ms |
| `battle_lose` | Player loses the battle | Quiet, slow descending chord — like music winding down at closing time. Sympathetic, not cruel. | 1500 ms |
| `battle_draw` | Round ends in a draw | Neutral "hmm" tone — two equal notes side by side. | 800 ms |

### 2.4 UI & Navigation

| Event ID | When it fires | Sound description | Duration |
|---|---|---|---|
| `ui_tap` | Generic button press | Subtle wooden tap — like placing a coaster. Very quiet. | 100 ms |
| `ui_swipe` | Card swipe / screen transition | Quick air-whoosh, light. | 150 ms |
| `ui_category_select` | Category chosen on home screen | Slightly warmer tap than `ui_tap` — like picking up a menu. | 150 ms |
| `game_start` | Quiz round begins | Quick ascending 3-note fanfare. "Let's go." | 600 ms |
| `game_end_win` | Solo quiz completed with high score | Upbeat, short jingle — clinking glasses, light applause. | 1800 ms |
| `game_end_neutral` | Solo quiz completed, average score | Warm single chord resolve. Positive but calm. | 800 ms |
| `xp_gain` | XP bar fills up | Soft shimmer / sparkle sound. | 400 ms |
| `level_up` | Player reaches a new level | Triumphant short jingle — louder than `game_end_win`, more ceremonial. | 2000 ms |
| `daily_challenge_unlock` | New daily challenge available | Notification chime — friendly, like a front-of-house bell. | 500 ms |

---

## 3. Vibration (Haptic) Patterns

Use the platform's haptic engine where available. Patterns below are described
as sequences of `[on_ms, off_ms]` (vibrate, pause).

| Event ID | Haptic pattern | Feel |
|---|---|---|
| `answer_correct` | `[50]` | Single crisp pulse — confirmation |
| `answer_wrong` | `[80, 60, 80]` | Double buzz — "nope" |
| `answer_timeout` | `[120]` | One longer pulse — "too late" |
| `streak_3` | `[40, 30, 40, 30, 80]` | Quick double then accent — building energy |
| `streak_5` | `[40, 20, 40, 20, 40, 20, 120]` | Triple rapid then big accent — peak momentum |
| `timer_warning` | `[30]` per tick (last 5 s) | Tiny pulse each second — subtle urgency |
| `battle_star_1` | `[60]` | Clean single |
| `battle_star_2` | `[60, 40, 60]` | Two beats |
| `battle_star_3` | `[60, 30, 60, 30, 120]` | Two quick + long finish — perfect score |
| `battle_win` | `[80, 40, 80, 40, 200]` | Celebratory rhythm then long hold |
| `battle_lose` | `[150]` | One long, slow pulse — empathetic |
| `ui_tap` | none (or system default light impact) | Near-silent |
| `game_start` | `[60, 40, 60, 40, 60]` | Three quick pulses — "ready, set, go" |
| `level_up` | `[60, 30, 60, 30, 60, 30, 200]` | Rhythmic build + hold |

---

## 4. File Naming & Asset Structure

All audio files should be placed under `assets/sounds/`. Use `.mp3` for broad
compatibility and provide an `.ogg` fallback for Android web views.

```
assets/
└── sounds/
    ├── answer_correct.mp3
    ├── answer_correct.ogg
    ├── answer_wrong.mp3
    ├── answer_wrong.ogg
    ├── answer_timeout.mp3
    ├── answer_timeout.ogg
    ├── streak_3.mp3
    ├── streak_3.ogg
    ├── streak_5.mp3
    ├── streak_5.ogg
    ├── timer_tick.mp3
    ├── timer_tick.ogg
    ├── timer_warning.mp3
    ├── timer_warning.ogg
    ├── battle_start.mp3
    ├── battle_start.ogg
    ├── battle_star_1.mp3
    ├── battle_star_1.ogg
    ├── battle_star_2.mp3
    ├── battle_star_2.ogg
    ├── battle_star_3.mp3
    ├── battle_star_3.ogg
    ├── battle_win.mp3
    ├── battle_win.ogg
    ├── battle_lose.mp3
    ├── battle_lose.ogg
    ├── battle_draw.mp3
    ├── battle_draw.ogg
    ├── ui_tap.mp3
    ├── ui_tap.ogg
    ├── ui_swipe.mp3
    ├── ui_swipe.ogg
    ├── ui_category_select.mp3
    ├── ui_category_select.ogg
    ├── game_start.mp3
    ├── game_start.ogg
    ├── game_end_win.mp3
    ├── game_end_win.ogg
    ├── game_end_neutral.mp3
    ├── game_end_neutral.ogg
    ├── xp_gain.mp3
    ├── xp_gain.ogg
    ├── level_up.mp3
    ├── level_up.ogg
    └── daily_challenge_unlock.mp3
        daily_challenge_unlock.ogg
```

**Audio specs:**
- Sample rate: 44 100 Hz
- Bit depth: 16-bit
- Channels: Mono (saves memory; stereo only for `battle_win` and `level_up`)
- Loudness target: –14 LUFS (normalized, so sounds balance relative to each other)

---

## 5. Implementation Instructions for Claude Code

### 5.1 Create a central sound manager

Create `src/services/SoundManager.ts` (or `.js`). This is the **only** place
in the codebase that imports audio APIs or vibration APIs. All other code calls
this service by event ID string.

```ts
// src/services/SoundManager.ts

import { Vibration, Platform } from 'react-native';
import Sound from 'react-native-sound'; // or expo-av if using Expo

Sound.setCategory('Playback'); // iOS: play even when silent switch is off? 
                               // Set to 'Ambient' if you want to respect it.

// --- Haptic patterns (ms on/off arrays) ---
const HAPTIC_PATTERNS: Record<string, number[]> = {
  answer_correct:   [50],
  answer_wrong:     [80, 60, 80],
  answer_timeout:   [120],
  streak_3:         [40, 30, 40, 30, 80],
  streak_5:         [40, 20, 40, 20, 40, 20, 120],
  timer_warning:    [30],
  battle_star_1:    [60],
  battle_star_2:    [60, 40, 60],
  battle_star_3:    [60, 30, 60, 30, 120],
  battle_win:       [80, 40, 80, 40, 200],
  battle_lose:      [150],
  game_start:       [60, 40, 60, 40, 60],
  level_up:         [60, 30, 60, 30, 60, 30, 200],
};

// --- Preloaded sound cache ---
const soundCache: Record<string, Sound> = {};

const SOUND_FILES = [
  'answer_correct', 'answer_wrong', 'answer_timeout',
  'streak_3', 'streak_5',
  'timer_tick', 'timer_warning',
  'battle_start', 'battle_star_1', 'battle_star_2', 'battle_star_3',
  'battle_win', 'battle_lose', 'battle_draw',
  'ui_tap', 'ui_swipe', 'ui_category_select',
  'game_start', 'game_end_win', 'game_end_neutral',
  'xp_gain', 'level_up', 'daily_challenge_unlock',
];

export function preloadSounds() {
  SOUND_FILES.forEach((id) => {
    const s = new Sound(`${id}.mp3`, Sound.MAIN_BUNDLE, (err) => {
      if (!err) soundCache[id] = s;
    });
  });
}

let soundEnabled = true;
let hapticsEnabled = true;
// Load these from user preferences / AsyncStorage on app start

export function setSoundEnabled(val: boolean) { soundEnabled = val; }
export function setHapticsEnabled(val: boolean) { hapticsEnabled = val; }

export function play(eventId: string) {
  if (soundEnabled && soundCache[eventId]) {
    soundCache[eventId].stop(() => soundCache[eventId].play());
  }
  if (hapticsEnabled && HAPTIC_PATTERNS[eventId]) {
    Vibration.vibrate(HAPTIC_PATTERNS[eventId]);
  }
}
```

> If using **Expo**, replace `react-native-sound` with `expo-av` and
> `Vibration` with `expo-haptics`. The `play()` interface stays the same —
> only the internals of `SoundManager.ts` change.

---

### 5.2 Preload on app launch

In your root component or app entry point (e.g., `App.tsx`), call
`preloadSounds()` once:

```ts
import { preloadSounds } from './src/services/SoundManager';

useEffect(() => {
  preloadSounds();
}, []);
```

---

### 5.3 Wire each event — exact locations

#### Answer selection (`QuizQuestion` component)

```ts
import { play } from '../services/SoundManager';

function handleAnswerPress(answerId: string) {
  const isCorrect = answerId === question.correctAnswerId;
  play(isCorrect ? 'answer_correct' : 'answer_wrong');
  // then update state
}
```

#### Timer (`CountdownTimer` component)

```ts
// Inside the countdown interval:
if (secondsLeft <= 5 && secondsLeft > 0) {
  play('timer_warning');
} else if (secondsLeft > 5) {
  play('timer_tick');
} else {
  play('answer_timeout');
}
```

#### Streak detection (`useStreakTracker` hook or equivalent)

```ts
if (newStreakCount === 3) play('streak_3');
if (newStreakCount === 5) play('streak_5');
// Streaks above 5 can re-fire 'streak_5' every 5 answers, or stay silent
```

#### Battle stars (`BattleResult` component)

Animate stars one by one with a delay between each, firing the sound as each
star becomes visible:

```ts
// After battle round resolves:
const starCount = calculateStars(playerScore, opponentScore);

if (starCount >= 1) {
  setTimeout(() => play('battle_star_1'), 300);
}
if (starCount >= 2) {
  setTimeout(() => play('battle_star_2'), 800);
}
if (starCount === 3) {
  setTimeout(() => play('battle_star_3'), 1300);
}
```

#### Battle win/lose (`BattleEnd` screen)

```ts
useEffect(() => {
  play('battle_start'); // on mount = battle begins
}, []);

// On battle conclusion:
if (result === 'win')  play('battle_win');
if (result === 'lose') play('battle_lose');
if (result === 'draw') play('battle_draw');
```

#### Game start (`GameStartScreen` or countdown overlay)

```ts
// After the 3-2-1 countdown animation completes:
play('game_start');
```

#### Game end (`ResultScreen`)

```ts
const score = getFinalScore();
if (score >= HIGH_SCORE_THRESHOLD) {
  play('game_end_win');
} else {
  play('game_end_neutral');
}
```

#### XP & level up (`XPBar` component)

```ts
play('xp_gain'); // when XP bar animates

if (didLevelUp) {
  setTimeout(() => play('level_up'), 600); // after XP bar fills
}
```

#### UI buttons (global tap feedback)

Wrap your primary `Button` component so it calls `play('ui_tap')` on every
press, avoiding the need to add it at each call site:

```ts
// components/Button.tsx
function Button({ onPress, ...props }) {
  const handlePress = () => {
    play('ui_tap');
    onPress?.();
  };
  return <Pressable onPress={handlePress} {...props} />;
}
```

For swipe transitions, call `play('ui_swipe')` in the navigation
`onTransitionStart` callback.

---

### 5.4 User settings

Expose two toggles in the Settings screen:

| Setting | Key in storage | Controls |
|---|---|---|
| Sound effects | `settings.soundEnabled` | All sounds except timer_tick |
| Vibrations | `settings.hapticsEnabled` | All haptic patterns |

Load both on app start and pass to `setSoundEnabled()` / `setHapticsEnabled()`
in `SoundManager.ts`.

The "mute ticks" preference (section 2.2) can be a third toggle or a sub-option
under Sound effects.

---

### 5.5 iOS silent mode

iOS will silence audio when the device is on silent unless you set the audio
session category to `Playback` (overrides silent switch). **Recommendation:**
use `Ambient` (respects silent switch) — this is standard for casual games and
what Duolingo does. Update the `SoundManager` comment in 5.1 accordingly once
a decision is made.

---

### 5.6 Sourcing / generating the sounds

Since no audio files exist yet, use one of these approaches before wiring the
code:

1. **Freesound.org** — search for the descriptions in section 2. License: CC0
   or CC BY. Most game-jam sound packs work well.
2. **sfxr / jsfxr** (jsfxr.com) — in-browser 8-bit/retro sound generator.
   Great for placeholder sounds during development.
3. **Commissioned audio** — brief a sound designer with section 2 descriptions.
   This is the right call for launch.

Place placeholder `.mp3` files in `assets/sounds/` immediately so the code
compiles and the wiring can be tested end-to-end before real assets arrive.

---

## 6. Quick Reference — Event → Sound → Haptic

| Moment in game | Event ID | Sound feel | Haptic feel |
|---|---|---|---|
| Tap correct answer | `answer_correct` | Bright ding | Single crisp pulse |
| Tap wrong answer | `answer_wrong` | Dull thud | Double buzz |
| Time runs out | `answer_timeout` | Dying sparkler | Long single pulse |
| 3 in a row | `streak_3` | Trill + sizzle | Double-then-accent |
| 5 in a row | `streak_5` | Trill + cork pop | Triple rapid + big accent |
| Timer ticking | `timer_tick` | Dry click | None |
| Last 5 seconds | `timer_warning` | Higher click | Tiny pulse each second |
| Battle starts | `battle_start` | Kitchen bell | Three quick pulses |
| 1st battle star | `battle_star_1` | Single chime | Clean single |
| 2nd battle star | `battle_star_2` | Double chime | Two beats |
| 3rd battle star (perfect) | `battle_star_3` | Triple + glass clink | Two quick + long |
| Win battle | `battle_win` | Fanfare + crowd | Celebratory rhythm + hold |
| Lose battle | `battle_lose` | Slow descend | Long empathetic pulse |
| Draw | `battle_draw` | Two equal notes | None |
| Round starts | `game_start` | 3-note fanfare | Three pulses |
| High score finish | `game_end_win` | Clinking glasses | — |
| Average finish | `game_end_neutral` | Warm chord | — |
| XP awarded | `xp_gain` | Shimmer | — |
| Level up | `level_up` | Triumphant jingle | Build + hold |
