# CogniTest — Report UI Polish Prompt (for a basic/small model)

**Suggested filename:** `CogniTest_UI_POLISH_PROMPT.md`

Give this whole document to the model in one shot. It is written for a **small/basic model**, so every step is spelled out literally: exact file paths, exact strings to find, exact strings to replace them with. Do not skip steps or "improve" beyond what is written. Do not touch any file not listed in this document.

---

## 0. What you are fixing and why

The student report page (`frontend/src/pages/Reports.tsx` and the components in `frontend/src/components/analysis/`) currently uses emoji characters as section icons (💪, 📊, ⚡, 🏁, 📈, 💯, 🔍, 🔧, 🧭, etc.). This looks unpolished ("vibe-coded") next to the rest of the app, which uses a proper icon font (Material Symbols Outlined — you can see it used correctly all over `Reports.tsx` already, e.g. `<span className="material-symbols-outlined">check_circle</span>`).

There is also a broken radar chart in the admin analytics view ("Topic Accuracy Breakdown") that renders invisible or broken. You will fix both problems.

**You will NOT:**
- Change any data-fetching logic, any prop, any TypeScript type, or any business logic (percentages, scores, sorting, filtering).
- Change any text copy (headings, descriptions, tips) — only replace the emoji glyph that precedes it.
- Add new npm packages.
- Touch any file outside the list in Section 6.

**You WILL:**
- Replace every emoji glyph used as a UI icon with a `<span className="material-symbols-outlined">...</span>` icon, styled to match the surrounding text color and size.
- Fix the radar chart so its filled/colored areas actually render.
- Make small, consistent spacing/color cleanups described in Section 4, without restructuring layout.

---

## 1. The icon font is already available — do not add anything

`frontend/index.html` already loads it:
```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
```
So everywhere below, an icon is just:
```tsx
<span className="material-symbols-outlined text-[18px]">icon_name</span>
```
Adjust `text-[18px]` to match the size the emoji was replacing (see the size column in the table below — most emoji here were rendered inline with body/heading text, so match that text's `text-*` size, or use the explicit size given). Adjust color with a `text-{color}` class matching the surrounding text (do not invent new colors — reuse a color already used in that file, e.g. `text-blue-600`, `text-gray-500`, `text-amber-600`).

---

## 2. Exact emoji → icon replacements

Every emoji in these files was found by scanning the actual source (this list is exhaustive for the files in scope — if you find one not listed here, stop and ask; do not guess). For each row: open the file, find the emoji character in context, replace ONLY the emoji (leave the text around it untouched), using the suggested icon name and a color that matches the surrounding heading/text color in that spot.

| File | Emoji | Context (what it precedes) | Replace with | Suggested color |
|---|---|---|---|---|
| `pages/Reports.tsx` (~line 1184) | 💡 | "View Recommended Practice" button label | `lightbulb` | `text-amber-600` (button is already amber-themed) |
| `pages/Reports.tsx` (~line 1192) | 🎯 | "Practice Similar Questions" button label | `target` | `text-indigo-600` (button is already indigo-themed) |
| `components/analysis/SectionCard.tsx` (~line 15, the `tips` bullet renderer, `👉 {t}`) | 👉 | every coaching-tip bullet across ALL sections | `arrow_forward` | `text-gray-400` (matches the existing tip text color) |
| `components/analysis/ScoreboardSection.tsx` (~line 29) | 💪 | "Scoreboard: Where You Stand Right Now" heading | `military_tech` | `text-amber-600` |
| `components/analysis/SubjectWiseSection.tsx` (~line 20) | 📊 | "Subject-Wise Performance Analysis" heading | `bar_chart` | `text-indigo-600` |
| `components/analysis/HitRateSection.tsx` (~line 20) | ⚡ | "Hit Rate vs. Hustle Rate" heading | `bolt` | `text-amber-600` |
| `components/analysis/BatchComparisonSection.tsx` (~line 14) | 🏁 | "You vs. the Batch" heading (appears twice — once in the loading/unavailable variant, once in the main heading) | `flag` | `text-indigo-600` |
| `components/analysis/BatchComparisonSection.tsx` (~line 67) | 🏆 | inside the "You are at the top" note text | `emoji_events` | `text-amber-600` |
| `components/analysis/DifficultySection.tsx` (~line 34) | 📈 | "Difficulty Level Analysis" heading | `trending_up` | `text-indigo-600` |
| `components/analysis/QuestionTypeSection.tsx` (~line 22) | 💯 | "Marks by Question Type: Where You Earn the Most" heading | `percent` | `text-indigo-600` |
| `components/analysis/QuestionBreakdownSection.tsx` (~line 109) | ★ (U+2605, gold-star character, not a full emoji but same treatment) | appended after a percentage when a question was rare-but-correct | `star` (small, `text-[12px]`, inline) | `text-green-700` |
| `components/analysis/FixItZoneSection.tsx` (~line 53) | 🔧 | "Fix It Zone: Because Every Mistake Has a Comeback" heading | `build` | `text-red-500` |
| `components/analysis/FixItZoneSection.tsx` (~line 56) | 🎉 | "Nothing to fix — every question you attempted was correct." success card | `celebration` | `text-green-600` |
| `components/analysis/FixItZoneSection.tsx` (~line 154) | ✏️ | "Fix it" action button label | `edit` | `text-indigo-700` |
| `components/analysis/DrillDownSection.tsx` (~line 41) | 🔍 | "Drill Down Mode: Track Every Concept You Touched" heading | `manage_search` | `text-indigo-600` |
| `components/analysis/DrillDownSection.tsx` (~line 86) | ↳ (U+21B3, a text arrow, not emoji) | prefix on topic sub-rows, e.g. "↳ {topic.label}" | **leave this one alone** — it is a plain typographic arrow, not an emoji, and reads fine as-is. Do not touch it. | — |
| `components/analysis/StrengthsSection.tsx` (~line 18) | 🧭 | "Strength and Improvement Areas" heading | `explore` | `text-gray-700` |
| `components/analysis/StrengthsSection.tsx` (~line 26) | 🚀 | "Your Strengths" sub-heading | `rocket_launch` | `text-green-600` |
| `components/analysis/StrengthsSection.tsx` (next sub-heading, "Areas to Improve" — search for `<span className="text-lg">🎯</span>`) | 🎯 | "Areas to Improve" sub-heading | `track_changes` | `text-amber-600` |
| `components/analysis/StrengthsSection.tsx` (~line 58) | ⭐ | "Your Strong Chapters" sub-heading | `star` | `text-amber-500` |
| `components/analysis/StrengthsSection.tsx` (~line 79) | 📖 | "Your Chapters to Improve" sub-heading | `menu_book` | `text-orange-600` |

**Important detail on `SectionCard.tsx`:** the tip bullets are rendered as `<li>👉 {t}</li>` inside a loop. Change this to render the icon as a sibling element, not string-concatenated text, e.g.:
```tsx
<li className="text-xs text-gray-500 font-medium flex items-start gap-1.5">
  <span className="material-symbols-outlined text-[14px] text-gray-400 flex-shrink-0 mt-0.5">arrow_forward</span>
  <span>{t}</span>
</li>
```
(This one change fixes every tip bullet across every section, since they all go through `SectionCard`.)

**Do not touch these emoji-like glyphs** — they are correct as-is and out of scope:
- The check/cross Material Symbols icons already used everywhere (`check_circle`, `cancel`, `hourglass_empty`) — these are already icons, not emoji, leave them exactly as they are.
- Anything inside `frontend/src/components/demo/` or `frontend/src/pages/DemoReportDetail.tsx` — that is a separate, unrelated feature (the "Demo" student portal). Do not open or edit those files.
- Anything inside `frontend/src/data/mockRecommendations.json` — not a UI file.

---

## 3. Fix the radar chart ("Topic Accuracy Breakdown")

**Where:** `frontend/src/pages/Reports.tsx`, inside the admin cumulative test-analytics view (search for the heading text `Topic Accuracy Breakdown` — it's inside a `<section>` with an inline `<svg>`).

**The bug:** the two data polygons use Tailwind utility classes for their SVG color, built dynamically from a theme object:
```tsx
<polygon
  points={getPoints(categoryAccuracies)}
  fill="none"
  className={`${theme.fill} transition-all duration-500`}
  strokeWidth="0"
/>
<polygon
  points={getPoints(categoryAccuracies)}
  fill="none"
  className={`${theme.stroke} transition-all duration-500`}
  strokeWidth="2.5"
/>
```
where `theme.fill` is a string like `'fill-blue-500/20'` and `theme.stroke` is a string like `'stroke-blue-600'`, both coming from the `SUBJECT_THEMES` object defined near the top of the same component (search for `const SUBJECT_THEMES = {`).

This is fragile for SVG elements and is why the shape is invisible or wrong. **Fix it by using inline `style` with real hex colors instead of Tailwind classes for these two polygons.** This removes the ambiguity entirely.

**Step 1** — find the `SUBJECT_THEMES` object (near the top of `Reports.tsx`, it has `Physics`, `Chemistry`, `Biology`, `Mathematics` keys, each with `fill`, `stroke`, etc.). Immediately after that object's closing `};`, add a new plain hex-color lookup used only for SVG:

```tsx
// Hex colors for SVG fill/stroke — SVG presentation attributes and Tailwind
// utility classes don't mix reliably for dynamically-built class names, so
// the radar chart uses real hex values instead of Tailwind color classes.
const SUBJECT_HEX: Record<string, { fill: string; stroke: string }> = {
  Physics: { fill: 'rgba(59, 130, 246, 0.2)', stroke: '#2563eb' },
  Chemistry: { fill: 'rgba(16, 185, 129, 0.2)', stroke: '#059669' },
  Biology: { fill: 'rgba(245, 158, 11, 0.2)', stroke: '#d97706' },
  Mathematics: { fill: 'rgba(249, 115, 22, 0.2)', stroke: '#ea580c' },
};
```

**Step 2** — inside the admin analytics render section, right before the radar chart's `<svg>` element, add one line to look up the current subject's hex colors (use the same variable name the component already uses to pick the subject, likely `selectedSubject`):
```tsx
const hexTheme = SUBJECT_HEX[selectedSubject] || { fill: 'rgba(107, 114, 128, 0.2)', stroke: '#4b5563' };
```

**Step 3** — replace the two polygon elements shown above with:
```tsx
<polygon
  points={getPoints(categoryAccuracies)}
  fill={hexTheme.fill}
  strokeWidth="0"
  className="transition-all duration-500"
/>
<polygon
  points={getPoints(categoryAccuracies)}
  fill="none"
  stroke={hexTheme.stroke}
  strokeWidth="2.5"
  className="transition-all duration-500"
/>
```
Note the first polygon now sets `fill` directly to the hex/rgba string (no more `fill="none"` — that was overriding the color) and drops the `className={theme.fill}`. The second polygon keeps `fill="none"` (correct — it's an outline) but sets `stroke` directly instead of via `className={theme.stroke}`.

**Step 4** — the small colored dots on the radar chart (search for `className={`${isHovered ? theme.bg : 'fill-white'} ${theme.stroke}`}`}` inside a `<circle>`) have the same problem. Replace that circle's styling the same way: keep `fill="white"` when not hovered, `fill={hexTheme.stroke}` when hovered, and always `stroke={hexTheme.stroke}` — for example:
```tsx
<circle
  cx={x}
  cy={y}
  r={isHovered ? 6 : 4}
  fill={isHovered ? hexTheme.stroke : '#ffffff'}
  stroke={hexTheme.stroke}
  strokeWidth="2"
  className="transition-all duration-150"
  onMouseEnter={...}   // leave all existing event handlers exactly as they are
  onMouseLeave={...}
/>
```
Do not remove or change the `onMouseEnter`/`onMouseLeave` handlers — only change the `fill`/`stroke`/`className` attributes as shown.

**Step 5 — verify:** after this change, run the app, log in as admin, go to Reports → pick a test with graded results → "View Analytics", and confirm the "Topic Accuracy Breakdown" card shows a filled, colored pentagon/polygon shape with a visible colored outline and colored dots at each vertex — not an empty/invisible shape.

---

## 4. Small consistency polish (do these only after Sections 2 and 3 are done and verified)

These are small, low-risk cleanups. Do not restructure any layout, only adjust classes as described.

1. **Unify card headers.** Every section built with `SectionCard` (`components/analysis/*.tsx`) now shows a Material Symbols icon + title, in a consistent size. Confirm the icon size across all of them is `text-xl` or `text-[20px]` (check `SectionCard.tsx`'s heading markup, which currently does `<span className="text-xl leading-none">{emoji}</span>` — change this wrapper span itself to not force emoji-sized rendering; a reasonable replacement is `<span className="material-symbols-outlined text-[22px] leading-none">{icon}</span>` and change the `SectionCard` prop from `emoji: string` to `icon: string` everywhere it's used (in `SectionCard.tsx`'s props type, and in every file that calls `<SectionCard emoji="...">`, rename that prop usage to `icon="..."` using the icon names from the table in Section 2). This is a mechanical rename — search for `emoji=` across `components/analysis/*.tsx` and replace with `icon=`, and update the value from the old emoji character to the new icon name string from the table above.

2. **Icon color inside `SectionCard`.** Since the icon is now a Material Symbols glyph instead of a colored emoji, give it an explicit color so it isn't plain black. In `SectionCard.tsx`, change the icon span to include a color class, e.g. `text-gray-700`, OR (more polished) accept an optional `iconColor` prop (default `text-gray-700`) so each section can pass its own color from the table in Section 2. If you add the prop, update every call site accordingly. If this feels too involved, a flat `text-gray-700` for all section header icons is an acceptable, safe fallback — consistency matters more than per-section color here.

3. **Do not change** the tab bar, the stat cards, the tables, the buttons' shapes, sizes, or existing Tailwind color themes (blue/emerald/amber/red/gray). Only the icon glyphs and the two things above.

---

## 5. Verification checklist (run after every file you change, not just at the end)

From `frontend/`:
```bash
npx tsc -b --noEmit
npm run lint
```
**Known pre-existing failures you did not cause and must not try to fix:** `npx tsc -b --noEmit` will show 6 errors in `src/components/demo/FixItZone.tsx` and `src/components/demo/StrengthsAndImprovements.tsx` (unused-variable errors, `TS6133`/`TS6196`). `npm run lint` will show some pre-existing warnings in files you are not touching. Your bar: no *new* errors or warnings in any file you touched.

After that, manually confirm:
- [ ] No emoji characters remain in `pages/Reports.tsx` or any file in `components/analysis/` (search the files for the specific characters listed in Section 2 — they should all be gone, replaced by `<span className="material-symbols-outlined">`).
- [ ] The `↳` character in `DrillDownSection.tsx` is still there (you were told to leave it).
- [ ] The radar chart on the admin "View Analytics" page shows a visibly filled, colored shape (Section 3, Step 5).
- [ ] The student report page (My Reports → Review Answers on any test) still shows every section exactly where it was before — Scoreboard, Subject-Wise, Hit Rate, Batch Standing, You vs. the Batch, Difficulty, Marks by Question Type, Topic Mastery, AI Insight, Question Breakdown, Fix It Zone, Drill Down, Strengths — just with icons instead of emoji in their headings.
- [ ] Nothing changed about the numbers, tables, or text on the page — only icon glyphs and, if you did item 4.2, icon colors.

## 6. Files you are allowed to touch

- `frontend/src/pages/Reports.tsx`
- `frontend/src/components/analysis/SectionCard.tsx`
- `frontend/src/components/analysis/ScoreboardSection.tsx`
- `frontend/src/components/analysis/SubjectWiseSection.tsx`
- `frontend/src/components/analysis/HitRateSection.tsx`
- `frontend/src/components/analysis/BatchComparisonSection.tsx`
- `frontend/src/components/analysis/DifficultySection.tsx`
- `frontend/src/components/analysis/QuestionTypeSection.tsx`
- `frontend/src/components/analysis/QuestionBreakdownSection.tsx`
- `frontend/src/components/analysis/FixItZoneSection.tsx`
- `frontend/src/components/analysis/DrillDownSection.tsx`
- `frontend/src/components/analysis/StrengthsSection.tsx`

No other file. If you believe a change outside this list is necessary, stop and explain why instead of making it.
