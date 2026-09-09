# app-dropdown-panel (`DropdownPanelComponent`)

Shared floating panel for dropdown/context menus (theme selector, user avatar menu,
row action menus, filter/search popovers...). Consolidates what used to be ~18
different ad-hoc `bg-white dark:bg-*` boxes — some, like the header's old
`.dropdown-glass`, had no dark-mode rule at all — into one CSS-var-driven surface.
Same approach as [app-card](../content-card/README.md): a dropdown panel is
visually just a small elevated card, so it reuses `app-card`'s own tokens rather
than inventing a parallel set.

## Colors are CSS variables, not hardcoded

Like [app-card](../content-card/README.md#colors-are-css-variables-not-hardcoded),
the panel surface reuses `--card-bg`/`--card-border` (defined globally in
[src/styles.css](../../../styles.css)) — `dropdown-panel.component.scss` only
*consumes* them, no new bg/border tokens exist for this component. The one token
it does own is `--dropdown-item-hover-bg` (also in `styles.css`, `body`/`.dark
body`), for the hover state on whatever buttons/links a caller projects inside —
this component doesn't style items itself, since their shape varies too much
across call sites (icon+label buttons, checkbox rows, plain links...).

## This component only supplies the box — positioning is the caller's job

Unlike `app-card`, this component has **no** `variant` input and does **not**
try to own placement. It renders one thing: `rounded-lg border shadow-lg py-1
overflow-hidden` with the tokens above. Everything else — `absolute`/`fixed`,
`top-*`/`right-*`/`left-*`, `mt-*`, `w-*`, `z-*` — is a `class` the caller puts
directly on `<app-dropdown-panel>`:

```html
<div class="relative">
  <button (click)="open = !open">...</button>

  @if (open) {
  <app-dropdown-panel class="absolute right-0 mt-2 w-48 z-50" (click)="$event.stopPropagation()">
    <button type="button" class="w-full text-left px-4 py-2 text-sm ..." (click)="doThing()">
      Item
    </button>
  </app-dropdown-panel>
  }
</div>
```

This works because `class` on `<app-dropdown-panel>` lands on the *host* element
(same limitation `app-card` documents), and the component's inner box has no
`width`/`position` of its own — it just fills the host completely, so sizing and
positioning utilities on the host apply exactly as if they were on the visible
box. A caller can also add extra `p-*` there for panels needing more breathing
room than the built-in `py-1` (the avatar/support/org-switch header menus do this)
— that padding lands *outside* the visible bordered box rather than inside it
(a few pixels of position offset, not a visible double-box), so prefer wrapping
your own content in an inner `<div class="p-2">` when you want padding that's
unambiguously inside the border.

## `z-*` must go on the host, not "into" the component

The component's own inner box intentionally has no `position` set (`static`), so
a `z-index` there would silently do nothing — z-index only takes effect on a
positioned element. Since the *host* is what the caller makes `absolute`/`fixed`,
`z-*` has to be a class on `<app-dropdown-panel>` itself, not something this
component could bake in generically. Learned this mid-migration: an earlier draft
put `z-50` in the component's SCSS and it had zero effect once the outer `div`'s
own `z-50` was dropped during the swap.

## Not yet migrated: pages with no dark-mode support at all

`catalogs.component.html` and `organization-details.component.html` each have one
dropdown that still uses plain `bg-white` with no dark variant — left alone
deliberately, since those two pages don't support dark mode *anywhere* yet
(`grep -c "dark:"` returns ~0 across the whole file). Migrating just the dropdown
would flip it to a dark surface while the rest of the page stayed white. See
[[project_dropdown_panel_consolidation]] — migrate their dropdowns as part of
adding real dark-mode support to those pages, not before.
