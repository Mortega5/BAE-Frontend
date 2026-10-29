# Theme color roles

This guide defines how colors are applied in the application. Every color must come from the active theme (BAE, DOME… in light or dark mode), so that changing a theme changes the whole interface without touching templates.

## Rules

1. Do not use fixed Tailwind palette colors (`text-gray-900`, `bg-red-50`, `ring-blue-500`) or hexadecimal / `rgb()` values (`text-[#0B1528]`) in templates, inline styles or component stylesheets.
2. Do not reference CSS variables from templates (`text-[var(--x)]`, `style="color: var(--x)"`). A template carries only class names.
3. Use a **role class** (next section) when the color expresses a generic meaning.
4. Use a **component class** (see [Component-specific tokens](#component-specific-tokens)) when the color belongs to one component.

## Shared components first

Before styling markup by hand, check whether a shared component already provides it. These components apply the theme roles internally, so using them gives themed light and dark colors without writing any color class. Each one has its own README with inputs, slots and examples.

| Need | Component | Documentation |
|---|---|---|
| Button (all variants, icons) | `app-button` | [button](../src/app/shared/button/README.md) |
| Box / panel with header, content and footer | `app-card` | [content-card](../src/app/shared/content-card/README.md) |
| Selectable row or tile (address, price tier, cart line) | `app-item-card` | [item-card](../src/app/shared/item-card/README.md) |
| Dropdown, context menu or popover | `app-dropdown-panel` | [dropdown-panel](../src/app/shared/dropdown-panel/README.md) |
| Sidebar navigation with mobile drawer | `app-side-nav` | [side-nav](../src/app/shared/side-nav/README.md) |
| Underlined tab strip | `app-tabs` | [tabs](../src/app/shared/tabs/README.md) |
| Empty list or grid placeholder | `app-empty-state` | [empty-state](../src/app/shared/empty-state/README.md) |
| Search box | `app-search-input` | [search-input](../src/app/shared/search-input/README.md) |
| Grid / list switch | `app-view-toggle` | [view-toggle](../src/app/shared/view-toggle/README.md) |
| Selectable, sortable table field | `app-table-input` | [table-input](../src/app/shared/forms/table-input/README.md) |

Other shared components (modal, drawer, stepper, badges, dynamic form…) live under [src/app/shared](../src/app/shared) and follow the same rules. If none of them fits and the markup repeats in more than one place, create a shared component with its own README instead of copying classes.

## Choosing a class

Follow these steps in order and stop at the first one that applies:

1. The color belongs to the design of a single component (product details, offer card…) → use that component's class.
2. The color communicates a state (error, success, warning, information) → use a status role.
3. The element sits on a primary-colored fill → `text-on-primary`.
4. The element is a link or a link-styled action → `text-link`.
5. Otherwise pick the role by what it paints: text, background or border, using the table below.

Roles are meant to be applied without a `dark:` variant: the token already has a light and a dark value.

```html
<!-- Before -->
<h2 class="text-gray-900 dark:text-white">Title</h2>
<p class="text-gray-500 dark:text-gray-400">Hint</p>
<div class="bg-white dark:bg-secondary-100 border border-gray-200 dark:border-gray-700"></div>

<!-- After -->
<h2 class="text-content">Title</h2>
<p class="text-content-muted">Hint</p>
<div class="bg-surface border border-line"></div>
```

## Role classes

Token values are defined in `src/styles.css` (light under `body`, dark under `.dark body`). `tailwind.config.js` exposes them as Tailwind colors under `theme.extend.colors`.

### Text

| Role | Class | Token |
|---|---|---|
| Main text: titles, values | `text-content` | `--theme-default-text` |
| Body copy below the main text | `text-content-secondary` | `--theme-text-secondary` |
| Hints, meta lines, secondary icons | `text-content-muted` | `--theme-text-muted` |
| Text and icons on a primary-colored fill (filled chips, active step, selected option) | `text-on-primary` | `--theme-primary-text` |
| Links and link-styled actions | `text-link` (also `border-link`, `hover:text-link`) | `--button-link-text` |

### Backgrounds

| Role | Class | Token |
|---|---|---|
| Page background | `bg-page` | `--theme-page-bg` |
| Card or panel | `bg-surface` | `--card-bg` |
| Form control or inset row | `bg-surface-input` | `--theme-input-bg` |
| Chips, hovered rows, soft wells | `bg-surface-muted` | `--theme-surface-muted` |
| Tinted well inside a card (e.g. chat bubbles from others) | `bg-surface-inset` | `--card-inset-bg` |
| Selected row or option | `bg-surface-selected` | `--card-selected-bg` |
| Menu or list item on hover | `hover:bg-surface-hover` | `--dropdown-item-hover-bg` |
| Loading placeholder, empty track | `bg-skeleton` | `--theme-skeleton` |
| Modal backdrop | `bg-overlay` | `--theme-overlay` |

### Borders and focus

| Role | Class | Token |
|---|---|---|
| Card borders and dividers | `border-line` | `--card-border` |
| Form control borders | `border-line-input` | `--theme-input-border` |
| Focus ring | `ring-focus` | `--theme-focus-ring` |

### Status

| Role | Text | Background | Border |
|---|---|---|---|
| Error | `text-danger` | `bg-danger-soft` | `border-danger-border` |
| Success | `text-success` | `bg-success-soft` | `border-success-border` |
| Warning | `text-warning` | `bg-warning-soft` | `border-warning-border` |
| Information | `text-info` | `bg-info-soft` | `border-info-border` |

Tokens: `--theme-<status>-text`, `--theme-<status>-bg`, `--theme-<status>-border`.

### Brand colors

Brand colors keep using `primary-*` and `secondary-*`, which are already theme-driven. When a brand-colored title must turn white in dark mode, use `dark:text-content` rather than `dark:text-white`.

### Constraints

- Role colors are complete colors, not RGB channels, so Tailwind opacity modifiers (`bg-surface/50`) do not apply to them.
- A role works with any Tailwind property that takes a color: `border-content-secondary`, `bg-success`, `ring-offset-surface`…

## Shared pattern classes

| Class | Purpose |
|---|---|
| `.option-card` (+ `.is-selected`) | Selectable option built on a native `<button>` (plan type, price tier…). Reads `--card-bg`, `--card-border`, `--card-hover-border` and `--card-selected-*`. Defined in `src/styles.css`. |

```html
<button class="option-card" [class.is-selected]="selected === option">…</button>
```

## Component-specific tokens

When a component needs its own token (e.g. `--product-details-body-text`, `--offer-card-*`, `--table-*`):

1. Define the value in `src/styles.css`, with a light and a dark value.
2. Declare a class in the component's own stylesheet that reads the variable.
3. Use only that class in the template.

```css
/* product-details.component.css */
.pd-body-text { color: var(--product-details-body-text); }
```

```html
<p class="pd-body-text">…</p>
```

Classes currently defined:

| Component | Classes | Tokens |
|---|---|---|
| `product-details` | `.pd-body-text`, `.pd-muted-text`, `.pd-strong-text`, `.pd-chip`, `.pd-chip-hover`, `.pd-placeholder`, `.pd-border` | `--product-details-*` |
| `card` (offer card) | `.oc-heading`, `.oc-muted`, `.oc-label`, `.oc-body`, `.oc-free`, `.oc-chip`, `.oc-image`, `.oc-border` | `--offer-card-*` |
| `organization-details` | `.od-primary-bg`, `.od-primary-bg-hover`, `.od-primary-text`, `.od-primary-border` | `--button-primary-*` |
| `markdown-textarea` | `.md-body` | `--md-body-bg` |

## Adding or changing a role

1. Define the token in `src/styles.css`: the light value under `body` and the dark value under `.dark body`.
2. Expose it in `tailwind.config.js` under `theme.extend.colors` if it is a generic role.
3. Add it to the matching table in this document.
4. A theme may override any token in its own block (`src/app/themes/*.theme.scss`); do not hardcode theme-specific values in components.

Before introducing a new role, check that no existing one expresses the same meaning.

## Intentionally fixed colors

These remain as fixed colors because they are part of the component's design rather than theme-dependent surfaces:

- Red / green buttons for row delete and accept actions configured in the `.ts` column definitions, and status variants inside a component's own stylesheet (e.g. the `danger` variant of `app-button`).
- The white knob of toggle switches.
- Dark tooltips.
- Translucent whites over the header bar and over primary chips (`white/10`, `white/20`).
- Translucent whites used for hover or loading effects (`hover:bg-white/20`, `bg-white/60` in the paginated-table loading veil). Role colors have no alpha channel, so these stay as they are.
- The neutral greys and white of the chatbot widget panel, which is a light surface in both modes. Its brand colors do come from the theme tokens.

## Known gaps

- DOME marketing pages (landing, DOME dashboard sections, browse, contact-us, about) still use fixed colors and will be migrated separately.
