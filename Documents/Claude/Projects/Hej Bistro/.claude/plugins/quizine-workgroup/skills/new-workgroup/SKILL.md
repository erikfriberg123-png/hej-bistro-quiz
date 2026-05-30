---
name: new-workgroup
description: Phase 2 of adding a new segment to the Quizine platform. Run this AFTER creating the segment in the admin Segment Wizard and running the SQL migration. Guides daily-quizine theming, mobile placeholder, and packages/config registration. Use when user says "new workgroup", "add workgroup", "/new-workgroup", or "set up the daily for [segment]".
argument-hint: [segment-id]
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash, mcp__supabase__execute_sql]
---

# New Workgroup Skill — Phase 2 (Daily + Mobile)

**This skill is Phase 2.** Phase 1 is done in the admin panel:
- Admin → Segment → Nytt segment → fill name/icon/colors/categories → run SQL migration

After Phase 1, the segment already appears in the admin (Frågor, Statistik, Stories, Feedback, Klagomål, Daily) automatically. This skill handles what the admin cannot: the daily web app theming and the mobile app placeholder.

---

## Step 1 — Load segment from database

If the user passed a segment ID as an argument, use it. Otherwise ask:
> "Which segment are we setting up? Give me the segment ID (e.g. 'transport', 'bygg')."

Then read the segment from the database to pre-fill everything you can:

```sql
SELECT id, label, icon, brand_color, sidebar_color, categories
FROM segments
WHERE id = '[SEGMENT_ID]';
```

Use `mcp__supabase__execute_sql` to run this. Extract:
- `SEGMENT_ID` — e.g. `transport`
- `LABEL` — display name, e.g. `Transport & Logistik`
- `ICON` — emoji, e.g. `🚚`
- `BRAND_COLOR` — hex accent, e.g. `#FF6B2B`
- `SIDEBAR_COLOR` — hex sidebar bg
- `CATEGORIES` — JSON array of `{ id, name, icon, color }` objects

Confirm what you found:
> "I found **[LABEL]** ([SEGMENT_ID]) with accent color [BRAND_COLOR] and [N] categories: [list category names]. Does this look right?"

---

## Step 2 — Gather daily app design info

Ask these questions ONE AT A TIME. After each answer confirm before continuing.

**2a. Daily hero text** — the three-part headline on the daily quiz page:
> "What should the hero headline say on the daily page? Give me three parts:
> - Line 1 — e.g. 'Dagens quiz'
> - Line 2 start — e.g. 'är ' (or leave blank)
> - Emphasized word — the punchline, e.g. 'levererat.' or 'serverat.'"

Record: `HERO_LINE1`, `HERO_LINE2_START`, `HERO_EM`

**2b. Daily copy lines** — two taglines under the hero:
> "Two short taglines shown under the hero, e.g.:
> - 'Visa vad du kan om livet på krogen.'
> - 'Tävla med kollegorna.'"

Record: `COPY_LINE1`, `COPY_LINE2`

**2c. Daily card** — the quiz card shown before the player starts:
> "What should the daily quiz card be called? Give:
> - Card title — e.g. 'Dagens meny', 'Dagens körning', 'Dagens journal'
> - Card icon — emoji, e.g. '🚚', '📋'"

Record: `CARD_TITLE`, `CARD_ICON`

**2d. CSS color theme** — the visual theme for this segment's daily page:
> "Provide the CSS colors for this segment's daily page. At minimum:
> - `--bg` — darkest background (e.g. '#060C0C')
> - `--gold` — primary accent (can use your brand color [BRAND_COLOR])
> - `--gold-light` — lighter accent variant
> - `--gold-glow` — rgba glow, e.g. 'rgba(255, 107, 43, 0.25)'
> - `--cream` — light text color, e.g. '#F5EFE6'
> I'll derive `--bg-card`, `--border`, etc. from `--bg` automatically."

Record: `CSS_BG`, `CSS_GOLD`, `CSS_GOLD_LIGHT`, `CSS_GOLD_GLOW`, `CSS_CREAM`

**2e. SVG logo** — the segment logo shown in the daily app header:
> "Describe the SVG logo for this segment. The logo is a 38×38 container with a 24×24 SVG (viewBox 0 0 52 52). Describe:
> - The icon shape (e.g. a truck, a hard hat, a stethoscope)
> - Stroke color (usually your brand color [BRAND_COLOR])
> - Any glow filter color (usually same as brand color)"

Record: `SVG_DESCRIPTION`, `SVG_STROKE_COLOR`

---

## Step 3 — Gather mobile app info

**3a. Tagline** — shown under the logo in the mobile quiz app:
> "What tagline should appear under the logo in the mobile app? (e.g. 'Quiz för restaurangfolk', 'Quiz för transportproffs')"

Record: `TAGLINE`

**3b. Neon sub-line** — the decorative line under the tagline:
> "What neon decorative sub-line? (e.g. '~ alltid i rörelse ~', '~ open all night ~')"

Record: `NEON_LINE`

**3c. Story button** — the "share a story" button text:
> "What should the story-sharing button say? (e.g. 'Berätta en kroghistoria', 'Berätta en transporthistoria')"

Record: `STORY_BUTTON_TEXT`. Derive `STORY_TITLE` as `[ICON] [STORY_BUTTON_TEXT]`.

**3d. Mobile logo** — the logo asset for the mobile quiz app:
> "What logo should the mobile app show for this segment?
> - Option A: An image file (drop it into `hej-bistro-quiz/assets/` and tell me the filename)
> - Option B: Use an emoji placeholder for now (tell me which emoji)"

Record: `MOBILE_LOGO` — either a filename (e.g. `logo_transport.png`) or an emoji.

---

## Step 4 — Show summary and confirm

Print a summary table:

| Field | Value |
|-------|-------|
| Segment ID | `[SEGMENT_ID]` |
| Label | [LABEL] |
| Icon | [ICON] |
| Brand color | [BRAND_COLOR] |
| Categories | [N] categories |
| Hero | [HERO_LINE1] / [HERO_EM] |
| Card | [CARD_ICON] [CARD_TITLE] |
| Tagline (mobile) | [TAGLINE] |
| Neon line | [NEON_LINE] |
| Mobile logo | [MOBILE_LOGO] |

Ask: "Does this look correct? Shall I proceed?"

---

## Step 5 — Implementation

Implement all changes in order. Mark each ✅ before moving to the next.

---

### 5.1 — `packages/config/src/segments.ts`

File: `Hej Bistro/packages/config/src/segments.ts`

Add one `SegmentDefinition` to the `SEGMENTS` array. Use values from the DB + Step 2:

```typescript
{
  id: '[SEGMENT_ID]',
  tablePrefix: '[SEGMENT_ID]_',
  areaKey: '[SEGMENT_ID]',
  label: '[LABEL]',
  icon: '[ICON]',
  brandColor: '[BRAND_COLOR]',
  adminSidebarColor: '[SIDEBAR_COLOR]',
  disabled: true,
  daily: {
    title: 'Quizine Daily – [LABEL]',
    description: '[COPY_LINE1] [COPY_LINE2]',
  },
},
```

**What auto-derives from this entry:**
- `daily-quizine/viteSegmentConfig.ts` — Vite build title/description (already reads from this)
- `hej-bistro-quiz/src/lib/appConfig.ts` — TABLE_MAPS and RPC_MAPS

---

### 5.2 — `packages/config/src/categories.ts`

File: `Hej Bistro/packages/config/src/categories.ts`

Add a new category array using the categories from the database (already fetched in Step 1). For the `description` field use the category name expanded into a full sentence, or ask the user for short descriptions if needed.

```typescript
export const [SEGMENT_ID_UPPER]_CATEGORIES: CategoryDefinition[] = [
  { id: '[cat.id]', name: '[cat.name]', icon: '[cat.icon]', color: '[cat.color]', description: '[short description]' },
  // ... one per category from DB
]
```

Then add to `SEGMENT_CATEGORIES` record and `ALL_CATEGORIES` array:
```typescript
const SEGMENT_CATEGORIES: Record<string, CategoryDefinition[]> = {
  // ... existing entries
  [SEGMENT_ID]: [SEGMENT_ID_UPPER]_CATEGORIES,
}

export const ALL_CATEGORIES: CategoryDefinition[] = [
  // ... existing arrays
  ...[SEGMENT_ID_UPPER]_CATEGORIES,
]
```

**What auto-derives from this:**
- `daily-quizine/src/lib/categories.ts` — CATEGORY_DISPLAY + CATEGORY_COLORS (already imports from @quizine/config)

---

### 5.3 — `daily-quizine/src/config/segments.ts`

File: `Hej Bistro/daily-quizine/src/config/segments.ts`

Add entry to the `CONFIGS` record — **always `disabled: true`** for new segments:

```typescript
[SEGMENT_ID]: {
  id: '[SEGMENT_ID]',
  name: 'Quizine Daily',
  subtitle: '[TAGLINE]',
  icon: '[ICON]',
  heroLine1: '[HERO_LINE1]',
  heroLine2Start: '[HERO_LINE2_START]',
  heroEm: '[HERO_EM]',
  heroCopyLine1: '[COPY_LINE1]',
  heroCopyLine2: '[COPY_LINE2]',
  cardTitle: '[CARD_TITLE]',
  cardIcon: '[CARD_ICON]',
  startBtnIcon: '[ICON]',
  showStoryButton: true,
  showBackLink: true,
  localStoragePrefix: '[SEGMENT_ID]_',
  showEkg: false,
  disabled: true,
},
```

When `disabled: true` the daily app automatically shows a "Kommer snart" page for this segment's URL. To launch: remove `disabled: true`.

---

### 5.4 — `daily-quizine/src/index.css`

File: `Hej Bistro/daily-quizine/src/index.css`

Add a theme block after the last `html[data-segment="..."]` block. Derive `--bg-card`, `--bg-card-2`, `--border`, `--border-light` by adding ~10–20 to each channel of `--bg`. Copy the full structure from the `voo` theme, replacing all accent values:

```css
/* ── [LABEL] theme ── */
html[data-segment="[SEGMENT_ID]"] {
  --bg:           [CSS_BG];
  --bg-card:      [CSS_BG lightened ~10];
  --bg-card-2:    [CSS_BG lightened ~18];
  --border:       [CSS_BG lightened ~25];
  --border-light: [CSS_BG lightened ~35];

  --gold:         [CSS_GOLD];
  --gold-light:   [CSS_GOLD_LIGHT];
  --gold-glow:    [CSS_GOLD_GLOW];
  --rust:         [slightly darker than gold];
  --rust-light:   [slightly lighter];
  --cream:        [CSS_CREAM];
  --white:        #ffffff;

  --orange:       [CSS_GOLD];
  --orange-light: [CSS_GOLD_LIGHT];
  --orange-dark:  [CSS_GOLD];
  --orange-glow:  [CSS_GOLD_GLOW];

  --text-muted:   [mid-tone tint];
  --text-dim:     [darker tint];

  --timer-bar:    linear-gradient(90deg, [darker gold] 0%, [CSS_GOLD] 80%, [CSS_GOLD_LIGHT] 100%);
  --timer-tip:    [CSS_GOLD];
}
```

---

### 5.5 — `daily-quizine/src/components/SegmentLogo.tsx`

File: `Hej Bistro/daily-quizine/src/components/SegmentLogo.tsx`

Add a new `if (SEGMENT === '[SEGMENT_ID]')` branch before the default return. The logo is a 38×38 container with an inline SVG using the description from Step 2e:

```tsx
if (SEGMENT === '[SEGMENT_ID]') {
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
        style={{ filter: 'drop-shadow(0 0 5px [SVG_STROKE_COLOR])' }}>
        {/* SVG paths based on: [SVG_DESCRIPTION] */}
        {/* stroke="[SVG_STROKE_COLOR]" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" */}
      </svg>
    </div>
  )
}
```

---

### 5.6 — `daily-quizine/src/components/CreateQuestionModal.tsx`

File: `Hej Bistro/daily-quizine/src/components/CreateQuestionModal.tsx`

Add the segment's category IDs to the `SEGMENT_CATEGORIES` record:

```typescript
const SEGMENT_CATEGORIES: Record<string, string[]> = {
  // ... existing entries
  [SEGMENT_ID]: ['[cat_id_1]', '[cat_id_2]', /* ... all category IDs from Step 1 */],
}
```

---

### 5.7 — `daily-quizine/vite.config.[SEGMENT_ID].ts`

File: `Hej Bistro/daily-quizine/vite.config.[SEGMENT_ID].ts`

Two lines — title/description auto-derive from `packages/config`:

```typescript
import { createSegmentViteConfig } from './viteSegmentConfig'
export default createSegmentViteConfig('[SEGMENT_ID]')
```

Tell the user: "To build this segment: `npx vite build --config vite.config.[SEGMENT_ID].ts`"

---

### 5.8 — `hej-bistro-quiz/src/lib/branding.ts`

File: `Hej Bistro/hej-bistro-quiz/src/lib/branding.ts`

1. Add `'[SEGMENT_ID]'` to the `Area` type union.
2. Add `'[SEGMENT_ID]'` to the `AREAS` array.
3. Add entry to `AREA_BRANDING` — **always `disabled: true`**:

```typescript
[SEGMENT_ID]: {
  label: '[LABEL]',
  brandName: '[LABEL]',
  brandColor: '[BRAND_COLOR]',
  neonLine: '[NEON_LINE]',
  icon: '[ICON]',
  tagline: '[TAGLINE]',
  authTagline: '[TAGLINE short]',
  storyButtonText: '[STORY_BUTTON_TEXT]',
  storyButtonIcon: '[ICON]',
  storyTitle: '[STORY_TITLE]',
  storySubtitle: 'Intressanta historier kan publiceras på sajten.',
  storyPlaceholder: 'Berätta en intressant händelse som du varit med om på jobbet.',
  dailyPath: '[SEGMENT_ID]',
  disabled: true,
},
```

Disabled areas appear greyed out with "Snart" badge in the WelcomeScreen automatically — no other changes needed there.

---

### 5.9 — `hej-bistro-quiz/src/screens/HomeScreen.tsx` (logo branch)

File: `Hej Bistro/hej-bistro-quiz/src/screens/HomeScreen.tsx`

Find the logo rendering block (the chain of `area === 'krogen'`, `area === 'it'`, etc.) and add:

**If `MOBILE_LOGO` is a file:**
```typescript
} else if (area === '[SEGMENT_ID]') {
  return (
    <Image
      source={require('../../assets/[MOBILE_LOGO]')}
      style={{ width: 56, height: 56 }}
      resizeMode="contain"
    />
  );
}
```
Remind the user: "Drop `[MOBILE_LOGO]` into `hej-bistro-quiz/assets/`."

**If `MOBILE_LOGO` is an emoji:** No code change needed — the fallback renders the icon emoji.

---

### 5.10 — `hej-bistro-quiz/src/lib/remoteQuestions.ts` (cross-segment battles)

File: `Hej Bistro/hej-bistro-quiz/src/lib/remoteQuestions.ts`

Add the new segment's questions table to the `fetchQuestionsByIds` parallel query so cross-segment battles work:

```typescript
export async function fetchQuestionsByIds(ids: string[]): Promise<Question[]> {
  if (!ids.length) return [];
  const results = await Promise.all([
    supabase.from('remote_questions').select('*').in('id', ids),
    supabase.from('voo_remote_questions').select('*').in('id', ids),
    // ... existing segment tables
    supabase.from('[SEGMENT_ID]_remote_questions').select('*').in('id', ids), // ← ADD
  ]);
  const all = results.flatMap(r => r.data ?? []).map(rowToQuestion);
  return ids
    .map(id => all.find(q => q.id === id))
    .filter((q): q is Question => q !== undefined);
}
```

---

## Step 6 — Checklist

After all changes, print:

```
-- packages/config --
✅ segments.ts — SegmentDefinition added (auto-derives Vite title, TABLE_MAPS, RPC_MAPS)
✅ categories.ts — [SEGMENT_ID_UPPER]_CATEGORIES added + SEGMENT_CATEGORIES + ALL_CATEGORIES

-- daily-quizine --
✅ src/config/segments.ts — CONFIGS entry added (disabled: true → shows "Kommer snart")
✅ src/index.css — html[data-segment="[SEGMENT_ID]"] theme block added
— src/lib/categories.ts — AUTO-DERIVED from @quizine/config (no edit needed)
✅ src/components/SegmentLogo.tsx — SVG logo branch added
✅ src/components/CreateQuestionModal.tsx — SEGMENT_CATEGORIES entry added
✅ vite.config.[SEGMENT_ID].ts — 2-line file created

-- hej-bistro-quiz --
✅ src/lib/branding.ts — Area type, AREA_BRANDING entry (disabled: true), AREAS updated
— src/lib/appConfig.ts — AUTO-DERIVED from packages/config (no edit needed)
— src/data/categories.ts — AUTO-DERIVED from packages/config (no edit needed)
✅ src/screens/HomeScreen.tsx — logo branch added (or emoji, no change needed)
✅ src/lib/remoteQuestions.ts — [SEGMENT_ID]_remote_questions added to fetchQuestionsByIds
⬜ hej-bistro-quiz/assets/[MOBILE_LOGO] — drop file here manually (if using image, not emoji)
```

Then say:

> "**[LABEL]** is set up and disabled everywhere. It shows 'Kommer snart' on the daily page and appears greyed out in the mobile app.
>
> To activate:
> - **Daily**: remove `disabled: true` from `daily-quizine/src/config/segments.ts`
> - **Mobile**: remove `disabled: true` from `hej-bistro-quiz/src/lib/branding.ts`
> - **Admin**: the segment is already live in admin — add questions and it's ready.
>
> To build the daily segment: `npx vite build --config vite.config.[SEGMENT_ID].ts`"

---

## Key File Reference

| File | Purpose |
|------|---------|
| `packages/config/src/segments.ts` | Segment registry — auto-derives Vite config, TABLE_MAPS, RPC_MAPS |
| `packages/config/src/categories.ts` | Category registry — auto-derives daily CATEGORY_DISPLAY + CATEGORY_COLORS |
| `daily-quizine/src/config/segments.ts` | Daily hero text, card, flags — `disabled: true` = Kommer snart |
| `daily-quizine/src/index.css` | Per-segment CSS color theme |
| `daily-quizine/src/components/SegmentLogo.tsx` | SVG logo per segment |
| `daily-quizine/src/components/CreateQuestionModal.tsx` | Category IDs for user question submission |
| `daily-quizine/viteSegmentConfig.ts` | Reads title/description from packages/config — no edit needed |
| `daily-quizine/vite.config.[id].ts` | 2-line segment build config |
| `hej-bistro-quiz/src/lib/branding.ts` | Area type, AREA_BRANDING, AREAS — `disabled: true` = greyed out in app |
| `hej-bistro-quiz/src/screens/HomeScreen.tsx` | Logo rendering per area |
| `hej-bistro-quiz/src/lib/remoteQuestions.ts` | fetchQuestionsByIds — add table for cross-segment battles |

**Admin-side files — no changes ever needed:**
All admin pages (Frågor, Statistik, Stories, Feedback, Klagomål, Daily) auto-derive from `getNavSegments()` which reads the `segments` DB table. The segment is already live in admin the moment the SQL migration runs.
