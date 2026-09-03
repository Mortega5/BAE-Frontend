# app-side-nav (`SideNavComponent`)

Shared sidebar-nav + content shell, consolidating the near-identical "desktop
sidebar list + mobile off-canvas drawer + `<router-outlet>`" layout duplicated
across `seller-offerings`, `product-orders`, `product-inventory`, `admin`,
`usage-specs` and `user-profile`. Adopt incrementally, same approach as
[app-button](../button/README.md)/[app-card](../content-card/README.md).

The mobile nav is a plain Angular-driven off-canvas drawer (no Flowbite) —
earlier it was a Flowbite dropdown wired up via `data-dropdown-toggle` +
`initFlowbite()`, but nothing called `initFlowbite()` after the page-level
`ngAfterViewInit()` calls that used to do it were dropped during migration, so
the toggle silently did nothing. Rewritten to need no external JS init at all.

## Data model

```ts
interface SideNavItem {
  label: string;              // i18n key
  routerLink?: string | string[]; // required unless `onClick` is set instead
  onClick?: () => void;        // non-navigational item (e.g. opens an external URL) — renders as a <button>, no active-state
  icon?: IconName;             // resolved via findButtonIcon, same registry app-button uses
  count?: number;              // omit to hide the badge — the caller computes this however it needs to
  exact?: boolean;              // [routerLinkActiveOptions] — defaults to {exact: false}, ignored for onClick items
  dataCy?: string;
}

interface SideNavSection {
  label?: string;               // i18n key for an optional uppercase divider above this group
  items: SideNavItem[];
}
```

`onClick` exists for `user-profile`'s "payment dashboard"/"LEAR" items, which
fetch a URL and `window.open` it rather than navigating anywhere — there's no
route for `routerLinkActive` to match, so those items render as a plain
`<button>` (same padding/hover/rounded-2xl look, just never highlighted). Any
`onClick` item automatically gets a small external-link icon
(`faArrowUpRightFromSquare`) next to its label, signalling it opens something
rather than navigating in place — this is fixed, not a per-item `icon` you set.

**The component never fetches anything itself.** Every existing page computes
its counts differently (parallel per-resource HTTP calls, one bulk call, or
none at all) — `count` is just a plain number the caller already has by the
time it builds the `sections` array. There's no `disabled` flag either: no
page in this app has a visible-but-unclickable nav item today, only
shown-or-omitted — if a page needs an item hidden, it just doesn't put it in
the array (e.g. `catalogManagementEnabled ? [...] : []`).

## Usage

```html
<app-side-nav [sections]="navSections" [title]="'NS._my_offerings'" mobileLabel="NS._offerings">
  <router-outlet></router-outlet>
  <div sideNavFooter>
    <!-- optional: rendered at the bottom of the desktop sidebar only -->
  </div>
</app-side-nav>
```

**Always bind `title` with brackets (`[title]="'NS._key'"`), never as a plain
attribute (`title="NS._key"`).** `title` is a native, global HTML attribute —
Angular feeds a plain (unbracketed) attribute to a matching `@Input` *without*
removing it from the DOM, so `title="NS._my_offerings"` also leaves a literal
`title="NS._my_offerings"` attribute on the host element, which the browser
then shows as its native hover tooltip over the *entire* side-nav (sidebar +
projected content) — the raw, untranslated i18n key, on hover, seemingly at
random depending on where the cursor lands. `mobileLabel` doesn't have this
problem (it isn't a native HTML attribute name), so it's fine as a plain
attribute.

`title` is an optional i18n key shown above the desktop list and inside the
mobile drawer's header — omit for no heading. `mobileLabel` is an optional
i18n key used only as the hamburger button's `aria-label` (falls back to the
literal string `"Menu"`, untranslated, matching the pre-migration button text)
— it's not rendered on screen.

`showDesktopSidebar` (default `true`) hides the whole desktop sidebar column
(list + `sideNavFooter`) while leaving the mobile hamburger/drawer alone —
my-offerings passes `[showDesktopSidebar]="isListView"` so the create/edit
child routes get the full width on desktop but the mobile nav stays reachable
throughout.

The `<router-outlet>` is projected in by the page, not owned by this
component — it lands in the unnamed default slot (everything that isn't
tagged `sideNavFooter`), so it can go anywhere in the tag's content, in any
order relative to the footer.

## What it owns vs. what stays on the page

The component owns the full responsive shell: the mobile top bar
(hamburger + title), the off-canvas backdrop + drawer (same section/item
list — icons, count badges, active-state and all — as the desktop sidebar,
via a shared `<ng-template>` rendered into both places), and the desktop
sidebar list itself. The page's own component still owns: the
`<router-outlet>` (or any other content) filling the remaining width,
building the `sections` array (including computing any `count`s), and
anything that isn't navigation (e.g. my-offerings' bottom "help" card, passed
in via the `sideNavFooter` slot — desktop-only, there's no mobile equivalent).

The drawer closes itself on a backdrop click, an Escape keypress, or a nav
link click inside it (`(click)="closeOnClick && closeMobileMenu()"` — the
shared template takes `closeOnClick` as context so the same markup instance
rendered into the desktop sidebar doesn't try to close a drawer that isn't
open there). It also locks body scroll (`document.body` gets `overflow-hidden`
via `Renderer2`) while open, and sets `inert` on the backdrop/drawer while
closed so a keyboard user can't tab into off-screen, invisible controls.

## `class` doesn't reach the inner shell

Same limitation as `app-button`/`app-card`: a `class="..."` on `<app-side-nav>`
lands on the *host* element, not the `.w-full.flex` div the component renders
internally. There's no `variant`/color customization yet either — this
component doesn't render any of its own background/border, it only lays out
whatever the page's existing colors already are (`bg-secondary-50`,
`bg-primary-100`, etc., inline in the template) — nothing to theme yet since no
migrated page has asked for a different look.
