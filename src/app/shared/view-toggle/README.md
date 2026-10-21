# app-view-toggle (`ViewToggleComponent`)

Grid / list switch for result listings (marketplace search, catalogues...).

```html
<app-view-toggle [(mode)]="viewMode"></app-view-toggle>
```

`mode` is `'grid' | 'list'` (`ViewMode`); `(modeChange)` fires only when it actually
changes. Each button is a fixed 32px square with an fa-icon (`faGrid2` / `faListUl`),
`aria-pressed` for the current mode and a translated `aria-label`
(`DASHBOARD._grid_view` / `DASHBOARD._list_view`).

## Colors are CSS variables, not hardcoded

Like [app-dropdown-panel](../dropdown-panel/README.md), it owns no tokens: the box
reuses the app-card ones (`--card-bg`, `--card-border`, `--card-selected-bg` for the
selected button) and the text tokens `--form-hint-text` / `--theme-default-text` /
`--button-link-text`, all defined in [src/styles.css](../../../styles.css).

## Hiding it

`:host` keeps the default inline display, so a caller can hide or show it with plain
utility classes on the tag, e.g. `class="hidden sm:block"`.
