# app-empty-state (`EmptyStateComponent`)

Friendly placeholder for a list or grid with nothing to show: an icon in a circle, a
heading, an optional description and optional actions.

```html
<app-empty-state class="col-span-full" [icon]="faBoxOpen" heading="PRODUCT_INVENTORY._not_found"
  description="PRODUCT_INVENTORY._not_found_desc">
  <app-button suffixIcon="arrow-right" (click)="goToMarketplace()">{{ 'DASHBOARD._browse_serv' | translate }}</app-button>
</app-empty-state>
```

| Input | Meaning |
|---|---|
| `heading` (required) | i18n key for the title. Named `heading`, not `title`, so it never turns into a native tooltip. |
| `description` | i18n key for the explanation line. |
| `icon` | Any fa `IconDefinition`; defaults to `faInbox`. |
| projected content | Actions (buttons/links), centered under the text. Nothing projected → no gap. |

Inside a CSS grid, put `class="col-span-full"` on the tag so it spans every column.
For "this record doesn't exist" pages use `app-not-found-state` instead.

## Colors are CSS variables, not hardcoded

It owns no tokens: the dashed box reuses `--card-inset-bg` / `--card-border`, the icon
circle `--card-bg` / `--button-link-text`, and the text `--theme-default-text` /
`--form-hint-text`, all defined in [src/styles.css](../../../styles.css).
