# Theme color roles

Colors must follow the applied theme (BAE, DOME… and light/dark). Don't use fixed Tailwind palette colors (`text-gray-900`, `bg-red-50`, `ring-blue-500`) or hex values (`text-[#0B1528]`) in templates or component styles.

## Generic roles: Tailwind semantic colors

The token values live in `src/styles.css` (light under `body`, dark under `.dark body`). `tailwind.config.js` exposes them as colors, so templates only carry a class and need no `dark:` variant.

| Use it for | Class | Token |
|---|---|---|
| Main text: titles, values | `text-content` | `--theme-default-text` |
| Body copy below the main text | `text-content-secondary` | `--theme-text-secondary` |
| Hints, meta lines, secondary icons | `text-content-muted` | `--theme-text-muted` |
| Text / icons on a primary-colored fill (filled chips, active step, selected option) | `text-on-primary` | `--theme-primary-text` (per theme) |
| Links and link-styled actions | `text-link` (also `border-link`, `hover:text-link`) | `--button-link-text` |
| Page background | `bg-page` | `--theme-page-bg` |
| Card / panel background | `bg-surface` | `--card-bg` |
| Form control and inset row background | `bg-surface-input` | `--theme-input-bg` |
| Chips, hovered rows, soft wells | `bg-surface-muted` | `--theme-surface-muted` |
| Tinted inset well inside a card (e.g. chat bubbles from others) | `bg-surface-inset` | `--card-inset-bg` |
| Selected row / option background | `bg-surface-selected` | `--card-selected-bg` |
| Menu / list item hover | `hover:bg-surface-hover` | `--dropdown-item-hover-bg` |
| Loading placeholders, empty tracks | `bg-skeleton` | `--theme-skeleton` |
| Card borders and dividers | `border-line` | `--card-border` |
| Form control borders | `border-line-input` | `--theme-input-border` |
| Modal backdrop | `bg-overlay` | `--theme-overlay` |
| Focus ring | `ring-focus` | `--theme-focus-ring` |
| Error / success / warning / info: text | `text-danger` (`text-success`, `text-warning`, `text-info`) | `--theme-danger-text` … |
| Error / success / warning / info: background | `bg-danger-soft` (`bg-success-soft`, …) | `--theme-danger-bg` … |
| Error / success / warning / info: border | `border-danger-border` (`border-success-border`, …) | `--theme-danger-border` … |

Brand colors keep using `primary-*` / `secondary-*`, which are already theme-driven. Any role color also works with other Tailwind properties: `border-content-secondary`, `bg-success`, `ring-offset-surface`…

When a brand-colored title switches to white in dark mode, write `dark:text-content` instead of `dark:text-white`, so the dark color also comes from the theme.

These are full colors, not RGB channels, so opacity modifiers like `bg-surface/50` don't apply to them.

## Shared pattern classes

| Class | What it is |
|---|---|
| `.option-card` (+ `.is-selected`) | Selectable option card built on a native `<button>` (plan type, price tier…). It reads `--card-bg`, `--card-border`, `--card-hover-border` and `--card-selected-*`. Template: `class="option-card …" [class.is-selected]="…"`. Defined in `src/styles.css`. |

## Component-specific tokens: a class in the component's stylesheet

When a component needs its own token (e.g. `--product-details-body-text`, `--offer-card-*`, `--table-*`), define the value in `src/styles.css`. Read it from a class in the component's own `.css`/`.scss`, and use only that class in the template. Never bind the variable in the HTML (`text-[var(--x)]`, `style="color: var(--x)"`).

```scss
// product-details.component.css
.pd-body-text { color: var(--product-details-body-text); }
```

Existing ones:
- `product-details`: `.pd-body-text`, `.pd-muted-text`, `.pd-strong-text`, `.pd-chip`, `.pd-chip-hover`, `.pd-placeholder`, `.pd-border` (`--product-details-*`).
- `card` (offer card): `.oc-heading`, `.oc-muted`, `.oc-label`, `.oc-body`, `.oc-free`, `.oc-chip`, `.oc-image`, `.oc-border` (`--offer-card-*`).
- `organization-details`: `.od-primary-bg`, `.od-primary-bg-hover`, `.od-primary-text`, `.od-primary-border` (`--button-primary-*`).
- `markdown-textarea`: `.md-body` (`--md-body-bg`).
```html
<p class="pd-body-text">…</p>
```

## Status colors inside components

A component may keep its own fixed status color when it is part of that component's design and lives in its stylesheet (e.g. app-button's `danger` variant). The rule targets colors hardcoded in page templates.

Deliberately kept as fixed colors:
- table row delete/accept buttons configured in the `.ts` column definitions (red/green);
- the white knob of toggle switches;
- dark tooltips;
- translucent whites over the header bar and over primary chips (`white/10`, `white/20`).

Still to do:
- the DOME marketing pages (landing, DOME dashboard sections, browse, contact-us, about), which are a separate stage;
- the offer card's compliance-level color scale, which needs its own tokens.
