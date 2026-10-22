# app-tabs (`TabsComponent`)

Shared underlined tab strip, consolidating the hand-rolled "As customer / As provider"
tabs that were duplicated across `product-orders` (orders and invoices) and quotes.
Adopt incrementally, same approach as [app-button](../button/README.md),
[app-card](../content-card/README.md) and [app-side-nav](../side-nav/README.md).

## Usage

Each tab is an `<ng-template appTab>` child. The active tab's template is rendered
below the strip; anything projected directly into `app-tabs` is rendered after it,
for every tab.

```html
<!-- One body per tab -->
<app-tabs [(activeTab)]="section">
  <ng-template appTab="PROFILE._general" tabId="general">…general…</ng-template>
  <ng-template appTab="PROFILE._billing" tabId="billing">…billing…</ng-template>
</app-tabs>

<!-- Same body for every tab (e.g. a table filtered by role): leave the templates
     empty and react to activeTabChange -->
<app-tabs [activeTab]="role" (activeTabChange)="onRoleChange($event)">
  <ng-template appTab="PRODUCT_ORDERS._as_customer" [tabId]="buyerRole"
    tabIcon="person-arrow-down-to-line" dataCy="asCustomerTab"></ng-template>
  <ng-template appTab="PRODUCT_ORDERS._as_provider" [tabId]="sellerRole"
    tabIcon="person-arrow-up-from-line" [tabHidden]="!isSeller"></ng-template>
  <app-filtered-paginated-table …></app-filtered-paginated-table>
</app-tabs>
```

## API

`app-tabs`
- `activeTab` / `activeTabChange` (two-way bindable): the active `tabId`. Unset, or
  pointing at a hidden tab, falls back to the first visible tab. `activeTabChange`
  only fires on a user click, not on that fallback.

`appTab` directive (on `<ng-template>`)
- `appTab`: i18n key for the label.
- `tabId`: identifier emitted by `activeTabChange`.
- `tabIcon?`: `IconName`, resolved via `findButtonIcon` (same registry as
  `app-button`; register new icons in `config/popular-icons.ts`).
- `tabHidden`: hides the tab, e.g. the provider tab for a session without the
  seller role.
- `dataCy?`: `data-cy` on the tab button.

The tab buttons are real `<button role="tab">` elements with `aria-selected`.
