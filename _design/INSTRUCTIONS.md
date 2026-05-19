# Hej Bistro Quiz — Project Instructions for Claude Code

## Overview

You are building **Hej Bistro Quiz**, a mobile trivia game targeting restaurant industry workers (servers, bartenders, kitchen staff). Think Duolingo meets Kahoot, niche for the restaurant world.

The core loop is: pick a category → answer timed questions → get scored → feel motivated to play again.

**Guiding principle throughout:** MVP mindset. Simple, fast, fun. Do not over-engineer. Prioritize game feel and engagement over architecture elegance.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React Native + Expo (managed workflow) | Fast iteration, iOS + Android from one codebase |
| Language | TypeScript (strict mode) | Type safety from day one |
| State | Zustand | Minimal boilerplate, easy to reason about |
| Navigation | React Navigation v6 (native stack) | Standard, well-documented |
| Persistence | AsyncStorage | Local highscores, streak, settings — no backend needed in MVP |
| Animations | React Native Reanimated v3 | Smooth 60fps animations for the timer and feedback |
| Styling | StyleSheet API (no third-party UI lib) | Keep it lean; we control every pixel |

No backend, no auth, no database in MVP. Everything runs locally on device.

---

## Project Structure

```
/src
  /screens
    HomeScreen.tsx          — Category picker + start button
    GameScreen.tsx          — Active quiz loop (core screen)
    ResultScreen.tsx        — Score summary after a round

  /components
    QuestionCard.tsx        — Displays question text
    AnswerButton.tsx        — One of four answer options, handles pressed/correct/wrong states
    SparklerTimer.tsx       — Animated countdown timer (the signature visual)
    ScoreBadge.tsx          — Live score display during game
    CategoryCard.tsx        — Tappable card on HomeScreen

  /data
    questions.ts            — Array of all Question objects (50–100 entries, see schema below)
    categories.ts           — Category definitions (id, name, icon, color)

  /store
    gameStore.ts            — Zustand store: score, currentQuestion, streak, highscores

  /utils
    scoring.ts              — Score calculation logic
    shuffle.ts              — Fisher-Yates shuffle for question ordering

  /types
    index.ts                — Shared TypeScript interfaces
```

---

## Data Types

```typescript
// /src/types/index.ts

export type CategoryId =
  | 'food_drink'
  | 'professional'
  | 'service_guests'
  | 'industry_culture'
  | 'fun_reallife';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  category: CategoryId;
  question: string;
  answers: [string, string, string, string]; // exactly 4, always
  correctIndex: 0 | 1 | 2 | 3;
  difficulty: Difficulty;
}

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;        // emoji or icon name
  color: string;       // hex, used for card background
  description: string;
}

export interface GameResult {
  categoryId: CategoryId;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  date: string; // ISO string
}
```

---

## Game Loop (GameScreen)

```
1. On mount: fetch 10 questions from selected category, shuffle order
2. Show QuestionCard with question text
3. Show 4 AnswerButtons (answers shuffled per question)
4. Start SparklerTimer (15 seconds)
5. User taps an answer:
   a. Stop timer immediately
   b. Highlight selected button: green if correct, red if wrong
   c. Highlight correct answer green (always, even if user was wrong)
   d. Calculate score: see Scoring section below
   e. Wait 1200ms (let user absorb feedback)
   f. Advance to next question
6. Timer reaches 0:
   a. Treat as wrong answer (0 points)
   b. Flash correct answer green briefly
   c. Wait 1000ms
   d. Advance to next question
7. After question 10: navigate to ResultScreen with round summary
```

No skipping questions. No going back. Forward momentum only.

---

## Scoring System

```typescript
// /src/utils/scoring.ts

const BASE_SCORE = 100;
const MAX_TIME_BONUS = 50;
const TIMER_DURATION = 15; // seconds

export function calculateScore(isCorrect: boolean, timeRemainingSeconds: number): number {
  if (!isCorrect) return 0;
  const timeBonus = Math.round((timeRemainingSeconds / TIMER_DURATION) * MAX_TIME_BONUS);
  return BASE_SCORE + timeBonus;
}

// Max per question: 150 points
// Max per round (10 questions): 1500 points
```

---

## SparklerTimer Component — Critical Detail

This is the signature visual of the app. It must feel alive and create urgency.

**Behavior:**
- Circular progress ring that depletes over 15 seconds
- Center shows remaining seconds (large, bold)
- Color transitions: green (15–8s) → yellow (7–4s) → red (3–0s)
- At 3 seconds: add a subtle shake/pulse animation
- When timer expires: brief flash animation before moving on

**Implementation notes:**
- Use React Native Reanimated for the animation (not Animated API)
- The ring should animate smoothly at 60fps
- Receive props: `duration` (ms), `onExpire` (callback), `isRunning` (boolean)
- Must pause when answer is selected (isRunning = false)

---

## Screens

### HomeScreen
- App name / logo at top
- Grid of CategoryCards (2 columns)
- Each card: colored background, emoji icon, category name
- Tap a card → start game with that category
- Show personal highscore per category below card (from AsyncStorage)
- Bottom: small "How to play" link (modal or simple screen)

### GameScreen
- Top bar: current score (live), question counter (e.g. "3 / 10")
- SparklerTimer centered below top bar
- QuestionCard: white card, large readable question text
- 4 AnswerButtons below: full-width, stacked vertically, rounded corners
- No back button. No menu. Nothing distracting.

### ResultScreen
- Big score number (animate it counting up)
- "X out of 10 correct"
- Personal highscore: show if beaten ("New record! 🎉") or current best
- Two buttons: "Play Again" (same category) and "Change Category" (back to home)
- Share score button (native share sheet) — optional but nice

---

## Question Content Requirements

Provide at least **50 questions** spread across all 5 categories (minimum 8 per category). Questions must:

- Be relevant to restaurant industry workers in Sweden and internationally
- Cover varying difficulty: ~40% easy, 40% medium, 20% hard
- Be unambiguous — one clearly correct answer
- Feel natural and sometimes fun/humorous (especially in the "fun_reallife" category)

**Example questions to include:**

```typescript
{
  id: 'q_001',
  category: 'professional',
  question: 'What does "mise en place" mean?',
  answers: ['Cleaning the kitchen', 'Everything in its place', 'A French dessert', 'Closing time'],
  correctIndex: 1,
  difficulty: 'easy',
},
{
  id: 'q_002',
  category: 'food_drink',
  question: 'Which grape variety is Champagne primarily made from?',
  answers: ['Sauvignon Blanc', 'Riesling', 'Chardonnay', 'Merlot'],
  correctIndex: 2,
  difficulty: 'medium',
},
{
  id: 'q_003',
  category: 'fun_reallife',
  question: 'A guest asks for the manager after waiting 5 minutes. What do you do first?',
  answers: ['Panic', 'Apologize and fetch the manager immediately', 'Explain how busy it is', 'Ignore and hope they calm down'],
  correctIndex: 1,
  difficulty: 'easy',
},
```

---

## Visual Design Direction

> **Reference file:** `design-guidelines.png` in the project root. Always open and follow this image. It contains the full color palette, typography, UI components, screen mockups, and app flow. What follows is a written summary — the image is the source of truth.

**Theme:** Dark UI. The app uses a deep dark purple/navy background throughout. This is not a light-mode app.

**Color palette:**
- App background: `#12082A` (deep dark purple)
- Category card 1 (Food & Drink): `#FF6B35` (orange)
- Category card 2 (Professional): `#F7C948` (yellow/gold)
- Category card 3 (Service & Guests): `#2EC4B6` (teal)
- Category card 4 (Industry & Culture): `#9B5DE5` (purple/violet)
- Category card 5 (Fun / Real-life): `#F15BB5` (pink)
- Correct answer highlight: `#4CAF50` (green)
- Wrong answer highlight: `#F44336` (red)
- Card/surface background: `#1E1040` (slightly lighter than app background)
- Text primary: `#FFFFFF`
- Text secondary: `#B0A8C8`

**Typography:**
- Font family: **Poppins** (load via `expo-font` or `@expo-google-fonts/poppins`)
- Headings / score: Poppins Bold, 28–36px
- Question text: Poppins SemiBold, 18–20px
- Answer buttons: Poppins Medium, 16px
- Supporting text: Poppins Regular, 14px
- Tagline style (result screen): Poppins ExtraBold, uppercase, large — matches "SNABBT, KUL & LÄRORIKT!" energy

**UI principles:**
- Dark cards with slightly rounded corners (borderRadius: 16) on dark background
- Category cards are colorful and bold — each has its own accent color
- Answer buttons: dark surface with colored left border or full highlight on selection
- Large tap targets (min 56px height for buttons)
- Generous padding (16–24px)
- Smooth transitions between questions (fade or slide)
- Haptic feedback on answer selection (Expo Haptics)
- Mascot: a cartoon chef character appears on HomeScreen and ResultScreen — use the character from the design guide as visual reference for any illustrated elements

**XP / Score display:**
- The design shows score as "+120 XP" style — use this format for points awarded after each correct answer
- ResultScreen shows a win/loss summary in a scoreboard style (e.g. "4–2")

---

## Zustand Store

```typescript
// /src/store/gameStore.ts

interface GameState {
  // Current game session
  selectedCategory: CategoryId | null;
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  answers: (boolean | null)[]; // null = unanswered

  // Persistence
  highscores: Record<CategoryId, number>;
  streak: number;           // days in a row played
  lastPlayedDate: string;   // ISO date string

  // Actions
  startGame: (categoryId: CategoryId) => void;
  submitAnswer: (answerIndex: number, timeRemaining: number) => void;
  nextQuestion: () => void;
  endGame: () => void;
  resetGame: () => void;
}
```

Persist `highscores`, `streak`, and `lastPlayedDate` to AsyncStorage. The active game session (questions, score, index) lives only in memory.

---

## Retention Mechanics (include in MVP)

**Daily streak:**
- Track last played date in AsyncStorage
- On app open: check if played today. If yesterday → increment streak. If gap > 1 day → reset to 1.
- Show streak count on HomeScreen (e.g. "🔥 7 day streak")

**Highscore per category:**
- Store in AsyncStorage, display on HomeScreen under each CategoryCard
- Celebrate on ResultScreen if beaten

---

## What NOT to build in MVP

Do not implement any of these until the core loop is solid:

- User accounts or authentication
- Backend / API / database
- Multiplayer or real-time challenges
- User-generated questions (UGC)
- Leaderboards
- Push notifications
- Onboarding tutorial (beyond a simple "how to play" screen)
- In-app purchases

---

## Definition of Done (MVP)

The app is ready for internal testing when:

- [ ] HomeScreen shows all 5 categories and personal highscores
- [ ] Tapping a category starts a 10-question game
- [ ] SparklerTimer animates smoothly and expires correctly
- [ ] All 4 answer states work: default, pressed, correct, wrong
- [ ] Score is calculated correctly with time bonus
- [ ] ResultScreen shows score, correct count, and highscore status
- [ ] "Play Again" and "Change Category" work
- [ ] Highscore persists between app restarts
- [ ] Streak counter increments and persists
- [ ] At least 50 questions exist across all categories
- [ ] No crashes on fast tapping or rapid navigation
- [ ] Works on both iOS and Android via Expo Go

---

## Commands to Get Started

```bash
npx create-expo-app hej-bistro-quiz --template blank-typescript
cd hej-bistro-quiz
npx expo install react-native-reanimated @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context zustand @react-native-async-storage/async-storage expo-haptics
```

Then build in this order:
1. `/src/types/index.ts` — shared types
2. `/src/data/categories.ts` and `/src/data/questions.ts` — all content
3. `/src/utils/scoring.ts` and `/src/utils/shuffle.ts`
4. `/src/store/gameStore.ts`
5. `/src/components/SparklerTimer.tsx` — get this right before anything else
6. `/src/components/AnswerButton.tsx`
7. `/src/components/QuestionCard.tsx`
8. `/src/screens/GameScreen.tsx` — wire it all together
9. `/src/screens/ResultScreen.tsx`
10. `/src/screens/HomeScreen.tsx`
11. App.tsx — set up navigation

Build and test each component in isolation before wiring screens together.
