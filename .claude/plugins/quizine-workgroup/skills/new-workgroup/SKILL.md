---
name: new-workgroup
description: Add a new workgroup/segment to the Quizine platform. Use this skill when the user says "new workgroup", "add workgroup", "new segment", or "/new-workgroup". Guides through collecting all required information and implements all changes across quiz app, admin app, and database.
argument-hint: [workgroup-name]
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash, mcp__supabase__execute_sql, mcp__supabase__apply_migration]
---

# New Workgroup Skill

This skill adds a fully working new workgroup/segment to the Quizine platform. It covers every layer: database tables, quiz app config, admin app tab, branding, logo, colors, and starter categories.

## Step 1 — Gather Information

Start by asking the user these questions ONE AT A TIME in a conversational flow. Do NOT ask them all at once. After each answer, confirm you understood before moving on.

Ask in this order:

1. **Workgroup name** — "What is the name of the new workgroup? (e.g. 'Voo', 'Hej Bistro')"
   - Derive from the answer:
     - `WORKGROUP_NAME` — display name (e.g. "Retail" or "Voo")
     - `WORKGROUP_ID` — lowercase, no spaces (e.g. "retail" or "voo")
     - `AREA_KEY` — Swedish internal key used in `profiles.area` column. Ask if unclear (e.g. "handel" or "sjukvard"). This is the DB-stored value.
     - `TABLE_PREFIX` — same as `WORKGROUP_ID` + underscore (e.g. "retail_" or "voo_")

2. **Logo** — "What logo should be used? Please describe it or provide an asset file name (e.g. 'health-icon-1-stethoscope.png'). It should be placed in `hej-bistro-quiz/assets/`."
   - Record `LOGO_FILE` — e.g. "retail-logo.png"
   - Note: if it's an SVG drawn inline, note the SVG details instead.

3. **Tagline** — "What is the tagline for this workgroup? (shown in the quiz app under the logo, e.g. 'Quiz för kroganställda')"
   - Record `TAGLINE`

4. **Brand color** — "What is the brand/neon accent color for the quiz app? (hex code, e.g. '#9B5DE5' for restaurant, '#36E0E0' for healthcare)"
   - Record `BRAND_COLOR`

5. **Neon line** — "What is the neon sub-line shown under the logo? (e.g. '~ open all night ~' or '~ alltid i tjänst ~')"
   - Record `NEON_LINE`

6. **Admin sidebar color** — "What background color should the admin sidebar have for this workgroup? (hex code, e.g. '#be185d' for VOO pink, '#1E1040' for Quizine purple)"
   - Record `ADMIN_SIDEBAR_COLOR`

7. **Story button text** — "What text should the 'share a story' button have? (e.g. 'Berätta en kroghistoria' or 'Berätta en arbetshistoria')"
   - Record `STORY_BUTTON_TEXT` and `STORY_TITLE` (emoji + title, e.g. '🏥 Berätta en arbetshistoria')

8. **Starting question categories** — "What question categories should this workgroup start with? List 4–8 topics (e.g. for healthcare: Anatomy, Diagnoses & Symptoms, Emergency & First Aid, Medications, Patient Care, Medical History, Ethics, Workplace Safety)."
   - Record as `CATEGORIES` array. Each category needs:
     - `id` — lowercase_underscore (e.g. "anatomy_body")
     - `label` — display name (e.g. "Anatomi & kropp")
     - `emoji` — relevant emoji (e.g. "🫀")
     - `description` — short Swedish description

9. **Daily app presence** — "Should this workgroup also get a segment in **daily.quizine.se** (the `daily-quizine` app)? (yes/no)"
   - If yes, ask the daily-specific sub-questions below (9a–9f). If no, skip to the summary.

   9a. **Daily hero text** — "What should the daily quiz hero say? Give the three parts:
       - `heroLine1` — e.g. 'Dagens quiz'
       - `heroLine2Start` — e.g. 'är ' (or empty string '')
       - `heroEm` — the emphasized punchline word, e.g. 'serverat.' or 'ordinerat.'"

   9b. **Daily copy lines** — "Two lines of tagline copy shown under the hero:
       - `heroCopyLine1` — e.g. 'Visa vad du kan om livet på krogen.'
       - `heroCopyLine2` — e.g. 'Tävla med kollegorna.'"

   9c. **Daily card info** — "What should the daily quiz card be called? Give:
       - `cardTitle` — e.g. 'Dagens meny' or 'Dagens journal'
       - `cardIcon` — emoji, e.g. '📋' or '💉'"

   9d. **EKG animation** — "Should the VOO-style EKG pulse animation be shown for this segment? (yes/no)"
       - Record `SHOW_EKG` (true/false)

   9e. **CSS color theme** — "Provide the CSS theme for this segment. At minimum I need:
       - `--bg` — darkest background (e.g. '#060C0C')
       - `--gold` / `--gold-light` — the primary accent color and a lighter variant (e.g. from your brand color)
       - `--gold-glow` — rgba glow version of the accent (e.g. 'rgba(0, 184, 169, 0.25)')
       - `--cream` / `--white` — light text color (e.g. '#E8F4F3')
       You can leave the rest (bg-card, bg-card-2, border, etc.) and I'll derive them from the bg color."

   9f. **Segment logo SVG** — "Describe the SVG logo for `SegmentLogo.tsx`. The existing ones are small 38×38 containers with an inline SVG (24×24 viewBox 0 0 52 52). Describe the icon shape, stroke color (usually your brand/accent color), and glow filter color."

After all questions are answered (including daily sub-questions if applicable), show a summary table and ask: "Does this look correct? Shall I proceed with the implementation?"

---

## Step 2 — Implementation

Once confirmed, implement all changes in this order. Mark each step as done before moving to the next.

---

### 2.1 — Quiz App: `appConfig.ts`

File: `hej-bistro-quiz/src/lib/appConfig.ts`

Add the new workgroup to `TABLE_MAPS`:

```typescript
// Add alongside existing 'quizine' and 'voo' entries:
[WORKGROUP_ID]: {
  questions:    '[TABLE_PREFIX]remote_questions',
  tofQuestions: '[TABLE_PREFIX]truth_or_false_questions',
  battles:      '[TABLE_PREFIX]battles',
  challenges:   '[TABLE_PREFIX]challenges',
  feedback:     '[TABLE_PREFIX]feedback',
  stories:      '[TABLE_PREFIX]restaurant_stories',
  submissions:  '[TABLE_PREFIX]submitted_questions',
  complaints:   '[TABLE_PREFIX]question_complaints',
  scores:       '[TABLE_PREFIX]scores',
  attempts:     '[TABLE_PREFIX]question_attempts',
  leaderboard:  '[TABLE_PREFIX]leaderboard',
},
```

Also add to `RPC_MAPS`:

```typescript
[WORKGROUP_ID]: {
  questionStats: '[WORKGROUP_ID]_get_question_stats',
  battlesPerDay: '[WORKGROUP_ID]_get_battles_per_day',
},
```

Also update the `AppId` type to include the new workgroup ID.

---

### 2.2 — Quiz App: `branding.ts`

File: `hej-bistro-quiz/src/lib/branding.ts`

1. Add `[AREA_KEY]` to the `Area` type union.
2. Add new entry to `AREA_BRANDING`:

```typescript
[AREA_KEY]: {
  label: '[WORKGROUP_NAME full label]',
  brandName: '[WORKGROUP_NAME]',
  brandColor: '[BRAND_COLOR]',
  neonLine: '[NEON_LINE]',
  icon: '[EMOJI]',
  tagline: '[TAGLINE]',
  storyButtonText: '[STORY_BUTTON_TEXT]',
  storyTitle: '[STORY_TITLE]',
},
```

---

### 2.3 — Quiz App: `categories.ts`

File: `hej-bistro-quiz/src/data/categories.ts`

1. Add `[WORKGROUP_ID_UPPER]_CATEGORIES` constant with all the categories the user specified.
2. Update `getCategoriesForArea()` to return the new categories when `area === '[AREA_KEY]'`.

Example pattern to follow:
```typescript
export const RETAIL_CATEGORIES: Category[] = [
  { id: 'customer_service', label: 'Kundservice', emoji: '🤝', description: 'Frågor om kundmöten och service' },
  // ... more categories
];

export function getCategoriesForArea(area: Area): Category[] {
  if (area === 'sjukvard') return VOO_CATEGORIES;
  if (area === '[AREA_KEY]') return [WORKGROUP_ID_UPPER]_CATEGORIES;
  return CATEGORIES;
}
```

---

### 2.4 — Quiz App: Logo asset + HomeScreen updates

File location: `hej-bistro-quiz/assets/[LOGO_FILE]`

Remind the user: "You'll need to drop the logo file `[LOGO_FILE]` into `hej-bistro-quiz/assets/` manually if it's not already there."

Then update `HomeScreen.tsx` to render the new logo when `area === '[AREA_KEY]'`:

File: `hej-bistro-quiz/src/screens/HomeScreen.tsx`

Find the area logo rendering block (currently checks `area === 'krogen'` and `area === 'sjukvard'`) and add an `else if` branch:

```typescript
} else if (area === '[AREA_KEY]') {
  return (
    <Image
      source={require('../../assets/[LOGO_FILE]')}
      style={{ width: 56, height: 56 }}
      resizeMode="contain"
    />
  );
}
```

---

### 2.4b — Quiz App: "Hur funkar det?" help modal

**This modal is shared across all areas in the same app.** Every time a new workgroup is added you must verify the modal contains the full canonical set of game mode sections. The modal lives inside `HomeScreen.tsx` — find the `{/* Help modal */}` block.

The content must include ALL of these sections in this order:

```tsx
<Text style={styles.helpSection}>📅 Daily Quiz</Text>
<Text style={styles.modalBody}>
  {'Daily Quiz öppnas i din webbläsare som en ny flik — utanför appen. Varje dag finns ett nytt frågesset att klara. Svara på alla frågor och slå ditt bästa resultat!'}
</Text>

<Text style={styles.helpSection}>🎯 Quiz-läget</Text>
<Text style={styles.modalBody}>
  {'Välj en kategori och svara på 10 frågor. Du har 20 sekunder per fråga — ju snabbare du svarar rätt, desto mer poäng. Max 150 poäng per fråga (100 bas + 50 tidsbonus). Svarar du fel visas rätt svar med en förklaring.'}
</Text>

<Text style={styles.helpSection}>❤️ Överlevnadsläge</Text>
<Text style={styles.modalBody}>
  {'Du startar med 3 liv. Varje fel kostar ett liv — svara rätt och håll din svit igång så länge som möjligt. Ditt rekord sparas per kategori.'}
</Text>

<Text style={styles.helpSection}>✅ Sant eller Falskt</Text>
<Text style={styles.modalBody}>
  {'Läs påståendet och svep höger om det är sant, vänster om det är falskt. Du har 7 sekunder per påstående och spelar 3 rundor med ökande svårighet.'}
</Text>

<Text style={styles.helpSection}>⚔️ Battle-läget</Text>
<Text style={styles.modalBody}>
  {'Utmana en vän på ett ämne du väljer. Ni spelar var för sig i er egen takt — när ni båda är klara räknas poängen ihop och den med flest poäng vinner.\n\nHar du fått en utmaning? En banner visas på startsidan — tryck på den för att hoppa direkt in i din match.'}
</Text>

<Text style={styles.helpSection}>👥 Lägga till vänner</Text>
<Text style={styles.modalBody}>
  {'Tryck på vänner-ikonen 👥 uppe till höger på startsidan.\n\nSök på en kollegas smeknamn och skicka en vänförfrågan. När de accepterar kan ni utmana varandra i Battle-läget.\n\nGlöm inte att sätta ett smeknamn på din profil — annars kan ingen hitta dig!'}
</Text>
```

If the new workgroup lives in a **separate app repository** (like `voo.quizine.se` is separate from `hej-bistro-quiz`), the same modal content must be applied in that repo's `HomeScreen.tsx` as well — it is NOT shared across repos automatically.

---

### 2.5 — Admin App: `product.ts`

File: `hej-bistro-admin/lib/product.ts`

1. Add `'[WORKGROUP_ID]'` to the `Product` type union.
2. Add entry to `PRODUCTS` array:

```typescript
{ id: '[WORKGROUP_ID]', label: '[WORKGROUP_NAME]', icon: '[EMOJI]' },
```

---

### 2.6 — Admin App: `Sidebar.tsx`

File: `hej-bistro-admin/components/Sidebar.tsx`

Find where the sidebar background color is set based on product (currently handles `'voo'` and default `'quizine'`). Add the new workgroup:

```typescript
const sidebarBg =
  product === 'voo' ? '#be185d'
  : product === '[WORKGROUP_ID]' ? '[ADMIN_SIDEBAR_COLOR]'
  : '#1E1040';
```

Also update any active-nav highlight color logic similarly.

---

### 2.7 — Admin App: `tailwind.config.ts`

File: `hej-bistro-admin/tailwind.config.ts`

Add the new sidebar color to the tailwind theme:

```typescript
'sidebar-[workgroup-id]': '[ADMIN_SIDEBAR_COLOR]',
```

---

### 2.8 — Admin App: `admin.ts` (Supabase client)

File: `hej-bistro-admin/lib/supabase/admin.ts`

If the new workgroup will use a SEPARATE Supabase project (ask the user: "Will this workgroup use its own separate Supabase project, or share the same database?"):

**Same database (most common):** No changes needed here — it uses table prefixes on the same project.

**Separate project:** Add env vars for the new workgroup following the VOO pattern:
```typescript
const url = product === 'voo' && vooConfigured ? process.env.NEXT_PUBLIC_VOO_SUPABASE_URL!
  : product === '[WORKGROUP_ID]' && [workgroupId]Configured ? process.env.NEXT_PUBLIC_[WORKGROUP_ID_UPPER]_SUPABASE_URL!
  : process.env.NEXT_PUBLIC_SUPABASE_URL!;
```

Also update `.env.local.example` with the new env var names.

---

### 2.9 — Database: SQL migration

Generate a SQL file at `hej-bistro-admin/supabase/[workgroup_id]_tables.sql` with ALL the following tables (using the `[TABLE_PREFIX]` prefix). Follow the exact same structure as `voo_tables.sql`:

Tables to create:
- `[TABLE_PREFIX]remote_questions` — same columns as `remote_questions`
- `[TABLE_PREFIX]submitted_questions` — same as `submitted_questions`
- `[TABLE_PREFIX]question_complaints` — same as `question_complaints`
- `[TABLE_PREFIX]question_attempts` — same as `question_attempts`
- `[TABLE_PREFIX]scores` — same as `scores`
- `[TABLE_PREFIX]battles` — same as `battles`
- `[TABLE_PREFIX]challenges` — same as `challenges`
- `[TABLE_PREFIX]feedback` — same as `feedback`
- `[TABLE_PREFIX]restaurant_stories` — same as `restaurant_stories`
- `[TABLE_PREFIX]leaderboard` — VIEW (same logic as `leaderboard` but referencing prefixed tables)
- RPC: `[WORKGROUP_ID]_get_question_stats()` — same body as `get_question_stats()` but using `[TABLE_PREFIX]remote_questions`
- RPC: `[WORKGROUP_ID]_get_battles_per_day()` — same body as `get_battles_per_day()` but using `[TABLE_PREFIX]battles`

**To generate the SQL:** Read `hej-bistro-admin/supabase/voo_tables.sql` and do a global find-replace of `voo_` → `[TABLE_PREFIX]` and `voo` → `[WORKGROUP_ID]` in all table names, view names, and RPC names. Then write the result as a new file.

After writing the SQL file, ask the user: "Should I apply this migration to Supabase now? (yes/no)"
- If yes: use `mcp__supabase__apply_migration` with the SQL content.
- If no: tell them to run it manually from `hej-bistro-admin/supabase/[workgroup_id]_tables.sql`.

---

### 2.10 — Add `area` column filter support (Truth or False questions)

The `truth_or_false_questions` table uses a shared table with `area` column filtering. Ensure `[AREA_KEY]` is a valid value that can be stored in `profiles.area`.

No SQL migration needed — just verify that wherever `profiles.area` is validated or type-checked, the new `[AREA_KEY]` value is accepted.

---

### 2.11 — Cross-segment battle/challenge support

When a player from one segment challenges or battles a player from another segment, the joiner must be able to load the creator's questions even though they come from a different Supabase table. This is handled by `fetchQuestionsByIds` in `remoteQuestions.ts`, which queries **all known questions tables in parallel**.

**Every time a new segment is added, add its questions table to this function in BOTH apps:**

File: `hej-bistro-quiz/src/lib/remoteQuestions.ts`
File: `voo.quizine.se/src/lib/remoteQuestions.ts` (if it exists as a separate repo)

Find the `fetchQuestionsByIds` function and add a `Promise.all` entry for the new table:

```typescript
export async function fetchQuestionsByIds(ids: string[]): Promise<Question[]> {
  if (!ids.length) return [];
  const [r1, r2, r3] = await Promise.all([
    supabase.from('remote_questions').select('*').in('id', ids),
    supabase.from('voo_remote_questions').select('*').in('id', ids),
    supabase.from('[TABLE_PREFIX]remote_questions').select('*').in('id', ids),  // ← ADD THIS
  ]);
  const all = [...(r1.data ?? []), ...(r2.data ?? []), ...(r3.data ?? [])].map(rowToQuestion);
  return ids
    .map(id => all.find(q => q.id === id))
    .filter((q): q is Question => q !== undefined);
}
```

**Why this matters:** `GameScreen` and `BattleRoundScreen` call `fetchQuestionsByIds` when joining a challenge/battle. If the new segment's table is not in the parallel query, cross-segment players will land on a "Laddar..." screen that never resolves — the questions are silently not found and the game never starts.

**No changes needed** to `GameScreen.tsx` or `BattleRoundScreen.tsx` themselves — they already await `fetchQuestionsByIds` and call `startChallengeGameWithQuestions` with the result.

---

---

## Step 2.B — daily.quizine.se Implementation (if opted in)

Only execute this block if the user answered **yes** to question 9. All files are inside `daily-quizine/`.

---

### 2.B.1 — `src/config/segments.ts`

File: `daily-quizine/src/config/segments.ts`

Add a new entry to the `CONFIGS` record:

```typescript
[WORKGROUP_ID]: {
  id: '[WORKGROUP_ID]',
  name: 'Quizine Daily',
  subtitle: '[TAGLINE]',
  icon: '[EMOJI]',
  heroLine1: '[heroLine1]',
  heroLine2Start: '[heroLine2Start]',
  heroEm: '[heroEm]',
  heroCopyLine1: '[heroCopyLine1]',
  heroCopyLine2: '[heroCopyLine2]',
  cardTitle: '[cardTitle]',
  cardIcon: '[cardIcon]',
  startBtnIcon: '[EMOJI]',
  showStoryButton: [true/false based on whether STORY_BUTTON_TEXT was provided],
  showBackLink: true,
  localStoragePrefix: '[WORKGROUP_ID]_',
  showEkg: [SHOW_EKG],
},
```

---

### 2.B.2 — `src/index.css`

File: `daily-quizine/src/index.css`

Add a new `html[data-segment="[WORKGROUP_ID]"]` block after the existing `html[data-segment="voo"]` block. Use the colors from question 9e. Derive `--bg-card`, `--bg-card-2`, `--border`, `--border-light` by slightly lightening `--bg` (add ~10–20 in hex per channel). Copy the full block structure from the `voo` theme, replacing accent values:

```css
/* ── [WORKGROUP_NAME] theme ── */
html[data-segment="[WORKGROUP_ID]"] {
  --bg:           [--bg];
  --bg-card:      [derived];
  --bg-card-2:    [derived];
  --border:       [derived];
  --border-light: [derived];

  --gold:         [--gold];
  --gold-light:   [--gold-light];
  --gold-glow:    [--gold-glow];
  --rust:         [darker variant of gold];
  --rust-light:   [slightly lighter];
  --cream:        [--cream];
  --white:        [--white];

  --orange:       [--gold];
  --orange-light: [lighter tint];
  --orange-dark:  [--gold or slightly darker];
  --orange-glow:  [--gold-glow];

  --text-muted:   [mid-tone tint of accent];
  --text-dim:     [darker tint];

  --timer-bar:    linear-gradient(90deg, [darker accent] 0%, [--gold] 80%, [light tint] 100%);
  --timer-tip:    [--gold];
}
```

---

### 2.B.3 — `src/lib/categories.ts`

File: `daily-quizine/src/lib/categories.ts`

Add all of the workgroup's categories (from question 8) to `CATEGORY_DISPLAY`:

```typescript
// [WORKGROUP_NAME] categories
[category_id]: { name: '[label]', emoji: '[emoji]', desc: '[description]' },
// ... (one entry per category)
```

---

### 2.B.4 — `src/lib/questions.ts`

File: `daily-quizine/src/lib/questions.ts`

Extend `QUESTIONS_TABLE` to include the new segment. Read the file first to see the current ternary pattern, then extend it:

```typescript
// Current pattern example:
const QUESTIONS_TABLE = SEGMENT === 'voo' ? 'voo_remote_questions' : 'remote_questions'

// Extended pattern:
const QUESTIONS_TABLE =
  SEGMENT === 'voo' ? 'voo_remote_questions'
  : SEGMENT === '[WORKGROUP_ID]' ? '[TABLE_PREFIX]remote_questions'
  : 'remote_questions'
```

---

### 2.B.5 — `src/components/SegmentLogo.tsx`

File: `daily-quizine/src/components/SegmentLogo.tsx`

Add a new branch before the default return for the new segment. The logo is a 38×38 container with an inline SVG (viewBox "0 0 52 52"). Use the accent color from question 9e as the stroke and glow filter color. Base the SVG path/shape on the description from question 9f.

**The SVG shape MUST match the logo used on the `daily.quizine.se` landing page (`daily-quizine/landing-page.html`).** Read that file first and copy the exact paths for the matching segment card icon, updating only stroke-width to 2.5 (from 2) for the React version.

```tsx
if (SEGMENT === '[WORKGROUP_ID]') {
  return (
    <div style={{
      width: 38, height: 38,
      background: 'var(--bg-card-2)',
      border: '1px solid var(--border-light)',
      borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 14px var(--gold-glow)',
      flexShrink: 0,
    }}>
      <svg width="24" height="24" viewBox="0 0 52 52" fill="none"
        style={{ filter: 'drop-shadow(0 0 5px [BRAND_COLOR])' }}>
        {/* SVG paths copied from the matching card in landing-page.html */}
      </svg>
    </div>
  )
}
```

---

### 2.B.6 — Score & Hall of Fame isolation

**Critical:** Every segment must have its own isolated leaderboard and Hall of Fame. Scores from different segments must never appear in each other's lists.

The `daily_scores` table has a `segment` column (added via `supabase/add_segment_to_daily_scores.sql`). The `dailyScores.ts` library already filters all reads and writes by `SEGMENT`. Since the new Vite config sets `__SEGMENT__` to `'[WORKGROUP_ID]'`, no extra code change is needed — the isolation is automatic as long as:

1. The `segment` column exists in `daily_scores` (run the migration if not already done).
2. The new segment's `localStoragePrefix` in `segments.ts` is unique (e.g. `'[WORKGROUP_ID]_'`) — this keeps local played-state and session data isolated too.

Verify by checking `daily-quizine/src/lib/dailyScores.ts` — every Supabase query must include `.eq('segment', SEGMENT)`. If a new query is added in future, always include this filter.

---

### 2.B.7 — `vite.config.[WORKGROUP_ID].ts`

File: `daily-quizine/vite.config.[WORKGROUP_ID].ts`

Create a new Vite config file following the pattern of `vite.config.voo.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: '[WORKGROUP_ID]-html',
      transformIndexHtml(html: string) {
        return html
          .replace(
            'Quizine Daily – Dagens quiz för restaurangfolk',
            'Quizine Daily – [WORKGROUP_NAME]',
          )
          .replace(
            /<meta name="description"[^>]*>/,
            '<meta name="description" content="[meta description for this segment]" />',
          )
      },
    },
  ],
  base: '/[WORKGROUP_ID]/',
  build: {
    outDir: 'dist/[WORKGROUP_ID]',
  },
  define: {
    __SEGMENT__: JSON.stringify('[WORKGROUP_ID]'),
  },
})
```

Remind the user: "To build this segment run: `npx vite build --config vite.config.[WORKGROUP_ID].ts`"

---

## Step 3 — Checklist Summary

After all changes, print a checklist for the user (include the daily-quizine block only if the user opted in at question 9):

```
✅ appConfig.ts — TABLE_MAPS and RPC_MAPS updated
✅ branding.ts — Area type and AREA_BRANDING updated
✅ categories.ts — [WORKGROUP]_CATEGORIES added, getCategoriesForArea updated
✅ HomeScreen.tsx — Logo rendering added
✅ HomeScreen.tsx — "Hur funkar det?" modal verified/updated with all 6 sections
✅ product.ts — Product type and PRODUCTS array updated
✅ Sidebar.tsx — Admin sidebar color added
✅ tailwind.config.ts — Tailwind sidebar color added
✅ remoteQuestions.ts — fetchQuestionsByIds updated with new segment's table (cross-segment battles)
⬜ Logo asset — Drop [LOGO_FILE] into hej-bistro-quiz/assets/ (manual step)
✅ [workgroup_id]_tables.sql — SQL migration generated
⬜ Supabase migration — Applied (or pending manual run)
⬜ .env.local — Add any new env vars (if separate Supabase project)

-- daily.quizine.se (only if opted in) --
✅ segments.ts — CONFIGS entry added (unique localStoragePrefix)
✅ index.css — html[data-segment] theme block added
✅ categories.ts (daily) — CATEGORY_DISPLAY entries added
✅ questions.ts — QUESTIONS_TABLE extended
✅ SegmentLogo.tsx — logo branch added (matching landing-page.html SVG)
✅ Score isolation — dailyScores.ts filters by SEGMENT; migration run
✅ vite.config.[WORKGROUP_ID].ts — new Vite config created
```

Then say: "The new **[WORKGROUP_NAME]** workgroup is ready. Don't forget to add the logo file to `assets/` and run the SQL migration if not already applied. To build the daily segment: `npx vite build --config vite.config.[WORKGROUP_ID].ts`"

---

## Key File Reference

These are the exact files modified for every new workgroup. Always read them before editing.

| File | Purpose |
|------|---------|
| `hej-bistro-quiz/src/lib/appConfig.ts` | TABLE_MAPS, RPC_MAPS, AppId type |
| `hej-bistro-quiz/src/lib/branding.ts` | Area type, AREA_BRANDING |
| `hej-bistro-quiz/src/data/categories.ts` | Category constants, getCategoriesForArea |
| `hej-bistro-quiz/src/screens/HomeScreen.tsx` | Logo rendering, area change handler |
| `hej-bistro-quiz/src/lib/scores.ts` | getUserProfile, Area usage |
| `hej-bistro-quiz/src/lib/remoteQuestions.ts` | fetchQuestionsByIds — add new table for cross-segment battles |
| `voo.quizine.se/src/lib/remoteQuestions.ts` | Same — if separate repo |
| `hej-bistro-admin/lib/product.ts` | Product type, PRODUCTS array |
| `hej-bistro-admin/components/Sidebar.tsx` | Sidebar color, product display |
| `hej-bistro-admin/tailwind.config.ts` | Tailwind colors |
| `hej-bistro-admin/lib/supabase/admin.ts` | Multi-project Supabase client |
| `hej-bistro-admin/.env.local.example` | Env var documentation |
| `hej-bistro-admin/supabase/voo_tables.sql` | Template for new SQL migration |
| `daily-quizine/src/config/segments.ts` | Segment config (hero text, card, flags) |
| `daily-quizine/src/index.css` | Per-segment CSS color theme |
| `daily-quizine/src/lib/categories.ts` | CATEGORY_DISPLAY entries |
| `daily-quizine/src/lib/questions.ts` | QUESTIONS_TABLE segment routing |
| `daily-quizine/src/components/SegmentLogo.tsx` | Inline SVG logo per segment |
| `daily-quizine/vite.config.voo.ts` | Template for new segment Vite config |
