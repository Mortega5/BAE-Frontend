# Table Input Component

`app-table-input` (`TableInputComponent`) renders a selectable/sortable table from a list of columns (`TableColumn[]`) and items. It implements `ControlValueAccessor`, so it can be used with `formControlName`/`ngModel`.

## Theming

Table colors are CSS variables, but — unlike most components — they're **not** defined on this component's own `:host`. They're defined globally in [src/styles.css](../../../../styles.css) (on `body` / `.dark body`), specifically so any theme can override them by simply redeclaring the variable at that same scope. A component-scoped `:host` declaration would always win over an outside override (it's closer to the elements that consume it than anything in a global stylesheet could be), which defeats the point of a themeable token — so the definitions live outside the component, and [table-input.component.css](./table-input.component.css) only *consumes* them via named classes (`.table-input-container`, `.table-input-header`, etc.) applied in the HTML. To change the table's appearance app-wide, edit `styles.css`; to change what a class does with a variable, edit `table-input.component.css` — never hardcode a color in the HTML.

Each variable has a default value on `body` (light theme) and, where it differs, an override on `.dark body` (dark theme).

| Variable | Affects | Light default | Dark default |
|---|---|---|---|
| `--table-bg` | Table container background | `#fff` | `rgb(var(--theme-secondary-300))` |
| `--table-text` | Default cell text color | `rgb(107 114 128)` (gray-500) | `rgb(229 231 235)` (gray-200) |
| `--table-border-color` | Table container border | `rgb(var(--theme-primary-100))` | `rgb(var(--theme-secondary-200))` |
| `--table-header-bg` | Header row background (`<thead>`) | `rgb(var(--theme-secondary-400))` | `rgb(var(--theme-secondary-200))` |
| `--table-header-text` | Header text color (labels and sort button) | `var(--theme-primary-text)` | *(inherits the same value)* |
| `--table-header-hover-bg` | Background on hover over the column sort button (`.table-input-sort-btn:hover`) | `rgb(var(--theme-primary-50) / 30%)` | `rgb(var(--theme-secondary-300) / 60%)` |
| `--table-row-border-color` | Divider line between body rows | `rgb(var(--theme-primary-50) / 40%)` | `rgb(var(--theme-secondary-200))` |
| `--table-row-hover-bg` | Background on hover over a selectable/clickable row | `rgb(var(--theme-secondary-50))` | `rgb(var(--theme-secondary-400))` |
| `--table-row-selected-bg` | Background of a selected row | `rgb(var(--theme-secondary-50))` | `rgb(var(--theme-primary-100) / 20%)` |
| `--table-empty-text` | Text color for the "No items available" row and the actions-column empty label | `var(--theme-primary-text)` | *(inherits the same value)* |
| `--table-action-bg` | Background of action/icon-button cells (default, overridable per-action via `buttonClass`) — ghost style, transparent until hovered | `transparent` | *(inherits the same value)* |
| `--table-action-hover-bg` | Hover background of action/icon-button cells | `rgb(var(--theme-secondary-50))` | `rgb(var(--theme-secondary-300) / 60%)` |
| `--table-action-text` | Icon color inside action/icon-button cells (idle) | `rgb(148 163 184)` (slate-400) | *(inherits the same value)* |
| `--table-action-text-hover` | Icon color inside action/icon-button cells (hover) | `rgb(var(--theme-primary-100))` | `rgb(var(--theme-primary-50))` |
| `--table-action-focus-ring` | Focus ring color of action/icon-button cells | `rgb(var(--theme-primary-50) / 50%)` | *(inherits the same value)* |
| `--table-selection-accent` | Checked-state color of the row selection checkbox/radio | `rgb(var(--theme-primary-100))` | *(inherits the same value)* |
| `--table-selection-bg` | Unchecked background of the row selection checkbox/radio | `rgb(243 244 246)` (gray-100) | *(inherits the same value)* |
| `--table-selection-border` | Border of the row selection checkbox/radio | `rgb(209 213 219)` (gray-300) | *(inherits the same value)* |
| `--table-selection-ring` | Focus ring color of the row selection checkbox/radio | `rgb(var(--theme-primary-50) / 50%)` | *(inherits the same value)* |

Most of these build on the global theme tokens (`--theme-primary-*`, `--theme-secondary-*`, `--theme-primary-text`) defined in `src/app/themes/*.theme.scss`, so switching the app theme (bae/dome) updates them automatically. `--table-selection-bg`/`-border` are the only plain fixed colors left (no theme wired up yet) — override them on `body`/`.dark body` in `styles.css` if that's ever needed.


## Inputs / Outputs

| Name | Type | Description |
|---|---|---|
| `columns` | `TableColumn[]` | Column definitions (header, cell type, sortKey, actions...) |
| `items` | `any[]` | Rows to render |
| `multiple` | `boolean` | Multiple selection (checkbox) vs. single (radio) |
| `readonly` | `boolean` | Disables selection/click on rows |
| `selectable` | `boolean` | Shows the selection column |
| `clickable` | `boolean` | Emits `rowClick` when a row is clicked |
| `isSelectable` | `(item) => boolean` | Determines whether a given row can be selected |
| `sort` | `TableSort` | Current sort state (`key` + `direction`) |
| `emptyMessage` | `string` | i18n key shown when `items` is empty. Omit to keep the default, untranslated "No items available". |
| `rowClick` | `EventEmitter<any>` | Emitted when a row is clicked (if `clickable`) |
| `sortChange` | `EventEmitter<string>` | Emitted with the `sortKey` when the sort button is clicked |
