# Diabeto Design Rules

Diabeto is diabetes care for elderly Indian patients, their families, coaches and doctors. Seniors use it through WhatsApp; families and staff use the web app in `apps/web`.

**Read this before adding or changing any UI.** It is written for AI coding tools first (Claude Code, Cursor, v0…), and for teammates second. The hard rules are checkable: if a change breaks one, it is wrong, however good it looks.

> Status: the brand basics (font, accent colour, wordmark) are **provisional** until the team signs off. Everything else is agreed.

---

## 0. Hard rules (checklist)

Check every UI change against this list.

**Accessibility**
- [ ] Body text is **at least 17px** (the `html` root size). Don't go below `text-sm` (≈15px) for anything people need to read. `text-xs` is allowed only for timestamps and the EN/HI/MR tag. On family screens, body copy is never below 16px.
- [ ] Text contrast is **at least 7:1** (`--ink`, `--ink-2` on white). UI borders and icons are at least 3:1 (`--line-strong`).
- [ ] Tap targets are **at least 48 × 48px** (`min-h-12`). Primary actions on family and senior screens are **at least 56px** (`min-h-14`).
- [ ] Every size is in **rem or Tailwind units**, never `px` for text or spacing, so Simple mode can scale it.
- [ ] Every control has a visible label or `aria-label`. Icons alone are never the only label.
- [ ] Focus is always visible (the global `:focus-visible` ring). Never remove outlines.
- [ ] Respect `prefers-reduced-motion`. No auto-playing animation, carousels or parallax.

**Clinical safety**
- [ ] **Colour is never the only signal.** Every status has a word, plus a dot, a left rule or an icon.
- [ ] Red (`--danger`) is **only** for critical: critical lows/highs, failed delivery, blocked AI drafts. Never decorative, never for a primary button.
- [ ] Emergency info (112 / 108, "give 3 teaspoons of sugar") is shown in full, never truncated, never behind a tap.
- [ ] Anything AI-written is **labelled** ("AI draft", "Not verified") until a person approves it.
- [ ] Nothing in the UI suggests changing a medicine dose or makes a diagnosis.
- [ ] Glucose numbers always carry the unit: `58 mg/dL`.
- [ ] If a caregiver lacks `view_raw_glucose`, show the word ("Very low"), never the number.

**Language**
- [ ] Every family/senior string goes through `t()` in `lib/i18n.ts` with **en, hi and mr** versions. No hard-coded English on those screens.
- [ ] Hindi and Marathi use **Western digits** (0-9), matching the glucose meter.
- [ ] Any element containing Hindi or Marathi has the matching `lang="hi"` / `lang="mr"` attribute.

**Layout**
- [ ] No horizontal page scroll at **360px** width. Wide tables scroll inside their own container.
- [ ] One primary action per screen section. On family/senior screens, one main task per screen.

---

## 1. Two modes, one system

Same tokens, font and status rules everywhere. Density changes by audience.

| | **Calm** — family & senior | **Compact** — staff (doctor, coach, admin) |
| --- | --- | --- |
| Screens | `/`, `/family/*`, `/senior` | `/clinician`, `/coach`, `/admin` |
| Canvas | White `--bg` | Soft neutral `--canvas` (`bg-canvas`) with white panels (`Panel`) |
| Width | `max-w-2xl` (≈680px), single column | up to `max-w-[1440px]`, table + right rail |
| Text | 17–20px body, 28–34px headings | 15–17px body, compact table rows (`py-2.5`) |
| Containers | Almost none: content on the page, separated by spacing and hairlines | White `Panel` with a 1px border and a header row |
| Per screen | One main task, ≤ 1 alert shown in Simple mode | Many things at once, ordered by urgency |
| Navigation | Bottom tab bar on phones (Home, Alerts, Add, Help) | Top nav on desktop, bottom tab bar on phones |

**Simple mode** (on by default, toggle in settings):
- Raises the root font size from 17px to 20px, which scales all rem-based text, spacing and targets.
- Screens read `settings.simple` and **show less**: fewer alerts, no secondary charts or columns, bigger call buttons (`size="xl"`).
- Never hide safety information in Simple mode (alerts, emergency numbers, medicine status).

---

## 2. Visual tokens

Defined in `apps/web/app/globals.css` and exposed as Tailwind colours (`bg-brand`, `text-ink-2`…). **Never hard-code hex values in components**; add a token instead.

### Colour

| Token | Value | Use |
| --- | --- | --- |
| `--bg` / `--surface` | `#ffffff` | Page and panel background |
| `--surface-2` | `#f5f5f3` | Hover, table header, disabled fill |
| `--ink` | `#111111` | Main text |
| `--ink-2` | `#555555` | Secondary text (still 7:1) |
| `--line` | `#e6e6e3` | Hairlines between rows and sections |
| `--line-strong` | `#8a8a85` | Input borders, unchecked controls (3:1) |
| `--brand` *(provisional)* | `#1a5c48` | Primary buttons, links, active state. The **only** accent. `--brand-hover` for hover |
| `--canvas` | `#f6f6f3` | Staff dashboard background only |
| `--ok` | `#067647` | "In range", "Taken", "Verified" |
| `--warn` | `#93370d` | Text for high, due, needs attention, window closed |
| `--attention` | `#dc8a00` | Amber **marks** only (dots, left rules, bars). Too light for text |
| `--danger` | `#b42318` | Critical only. `--danger-hover` for hover; charts use `--mark-critical` `#d92d20` |
| `--info` | `#1d4f91` | "Needs doctor sign-off", focus ring |
| WhatsApp (`--wa-*`) | WhatsApp's own greens | **Only** inside the `/senior` chat preview |

Status colours map to severity levels in `lib/types.ts`: `normal` → ok, `watch`/`urgent` → warn text + attention marks, `critical` → danger.

### Typography *(provisional)*
- **Noto Sans** (Latin) + **Noto Sans Devanagari**: one family, so English, Hindi and Marathi look even side by side.
- Weights: **400** body, **500** for emphasis inside text, **600** headings, numbers and buttons. Avoid 700+ and thin weights (< 400).
- Numbers that line up (tables, metrics) use the `.tabular` class.
- Devanagari gets more line height automatically (`:lang(hi)`, `:lang(mr)` → 1.65).
- Headings use sentence case, never ALL CAPS.

### Shape and space
- Radius: **8px** buttons and inputs (`rounded-lg`), **6px** small controls, **12px** at most for containers. No pill shapes except the toggle switch and small badges. The `/senior` chat imitates WhatsApp (rounded bubbles, round buttons) — that's the only exception.
- Borders: 1px hairlines (`--line`) between things; 1.5px for inputs and secondary buttons.
- Shadows: none, except the side panel (`shadow-xl`) and the toggle knob.
- Spacing: family screens separate sections with `gap-10`; staff screens use `gap-5` between panels.

### Brand *(provisional)*
- Wordmark is lowercase text, `diabeto.`, with the dot in `--brand`. No logo icon, no icon-in-a-square.

---

## 3. Elderly accessibility

1. **One task per screen** on family and senior screens. The home screen answers one question first: *"Is my parent OK?"*
2. **Plain status sentence first**, then details: "● Urgent — act now", then the alert, then medicines.
3. **Big, labelled buttons.** Calls are real `tel:` links (`CallButton`). Emergency numbers 112 and 108 are always one tap away on family screens.
4. **Confirm before saving** anything typed (echo-back): "Is this correct? 58 mg/dL, Fasting". This mirrors the WhatsApp flow.
5. **No hidden gestures.** No swipe-only, long-press-only or hover-only actions. Tooltips are extras, never the only place information lives.
6. **Forgiving inputs.** Numeric inputs use `inputMode="numeric"`; out-of-range values (outside 20–600) get a plain message, not a red box alone.
7. **Familiar patterns.** Native radio buttons, real links, a bottom tab bar on phones. Don't invent controls.
8. **Seniors don't use the web app.** Senior UI is WhatsApp: short messages, at most 2 reply buttons, voice notes. Design senior features as WhatsApp messages first (`templates/messages.json`).

---

## 4. Clinical safety UI

| Situation | Pattern | Component |
| --- | --- | --- |
| Critical alert (sugar < critical_low or ≥ critical_high) | Red left rule + light red background, title in red, advice text, **Call** (danger) + **I have checked** + Emergency 112 | `AlertCard` / `Callout tone="danger"` |
| Urgent / attention (missed dose, low) | Amber left rule, no background | `Callout tone="warn"` |
| Status anywhere | Dot + word, coloured text | `Status` |
| Escalation | Plain text ladder: "Family ✓ → Coach & doctor ✓ → Emergency advice" | `AlertCard` |
| AI-drafted message | Quoted block, "AI draft" label, English gloss under Hindi/Marathi, safety checks shown | `ApprovalCard`, `/coach` |
| AI draft fails a check | Red "Blocked by safety checks" with the reason; **Approve disabled** | `runGuardrails()` |
| Doctor-only message seen by a coach | "Needs doctor sign-off", Approve disabled with a reason | `ApprovalCard` |
| Weekly summary | Amber "Not verified · AI draft" until the doctor clicks **Verify and send** | `patient-detail.tsx` |

Rules:
- Thresholds and safety logic live in `lib/clinical.ts`, which **mirrors** the backend (`apps/api/app/modules/risk/engine.py`, `ai_gateway/guardrails.py`). Never compute risk in a component; never let the UI disagree with the backend.
- Order alerts **most severe first** (`bySeverity`), so a critical low is never hidden behind a missed pill.
- An acknowledged critical alert still shows the day as "Keep an eye", never "Doing well".
- Show *who has been told* and *when*: families worry about whether anyone knows.

---

## 5. Language & copy

**Tone for patients and families: warm and respectful**, like a trusted family doctor.
- Greet by name with an honorific where natural: "Namaste Shanti ji".
- Short sentences, everyday words: "sugar" not "blood glucose", "medicine" not "medication regimen".
- Calm by default. Urgent words ("Urgent — act now", "EMERGENCY") only for real critical events.
- Tell people what to do, not just what happened: "Give 3 teaspoons of sugar or a glass of juice now."
- Never blame: "Medicine not confirmed", not "Missed medication!".

**Tone for staff:** plain and factual. "Critical", "Needs attention", "2 missed · 83%". No exclamation marks.

**Writing rules**
- Buttons say what happens: "Mark as taken", "Approve and send", "Call Ananya". Not "OK", "Submit", "Click here".
- Numbers: Western digits, unit always (`mg/dL`, `%`), times as `08:30` in data and localised `8:30 am` in prose.
- Relative times on staff screens: "10 min ago", "2 d ago" (`timeAgo`).
- Every new family/senior string needs **en, hi and mr** in `lib/i18n.ts`. Teammate 1 reviews the Hindi and Marathi.
- WhatsApp copy lives only in `templates/messages.json`; keep `{{variables}}` and `[BUTTON]` labels intact.
- Never put patient names or phone numbers in text sent to an AI model; never show full phone numbers to staff (`maskPhone`).
- No emoji in UI chrome. The ✅ inside WhatsApp bot replies is the only exception.

---

## 6. Banned patterns

These are what make an interface look generated. **Never**:

- Gradients, glassmorphism, blurred backgrounds, glow effects.
- Icon inside a coloured square or circle as decoration (logo, section headers, list items).
- Tinted cards for everything; cards inside cards.
- Pill badges on every row; badge clusters.
- Emoji in headings, buttons or labels.
- Bold everywhere; ALL CAPS labels; letter-spaced eyebrow text.
- Status shown by colour only (coloured dots or bars with no word).
- Hero illustrations, stock photos or decorative blobs inside the app.
- Dual-axis charts; pie or donut charts for time data; 3D anything.
- Skeleton shimmer, bouncing or pulsing decoration (the voice-recording dot is the only pulse).
- Toasts that disappear before an older user can read them; modals for routine actions.
- Placeholder text used as the only label.
- Hard-coded hex colours or `px` font sizes in components.
- New UI libraries (shadcn, MUI, Chakra…) or a second icon set; we use our own components + `lucide-react`.

---

## 7. Component recipes

All in `apps/web/components/`. Use these before writing new ones.

| Need | Use | Notes |
| --- | --- | --- |
| Button | `Button` / `ButtonLink` from `ui.tsx` | `variant`: `primary` (one per section), `secondary`, `ghost`, `danger` (critical only). `size`: `md` staff, `lg`/`xl` family |
| Phone call | `CallButton` | Always a real `tel:` link |
| Status | `Status` | Dot + word. Pass a `Severity` and a plain label |
| Alert / important info | `Callout` | `danger` gets a background; `warn`, `info`, `ok` get only a left rule |
| Section on a calm screen | `Section` | Heading + content, no box |
| Numbers summary | `MetricRow` + `Metric` | Hairline row, no tiles |
| Settings row / menu item | `ListLink` | Big tap row with chevron |
| On/off | `Toggle` | States the value in words ("Simple mode · On") |
| 2–4 choices | `Segmented` | Language, date range, Doctor/Coach view |
| Empty list | `EmptyState` | Plain sentence, no illustration |
| Staff panel | `Panel` (`dashboard-bits.tsx`) | White box on the grey canvas, header row with title + count |
| Patient trend in a table | `Sparkline` | 14 days, target band, dots only for out-of-range readings |
| Medicine history | `AdherenceStrip` | One square per day; has an `aria-label` summary |
| WhatsApp status | `WhatsAppIndicator` | Read / Delivered / Window closed / Failed / Not on WhatsApp |
| Language | `LangTag` | EN / HI / MR with the full name on hover |
| AI message review | `ApprovalCard` | Includes safety checks, WhatsApp warnings, doctor-only lock |
| Patient details on the dashboard | `PatientPanel` | Right side panel, Esc closes, focus moves to Close |
| Family alert | `AlertCard` | Handles escalation, advice, actions, privacy |
| Page shells | `FamilyShell`, `StaffShell` (`wide` for dashboards) | Provide nav, header, Simple mode toggle |

Data comes from `useStore()` (`lib/store.tsx`). Derived values (alerts, stats, WhatsApp state) come from `lib/clinical.ts` and `lib/dashboard.ts`. Components never invent their own thresholds.

---

## 8. Charts & data

- **Pick the simplest form.** One number → `Metric`. A trend → line. Counts per day → bars. Never pie or donut charts.
- **One axis per chart.** Two measures → two charts side by side (see `clinic-trends.tsx`).
- Glucose charts always show the **70–180 mg/dL target band** (`--chart-band`) and the patient's **critical limits** as labelled dashed lines.
- Lines 1.5–2px in `--mark-line`. Points are small and neutral; **only out-of-range readings** get status colours (amber high, red critical).
- One series → no legend box; the title names it. Two or more → a legend with text labels.
- Every chart has a `role="img"` with an `aria-label` summary, plus a hover tooltip that states the value, unit, time and status **in words**.
- A table version exists for important data (e.g. "Recent readings" on the patient page).
- Axis and label text uses `--ink-2`, never the series colour. Gridlines are horizontal only, in `--line`.
- Use `.tabular` digits. Show "—" for missing values, never 0.
- Compact colour indicators (`Sparkline`, `AdherenceStrip`) always sit next to a text summary ("2 missed · 83%", "In range 78%") and carry an `aria-label`.

---

## 9. Layout & responsive

- **Phone first.** Design at 360px, then widen. Breakpoints are Tailwind's (`sm`, `md`, `lg`, `xl`), which are rem-based, so Simple mode shifts them slightly; test both modes.
- **Family screens:** single column, `max-w-2xl`, bottom tab bar under `md`, top nav from `md` up. Content clears the bottom bar (`pb-safe`) and the iPhone home indicator.
- **Staff dashboard:** at `xl`, a main column (table + trends) beside a 23rem right rail (urgent alerts, approvals). Below `xl` the rail moves **above** the table, so urgent items come first.
- **Tables** become lists below `lg`. A wide table scrolls inside its panel, never the page.
- **Side panel** (`PatientPanel`): full width on phones, 36rem on larger screens, with a dimmed backdrop. Clicking the backdrop or pressing Esc closes it.
- **Senior preview:** full-screen chat on phones, phone-sized frame with a demo panel on desktop.
- Keep line length readable: prose at most ~70 characters (`max-w-3xl` for text blocks on staff screens).

---

## 10. Before you open a PR

1. `npm run lint` and `npm run build` pass in `apps/web`.
2. Checked at **360px** and **1440px**, with Simple mode **on and off**.
3. Checked in **Hindi or Marathi** for overflow (Devanagari text is often 20–40% longer).
4. Ran through section 0 (hard rules) and section 6 (banned patterns).
