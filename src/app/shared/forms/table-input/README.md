# Table Input Component

`app-table-input` (`TableInputComponent`) renders a selectable/sortable table from a list of columns (`TableColumn[]`) and items. It implements `ControlValueAccessor`, so it can be used with `formControlName`/`ngModel`.

## Theming

Table colors are not hardcoded in the Tailwind classes in the HTML: they're defined as CSS variables in [table-input.component.css](./table-input.component.css), and the HTML only consumes them via Tailwind's arbitrary value syntax (`bg-[var(--table-header-bg)]`, etc.). To change the table's appearance, edit only that CSS file — not the HTML.

Each variable has a default value in `:host` (light theme) and, where applicable, an override in `:host-context(.dark)` (dark theme).

| Variable | Affects | Light default | Dark default |
|---|---|---|---|
| `--table-border-color` | Table container border | `rgb(var(--theme-primary-100))` | `rgb(var(--theme-secondary-200))` |
| `--table-header-bg` | Header row background (`<thead>`) | `rgb(var(--theme-primary-100))` | `rgb(var(--theme-secondary-200))` |
| `--table-header-text` | Header text color (labels and sort button) | `var(--theme-primary-text)` | *(inherits the same value)* |
| `--table-header-hover-bg` | Background on hover over the column sort button (`.table-sort-btn:hover`) | `rgb(var(--theme-primary-50) / 30%)` | `rgb(var(--theme-secondary-300) / 60%)` |
| `--table-row-border-color` | Divider line between body rows | `rgb(var(--theme-primary-50) / 40%)` | `rgb(var(--theme-secondary-200))` |
| `--table-row-hover-bg` | Background on hover over a selectable/clickable row | `rgb(var(--theme-primary-50) / 25%)` | `rgb(var(--theme-secondary-400))` |
| `--table-row-selected-bg` | Background of a selected row | `rgb(var(--theme-primary-50) / 35%)` | `rgb(var(--theme-primary-100) / 20%)` |

These variables build on the global theme tokens (`--theme-primary-*`, `--theme-secondary-*`, `--theme-primary-text`) defined in `src/app/themes/*.theme.scss`. Switching the app theme (bae/dome) automatically updates these colors without touching the component.


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
| `rowClick` | `EventEmitter<any>` | Emitted when a row is clicked (if `clickable`) |
| `sortChange` | `EventEmitter<string>` | Emitted with the `sortKey` when the sort button is clicked |
