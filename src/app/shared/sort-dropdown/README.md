# app-sort-dropdown (`SortDropdownComponent`)

"Sort by: Recently added ▾": a link-style trigger that opens a menu with the orders to choose from. For the results of a
list. The page decides what each value asks the server for; this only shows the options and says which was chosen.

```html
<app-sort-dropdown [options]="sortOptions" [value]="sort" (valueChange)="selectSort($any($event))" />
```

| Input / Output | Meaning |
|---|---|
| `options` (required) | `{ value, label (i18n key) }[]`. |
| `value` | The `value` of the chosen option. |
| `label` | i18n key of the text before the chosen option. Defaults to `CATALOGS._sort_by` ("Sort by"). |
| `(valueChange)` | The value of the option the user chose (not emitted for the one already chosen). |

A click anywhere else closes the menu. The catalogs list and the catalog page still have their own copy of this menu;
they can move to this component.
