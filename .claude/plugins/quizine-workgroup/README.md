# Quizine Workgroup Plugin

A Claude Code plugin that guides you through adding a complete new workgroup (segment) to the Quizine platform. One command — it asks you everything it needs, then implements all the changes across the quiz app, admin app, and database.

## How to use

In any Claude Code session inside this project, type:

```
/new-workgroup
```

Claude will ask you 8 questions, show a summary, and implement everything once you confirm.

## What it asks

1. **Workgroup name** — display name, internal ID, Swedish area key (stored in `profiles.area`), table prefix
2. **Logo** — asset file name in `hej-bistro-quiz/assets/`
3. **Tagline** — shown under the logo in the quiz app
4. **Brand color** — neon accent hex color for the quiz app (e.g. `#9B5DE5`)
5. **Neon line** — sub-line text under the logo (e.g. `~ open all night ~`)
6. **Admin sidebar color** — hex background color for the admin sidebar tab
7. **Story button text** — text for the "share a story" button + story screen title
8. **Starting categories** — 4–8 question topic categories with id, label, emoji, description

## What it changes

| File | What changes |
|------|-------------|
| `hej-bistro-quiz/src/lib/appConfig.ts` | Adds new entry to `TABLE_MAPS` and `RPC_MAPS`, extends `AppId` type |
| `hej-bistro-quiz/src/lib/branding.ts` | Extends `Area` type, adds entry to `AREA_BRANDING` |
| `hej-bistro-quiz/src/data/categories.ts` | Adds `[WORKGROUP]_CATEGORIES` constant, updates `getCategoriesForArea()` |
| `hej-bistro-quiz/src/screens/HomeScreen.tsx` | Adds logo rendering for the new area |
| `hej-bistro-admin/lib/product.ts` | Extends `Product` type, adds to `PRODUCTS` array |
| `hej-bistro-admin/components/Sidebar.tsx` | Adds sidebar color for new workgroup |
| `hej-bistro-admin/tailwind.config.ts` | Adds Tailwind color token |
| `hej-bistro-admin/supabase/[workgroup]_tables.sql` | Generates full SQL migration with all prefixed tables |

It also optionally applies the SQL migration directly to Supabase via MCP.

## Manual step after running the skill

Drop the logo image file into `hej-bistro-quiz/assets/` — Claude cannot upload binary files for you.

---

## Installation on a new computer

Since this plugin lives inside `.claude/plugins/` at the project root, it is included automatically whenever you open this project in Claude Code. No extra setup needed — just clone the repo and it works.

### If you want the skill available globally (any project)

Copy the plugin folder to your user-level Claude plugins directory:

**Windows:**
```
xcopy /E /I ".claude\plugins\quizine-workgroup" "%USERPROFILE%\.claude\plugins\quizine-workgroup"
```

**Mac/Linux:**
```
cp -r .claude/plugins/quizine-workgroup ~/.claude/plugins/quizine-workgroup
```

### Verifying the skill is active

In Claude Code, type `/help` and look for `new-workgroup` in the skill list.

---

## Existing workgroups for reference

| Workgroup | Area key | Table prefix | Brand color | Admin sidebar |
|-----------|----------|--------------|-------------|---------------|
| Hej Bistro (restaurant) | `krogen` | *(none — base tables)* | `#9B5DE5` | `#1E1040` |
| VOO (healthcare) | `sjukvard` | `voo_` | `#36E0E0` | `#be185d` |

## Skill file location

```
.claude/
└── plugins/
    └── quizine-workgroup/
        ├── README.md          ← you are here
        └── skills/
            └── new-workgroup/
                └── SKILL.md   ← the skill definition Claude reads
```
