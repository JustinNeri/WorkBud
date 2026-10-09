# Design system

The rules the WorkBud interface follows, so that every screen looks like it
belongs to the same app. The app is dark only: there is one palette, not a
light theme with a dark copy behind it.

## In code

Everything here lives in [client/src/index.css](../client/src/index.css). The
raw values are CSS custom properties on `:root` (the `--wb-*` names), and a
Tailwind 4 `@theme` block maps them to utility names, so `--wb-brand` becomes
`text-brand` and `bg-brand`. Components use those names. The exceptions are
the logo and the hours ring, which draw SVG and carry a few hex values of their
own for gradient stops and the white-on-hero variant.

## Colour

Greys are near neutral on purpose, so that colour always means something:
hours, money, running warm, or over budget.

### Surfaces and text

| Name in code | Hex | Used for | Contrast on surface |
|---|---|---|---|
| `canvas` | `#0d0e12` | page background | |
| `surface` | `#16181f` | cards and sheets | |
| `surface-2` | `#1e212a` | inputs and raised areas inside a card | |
| `line` | `#272b36` | borders and dividers | |
| `ink` | `#e8eaf0` | main text | 14.3 to 1 |
| `muted` | `#9ba1b0` | secondary text | 6.6 to 1 |
| `faint` | `#828a99` | hints and captions | 4.95 to 1 |

### Meaning colours

Each hue has two tiers, because one value cannot do both jobs on a dark
background. The text tier is light enough to read as text on a dark surface.
The fill tier is dark enough that white text on it still passes.

| Meaning | Text tier | Fill tier | Soft background | Meter track | Text contrast |
|---|---|---|---|---|---|
| Brand, hours | `#818cf8` | `#4f46e5` | `#1a1c30` | `#262a4d` | 5.75 to 1 |
| Money, on budget | `#10b981` | `#047857` | `#0e2a22` | `#14463a` | 6.8 to 1 |
| Warning, running warm | `#d97706` | `#a45607` | `#2b1e08` | `#45300c` | 5.4 to 1 |
| Over budget, errors | `#ee5a5f` | `#c02b30` | `#2e1216` | `#4d1c21` | 5.2 to 1 |

All text values clear the WCAG minimum of 4.5 to 1 on `surface`.

### Gradients

| Name | From | To | Used for |
|---|---|---|---|
| hero | `#1e1b4b` | `#2e1065` | the hours card at the top of the dashboard |
| action | `#4338ca` | `#6d28d9` | the primary button, the log button and the avatar |

## Type

One family: the system sans-serif stack (`-apple-system`, `Segoe UI`, `Roboto`
and their fallbacks), so text renders in the phone's own font with nothing to
download.

Sizes are written as explicit pixel values (`text-[13px]`), not Tailwind's named
steps. The ones that carry most of the interface:

| Size | Used for |
|---|---|
| 11px to 12px | captions, labels and chips |
| 13px to 15px | body text and form fields |
| 16px to 20px | card titles and section headings |
| 24px and up | headline figures, such as the hours total |

This is the weakest part of the system. There are 19 distinct sizes in use,
from 9px to 42px, where four or five named ones would do. Collapsing them into
a named scale in `index.css` is the first cleanup I would make.

## Spacing

Tailwind's default spacing scale (steps of 4px) is the only scale in use for
padding, margins and gaps. No component sets those with a one-off pixel value.

## Elevation

| Name | Used for |
|---|---|
| `shadow-card` | cards |
| `shadow-hero` | the hero hours card |
| `shadow-float` | bottom sheets and the floating log button |

## Components

Shared pieces live in [client/src/components/](../client/src/components/):

- `ui.jsx`: the form primitives (`Field`, `TextInput`, `PasswordInput`,
  `NumberInput`, `Select`, `TextArea`, `Checkbox`), plus `Button`, `Alert`,
  `PasswordMeter`, `SectionHeading` and `FormSection`
- `Sheet.jsx`: the bottom-sheet shell used by every form (a bottom sheet on a
  phone, a centred dialog on a larger screen)
- `Meter.jsx` and `Ring.jsx`: the budget bars and the hours ring
- `Avatar.jsx`: the profile picture, or the user's initial when none is set

**Focus.** Every focusable element gets the same visible ring: a 2px `brand`
outline with a 2px offset on `:focus-visible`. The default outline is never
removed without this replacement.

## States

- **Error.** Field errors and failed saves use the `over` colour with a message
  next to the thing that failed.
- **Misconfigured.** A missing Supabase setup shows a "Supabase isn't
  configured" card, not a blank page.
- **Empty and loading.** Not designed yet. A new account's dashboard has no
  dedicated empty state or skeleton, which is listed under next steps in the
  main [README](../README.md).
