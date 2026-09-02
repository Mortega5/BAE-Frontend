# app-card (`ContentCardComponent`)

Shared white/dark box used to consolidate the many near-duplicate
`bg-white dark:bg-secondary-100 rounded-2xl border ... shadow-*` boxes hand-rolled
across steppers, drawers and modals. Adopt incrementally when touching a file, not
as a one-shot sweep — same approach used for [app-button](../button/README.md).

## Colors are CSS variables, not hardcoded

Like [app-button](../button/README.md), colors are CSS custom properties defined
globally in [src/styles.css](../../../styles.css) (`--card-bg`, `--card-border`,
on `body` / `.dark body`) — `content-card.component.scss` only *consumes* them.
To re-theme every card app-wide, edit `styles.css`; to override a single instance,
set the variable via inline `style` on `<app-card>` (custom properties inherit
through the host/inner-box boundary even though `class` doesn't — see the button
README's "one-off color overrides" section for the exact mechanism).

## Variants

| Variant | Shadow | Typical use |
|---|---|---|
| `panel` (default) | `shadow-sm` | In-page content boxes — stepper step content, drawer forms |
| `modal` | `shadow-xl` | Dialog-style overlays |

Both variants share the same background/border/radius tokens — only the shadow
depth changes. This is a deliberate simplification: a few existing modals had no
border at all before this component existed; migrating them to `modal` adds one,
unifying the look rather than preserving every one-off variation.

## Content projection

Three slots, always present in the template (never branched behind an `@if`,
which previously caused a real content-projection bug in `app-button` — see its
README/memory for the story). An empty header or footer slot collapses via CSS
`:empty` — no host-side boolean needed to hide it, so a caller who never uses
`appCardFooter` gets a totally normal-looking card, no exposed empty divider.

```html
<app-card variant="panel">
  <h2 appCardHeader class="text-2xl font-bold text-gray-900 dark:text-white">
    {{ 'NS._title' | translate }}
  </h2>

  <!-- default slot: everything not marked appCardHeader/appCardFooter -->
  <p>Body content goes here, unmarked.</p>

  <div appCardFooter>
    <app-button variant="ghost" (click)="cancel()">{{ 'NS._cancel' | translate }}</app-button>
    <app-button (click)="save()">{{ 'NS._save' | translate }}</app-button>
  </div>
</app-card>
```

`appCardHeader`/`appCardFooter` are plain attribute markers (not real Angular
directives) — they only exist as `<ng-content select="[appCardHeader]">` selector
targets, so any element can carry them without importing anything extra.

**Unlike before migration:** the header (title, and typically a close button for
drawers) and the footer (Cancel/Save-style action row) used to be siblings
*outside* the bordered box in every file surveyed (`stepper.component.html`,
`price-plan-drawer.component.html`, etc.) — only the middle content had the
border/shadow. Moving them inside via `appCardHeader`/`appCardFooter` is a
deliberate visual change (title and actions now sit inside the border), decided
when this component was introduced. If a file's title/actions should stay outside
the box instead, just don't use the slots — pass only body content and leave
`<app-card>` to wrap only that.

## `class` doesn't reach the inner box

Same limitation as `app-button`: a `class="..."` on `<app-card>` lands on the
*host* element, not the `.app-card` div the component renders internally. Width
constraints need a wrapping element in the caller's template, same fix pattern as
documented in the [button README](../button/README.md#class-doesnt-reach-the-inner-button).
