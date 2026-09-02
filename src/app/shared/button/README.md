# Button Component

`app-button` (`ButtonComponent`) is the shared button used to replace the many near-duplicate, hand-styled `<button class="...">` copies scattered across the app. It renders a native `<button>` and projects its content (`<ng-content>`), so callers keep full control over the label's translation/interpolation — there's no `label` input.

Adopt it incrementally when touching a file for another reason; it's not meant to be swept across the whole app in one pass.

```html
<app-button icon="plus" iconPosition="suffix" dataCy="addItem" (click)="add()">
  {{ 'NS._add' | translate }}
</app-button>

<app-button variant="danger" size="sm" [disabled]="loading" (click)="remove()">
  {{ 'NS._delete' | translate }}
</app-button>

<app-button variant="ghost" size="sm" icon="xmark" dataCy="closeModal" (click)="close()" />
```

## Theming

Like [app-table-input](../forms/table-input/README.md), colors are CSS variables defined globally in [src/styles.css](../../../styles.css) (on `body` / `.dark body`), **not** on this component's own `:host` — a `:host` declaration would always win over an outside override, which defeats the point of a themeable token. [button.component.css](./button.component.css) only *consumes* them, keyed off the `[data-variant]`/`[data-size]` attributes reflected on the `<button>`. To change a button's appearance app-wide, edit `styles.css`; to change what a variant/size does with a variable, edit `button.component.css` — never hardcode a color in the HTML or in `button.component.ts`.

Each variable has a default on `body` (light) and, where it differs, an override on `.dark body` (dark). Structural/non-color utilities (padding, radius, focus-ring width) come from Tailwind via `@apply` directly in `button.component.css`, since those don't need to be themeable.

| Variable | Affects | Light default | Dark default |
|---|---|---|---|
| `--button-primary-bg` | `primary` background | `rgb(var(--theme-primary-100))` | *(inherits)* |
| `--button-primary-bg-hover` | `primary` hover background | `rgb(var(--theme-primary-50))` | *(inherits — see note below)* |
| `--button-primary-text` | `primary` text/icon color | `var(--theme-primary-text)` | *(inherits)* |
| `--button-primary-ring` | `primary` focus ring color | `rgb(var(--theme-primary-50) / 30%)` | *(inherits)* |
| `--button-secondary-bg` | `secondary` background | `#fff` | `rgb(var(--theme-secondary-300))` |
| `--button-secondary-bg-hover` | `secondary` hover background | `#f9fafb` (gray-50) | `rgb(var(--theme-secondary-200))` |
| `--button-secondary-text` | `secondary` text color | `rgb(55 65 81)` (gray-700) | `rgb(209 213 219)` (gray-300) |
| `--button-secondary-border` | `secondary` border color | `rgb(209 213 219)` (gray-300) | `rgb(55 65 81)` (gray-700) |
| `--button-secondary-ring` | `secondary` focus ring color | `rgb(209 213 219 / 50%)` | `rgb(var(--theme-secondary-100) / 50%)` |
| `--button-danger-bg` | `danger` background | `rgb(220 38 38)` (red-600) | *(inherits)* |
| `--button-danger-bg-hover` | `danger` hover background | `rgb(185 28 28)` (red-700) | *(inherits)* |
| `--button-danger-text` | `danger` text color | `#fff` | *(inherits)* |
| `--button-danger-ring` | `danger` focus ring color | `rgb(252 165 165 / 50%)` (red-300) | *(inherits)* |
| `--button-link-text` | `link` text color | `rgb(var(--theme-primary-100))` | `rgb(var(--theme-primary-50))` |
| `--button-link-text-hover` | `link` hover text color | `rgb(var(--theme-primary-50))` | `rgb(var(--theme-primary-100))` |
| `--button-ghost-text` | `ghost` text/icon color | `rgb(156 163 175)` (gray-400) | *(inherits)* |
| `--button-ghost-text-hover` | `ghost` hover text/icon color | `rgb(17 24 39)` (gray-900) | `#fff` |
| `--button-ghost-bg-hover` | `ghost` hover background | `rgb(229 231 235)` (gray-200) | `rgb(75 85 99)` (gray-600) |
| `--button-ghost-ring` | `ghost` focus ring color | `rgb(156 163 175 / 50%)` | `rgb(var(--theme-secondary-100) / 50%)` |

`link` vs `ghost` — they're easy to confuse: `link` never gets a background, even on hover, only its text color changes, and it's meant for text CTAs ("Back", "See more"). `ghost` is transparent at rest but gets a background on hover (a Material-Design-style "state layer"), and it's meant for icon-only buttons (a modal's "×" close button, a bare row action) where a hover-only background is what signals "this is clickable" — a `link`-styled icon button wouldn't look interactive at all.

`danger` is intentionally not wired to any theme token — no button in the app (before or after this component) ever varied its red by theme, so it stays a plain fixed color. Everything else builds on `--theme-primary-*`/`--theme-secondary-*`/`--theme-primary-text` (defined per theme in `src/app/themes/*.theme.scss`), so switching the app theme (bae/dome) updates it automatically.

**Per-theme override example:** `--button-primary-bg-hover` normally just inherits `--theme-primary-50`, but `bae`'s `--theme-primary-50` was deliberately darkened elsewhere (for the stepper's completed-step contrast) — so `styles.css` also has a `body.theme-bae { --button-primary-bg-hover: rgb(0 196 140); }` override, restoring the brighter green the button wants without touching the shared token. This is the pattern to follow if a specific theme ever needs to diverge from a button token's generic default: override it in `styles.css` scoped to `body.theme-<name>`, don't fork the shared `--theme-*` token.

## Inputs

| Name | Type | Default | Description |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'link' \| 'ghost'` | `'primary'` | Visual style — see the table above for each variant's tokens |
| `size` | `'sm' \| 'md'` | `'md'` | Padding/height |
| `type` | `'button' \| 'submit'` | `'button'` | Native `<button>` type |
| `disabled` | `boolean` | `false` | Native disabled state |
| `icon` | `IconName` (FontAwesome) | `undefined` | Optional icon, by name — resolved via `findButtonIcon` in [popular-icons.ts](../../config/popular-icons.ts). Only names already in that registry render; add new ones there when a button needs an icon that isn't preloaded yet |
| `iconPosition` | `'prefix' \| 'suffix'` | `'prefix'` | Where the icon renders relative to the projected content |
| `dataCy` | `string` | `undefined` | Forwarded to the native `<button>` as `data-cy`, for e2e tests |

There's no `click` output — bind `(click)` directly on `<app-button>` and it's picked up via native DOM event bubbling from the inner `<button>`, same as any other component host.
