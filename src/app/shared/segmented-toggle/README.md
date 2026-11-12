# app-segmented-toggle (`SegmentedToggleComponent`)

A choice between two or three options as the segments of one control. The chosen one is a raised piece that slides
over a sunken track. For switching **how the same thing is looked at** (the overview as a seller or as a buyer); use
`app-tabs` for sections and `app-view-toggle` for grid/list.

```html
<app-segmented-toggle [options]="options" [value]="view" label="WORKSPACE._view_as" (valueChange)="view = $event" />
```

| Input / Output | Meaning |
|---|---|
| `options` (required) | `{ value, label (i18n key), dataCy? }[]`. |
| `value` | The `value` of the chosen option. |
| `label` | i18n key that names the group for assistive technology. |
| `dataCy` | `data-cy` of the control. |
| `(valueChange)` | The value of the option the user chose (not emitted for the one already chosen). |

The focus ring only shows for the keyboard (`focus-visible`), not after a click. The slide respects
`prefers-reduced-motion`. Colors are role classes (`bg-primary-100`, `text-on-primary`, `bg-surface-muted`...), none
hardcoded.
