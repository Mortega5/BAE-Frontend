# Theme color roles

Colors must follow the applied theme (BAE, DOME… and light/dark). Don't use fixed Tailwind palette colors (`text-gray-900`, `bg-red-50`, `ring-blue-500`) or hex values (`text-[#0B1528]`) in templates or component styles.

## Generic roles: Tailwind semantic colors

The token values live in `src/styles.css` (light under `body`, dark under `.dark body`). `tailwind.config.js` exposes them as colors, so templates only carry a class and need no `dark:` variant.

| Use it for | Class | Token |
|---|---|---|
| Main text: titles, values | `text-content` | `--theme-default-text` |
| Body copy below the main text | `text-content-secondary` | `--theme-text-secondary` |
| Hints, meta lines, secondary icons | `text-content-muted` | `--theme-text-muted` |
| Card / panel background | `bg-surface` | `--card-bg` |
| Form control and inset row background | `bg-surface-input` | `--theme-input-bg` |
| Chips, hovered rows, soft wells | `bg-surface-muted` | `--theme-surface-muted` |
| Loading placeholders, empty tracks | `bg-skeleton` | `--theme-skeleton` |
| Card borders and dividers | `border-line` | `--card-border` |
| Form control borders | `border-line-input` | `--theme-input-border` |
| Modal backdrop | `bg-overlay` | `--theme-overlay` |
| Focus ring | `ring-focus` | `--theme-focus-ring` |
| Error / success / warning / info: text | `text-danger` (`text-success`, `text-warning`, `text-info`) | `--theme-danger-text` … |
| Error / success / warning / info: background | `bg-danger-soft` (`bg-success-soft`, …) | `--theme-danger-bg` … |
| Error / success / warning / info: border | `border-danger-border` (`border-success-border`, …) | `--theme-danger-border` … |

Brand colors keep using `primary-*` / `secondary-*`, which are already theme-driven.

These are full colors, not RGB channels, so opacity modifiers like `bg-surface/50` don't apply to them.

## Component-specific tokens: a class in the component's stylesheet

When a component needs its own token (e.g. `--product-details-body-text`, `--offer-card-*`, `--table-*`), define the value in `src/styles.css`. Read it from a class in the component's own `.css`/`.scss`, and use only that class in the template. Never bind the variable in the HTML (`text-[var(--x)]`, `style="color: var(--x)"`).

```scss
// product-details.component.scss
.pd-body-text { color: var(--product-details-body-text); }
```
```html
<p class="pd-body-text">…</p>
```

## Status colors inside components

A component may keep its own fixed status color when it is part of that component's design and lives in its stylesheet (e.g. app-button's `danger` variant). The rule targets colors hardcoded in page templates.
