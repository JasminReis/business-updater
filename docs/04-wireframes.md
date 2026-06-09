# UI Wireframes (mobile, 390×844 reference)

Design language: clean SaaS (Linear/Notion/Stripe quality bar) — generous whitespace,
one accent color, system font stack, 44px+ touch targets, bottom-tab navigation,
dark mode via `prefers-color-scheme` + manual toggle.

## Navigation model

Bottom tab bar (one-handed reach), 4 tabs + contextual headers. No hamburger menus.

```
┌──────────────────────────────────────┐
│  ...screen content...                │
├──────────────────────────────────────┤
│   ⌂        ▤         ◉        ✦     │
│  Home   Website  Business    AI      │
└──────────────────────────────────────┘
```

## 1. Dashboard (Home)

```
┌──────────────────────────────────────┐
│ Good morning, Anna          ◐  👤    │   ◐ = theme toggle
│ Anna's Bakery                        │
│                                      │
│ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│ │ Website  │ │   SEO    │ │ Google │ │   score rings, tap →
│ │   ●92    │ │   ●74    │ │  ●81   │ │   drill-down detail
│ │ Healthy  │ │ 3 issues │ │ 2 gaps │ │
│ └──────────┘ └──────────┘ └────────┘ │
│                                      │
│ Suggested actions                    │
│ ┌──────────────────────────────────┐ │
│ │ ✦ Reply to Maria's 5★ review     │ │   AI suggestion cards,
│ │   "Best croissants in town!"     │ │   primary action = 1 tap
│ │                  [Draft reply →] │ │
│ ├──────────────────────────────────┤ │
│ │ ✦ Your About page is 8 months    │ │
│ │   old — refresh it with AI       │ │
│ │                     [Improve →]  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Recent reviews                       │
│ ┌──────────────────────────────────┐ │
│ │ ★★★★★  Maria K. · 2h    ⚠ reply  │ │
│ │ ★★★★☆  Jon B. · 1d      ✓ done   │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Latest publish: ✓ live · 2d ago      │
├──────────────────────────────────────┤
│   ⌂        ▤         ◉        ✦     │
└──────────────────────────────────────┘
```

## 2. Website tab — section list

```
┌──────────────────────────────────────┐
│ ← Website          anna-bakery.com ↗ │
│ ✓ Live · deployed 2d ago             │
│                                      │
│ Content sections                     │
│ ┌──────────────────────────────────┐ │
│ │ Headline                       › │ │
│ │ "Fresh bread, baked daily"       │ │
│ ├──────────────────────────────────┤ │
│ │ About us                       › │ │
│ │ "Family bakery since 1998…"      │ │
│ ├──────────────────────────────────┤ │
│ │ Services                       › │ │
│ │ 6 items                          │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [ ⟳ Sync from repo ]                 │
└──────────────────────────────────────┘
```

## 3. Section editor (the core fast-edit flow)

```
┌──────────────────────────────────────┐
│ ✕  About us                   Save   │
│ ┌──────────────────────────────────┐ │
│ │ Family bakery since 1998. We     │ │   full-height textarea,
│ │ bake everything from scratch     │ │   autosaves draft locally
│ │ every morning…                   │ │
│ │                                  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ✦ Rewrite with AI                │ │   opens prompt sheet:
│ └──────────────────────────────────┘ │   "warmer / shorter / SEO…"
│                                      │
│ Save → commits to GitHub & publishes │
│ ┌──────────────────────────────────┐ │
│ │      Publish change              │ │   single primary CTA,
│ └──────────────────────────────────┘ │   then live deploy status:
│  ⠿ Building on Vercel… (45s)         │
└──────────────────────────────────────┘
```

## 4. Business tab (Google Business Profile)

```
┌──────────────────────────────────────┐
│ Business profile        ●81 complete │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ⏰ Hours        Mon–Fri 7–18   › │ │
│ │ 📞 Phone        +354 555 1234  › │ │   each row = tap-to-edit
│ │ 🌐 Website      anna-bakery.com› │ │   bottom sheet
│ │ 🏷 Services     6 listed       › │ │
│ │ 📷 Photos       12             › │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Reviews                    4.8 ★ (56)│
│ ┌──────────────────────────────────┐ │
│ │ ★★★★★ Maria K. · 2h              │ │
│ │ "Best croissants in town!"       │ │
│ │ [ ✦ Draft reply ]  [ Reply ]     │ │
│ ├──────────────────────────────────┤ │
│ │ ★★☆☆☆ Pete R. · 3d               │ │
│ │ "Long wait on Saturday…"         │ │
│ │ [ ✦ Draft reply ]  [ Reply ]     │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│   ⌂        ▤         ◉        ✦     │
└──────────────────────────────────────┘
```

## 5. Review reply flow (AI draft → approve)

```
┌──────────────────────────────────────┐
│ ✕  Reply to Maria K.                 │
│ ★★★★★ "Best croissants in town!"     │
│                                      │
│ Tone:  ( Friendly ) Professional Brief│  segmented control
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Thank you so much, Maria! Our    │ │   AI draft streams in
│ │ bakers start at 4am to make      │ │   token-by-token,
│ │ those croissants perfect — we…   │ │   fully editable
│ └──────────────────────────────────┘ │
│                                      │
│ [ ↻ Regenerate ]   [ Post reply ✓ ]  │   posting always explicit
└──────────────────────────────────────┘
```

## 6. AI tab (assistant hub)

```
┌──────────────────────────────────────┐
│ AI Assistant                         │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ✍️  Write website content        │ │
│ ├──────────────────────────────────┤ │
│ │ 🔍  Run SEO audit                │ │
│ ├──────────────────────────────────┤ │
│ │ 💬  Draft review replies (2 new) │ │
│ ├──────────────────────────────────┤ │
│ │ 📣  Create a business post       │ │
│ ├──────────────────────────────────┤ │
│ │ ✨  Improve existing content     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Recent                               │
│ · SEO audit — score 74 · yesterday   │
│ · About page rewrite · 2d            │
├──────────────────────────────────────┤
│   ⌂        ▤         ◉        ✦     │
└──────────────────────────────────────┘
```

## 7. Login

```
┌──────────────────────────────────────┐
│                                      │
│              ◆ PresenceAI            │
│   Your online presence, in your      │
│              pocket.                 │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │  G   Continue with Google        │ │
│ └──────────────────────────────────┘ │
│ ──────────────  or  ─────────────────│
│ ┌──────────────────────────────────┐ │
│ │  you@business.com                │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │      Email me a login link       │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

## Interaction principles

- **One-handed:** primary actions in the bottom 40% of the screen; tab bar navigation.
- **Fast edit:** dashboard → edited & published in ≤ 4 taps.
- **AI drafts, human approves:** nothing AI-generated is published without an explicit tap.
- **Progress honesty:** publishing shows real deploy status (queued → building → live), streamed AI output renders token-by-token.
- **Touch targets:** ≥ 44×44pt; list rows ≥ 56pt.
- **Dark mode:** full support; respects system preference, manual override persisted.
