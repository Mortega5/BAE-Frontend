# app-item-card (`ItemCardComponent`)

Shared visual shell for a single row/tile in a list — a billing address, a cart
line item, a price tier, etc. Purely presentational: it owns the resting/hover/
selected look and leaves everything else (content, semantics, click handling) to
the caller. Introduced to de-duplicate a `rounded-2xl border p-5 ...` tile that
had been hand-copied (with a hardcoded cyan "selected" color) across
`billing-address.component.html` and `checkout.component.html`.

## Colors are CSS variables, not hardcoded

Same approach as [app-card](../content-card/README.md) and
[app-button](../button/README.md): colors are CSS custom properties defined
globally in [src/styles.css](../../../styles.css) (`--card-bg`, `--card-border`,
`--card-selected-bg`, `--card-selected-border`, `--card-hover-border`, on `body` /
`.dark body`) — `item-card.component.scss` only *consumes* them.

`--card-selected-border` and `--card-hover-border` both resolve to
`--theme-primary-100` in light mode and `--theme-primary-50` in dark mode — the
same pairing `--button-link-text`/`-hover` and most other accent borders use.
Keep that pairing if you touch these tokens: a selected/hovered border that
doesn't flip shade in dark mode reads as inconsistent next to every other accent
border on the page (this was a real bug caught right after introducing the
component — the first pass only set `--card-selected-border` once, un-overridden
in `.dark body`).

Before this component existed, the "selected" state was a fixed
`bg-cyan-50 dark:bg-cyan-950/30 border-cyan-500 dark:border-cyan-400` — a color
with no relationship to the active theme. Re-theming the app (a different
provider's `primary`/`secondary` brand colors) would never have touched it. Using
the theme tokens instead means the selected look now follows whichever theme is
active, same as every other primary-colored accent in the app.

## Inputs

| Input | Default | Effect |
|---|---|---|
| `selected` | `false` | Swaps to `--card-selected-bg`/`--card-selected-border` |
| `clickable` | `false` | Adds `cursor: pointer` and a hover border (`--card-hover-border`) when not selected |

No `padding` or `variant` input — every current caller uses the same `p-5`.
Add one if a real second size shows up; don't pre-add it speculatively.

## Content, semantics and clicks are the caller's job

This component only renders a styled `<div>` around `<ng-content>` — it has no
opinion on what's inside, and no `(click)` output of its own. Put `role`,
`tabindex`, `(click)`, `[attr.aria-checked]`, etc. directly on the `<app-item-card>`
tag; Angular applies attribute/event bindings to a component's host element the
same way it would to a plain `<div>`.

```html
<app-item-card role="radio" [attr.aria-checked]="data.selected" tabindex="0"
  class="group" [selected]="data.selected" [clickable]="true"
  (click)="selectBillingAddress($event)">
  <!-- radio bubble, text, absolutely-positioned edit button, etc. -->
</app-item-card>
```

This is why it wasn't used for the `price-plans` tier picker, `plan-subtype-modal`,
or the priceType dropdown in `price-component-drawer`: those are native `<button>`
elements (keyboard activation, form semantics, screen-reader role all come for
free). Wrapping them in a `<div>`-rooted component would mean rebuilding that by
hand. Left as plain buttons — but still updated to reference the same
`bg-[var(--card-selected-bg)] border-[var(--card-selected-border)]` /
`bg-[var(--card-bg)] border-[var(--card-border)] hover:border-[var(--card-hover-border)]`
tokens via Tailwind's arbitrary-value syntax, instead of their own hardcoded cyan
copy. Only migrate one of these to the actual component if you're also willing to
reintroduce its keyboard/ARIA behavior explicitly.

## `class` doesn't reach the inner box

Same limitation as `app-card`/`app-button`: a `class="..."` on `<app-item-card>`
lands on the *host* element, not the `.app-item-card` div the component renders
internally. A `.group` class for a `group-hover:` reveal (see the billing-address
edit button) still works fine on the host — Tailwind's `group`/`group-hover`
mechanism is pure CSS ancestor/descendant matching, unaffected by the extra
component boundary. Width/margin utilities on the host, however, need the same
wrapping-element fix documented in the
[button README](../button/README.md#class-doesnt-reach-the-inner-button).

## Selected + hovered specificity

`[data-selected]` and `[data-clickable]:hover` both set `border-color`. A plain
`&[data-clickable]:hover` rule would win over `&[data-selected]` on specificity
(two selectors vs one) regardless of source order, flipping a selected card's
border to the hover color on mouseover. The stylesheet has an explicit
`&[data-selected][data-clickable]:hover` override for this — if you add another
state that touches `border-color`, check whether it needs the same treatment.
