import { TableColumn } from 'src/app/models/table-column.model';
import { lifecycleStatusBadgeVariant, lifecycleStatusLabel } from 'src/app/shared/badge/badge.component';

/** Columns for the bundle step's product spec picker, shared by create-product-spec (selectable)
 * and update-product-spec (read-only). The selection checkbox comes from app-paginated-table. */
export function buildBundleProductColumns(): TableColumn[] {
  return [
    { header: 'CREATE_PROD_SPEC._product_name', getValue: (prod: any) => prod.name, cellClass: 'break-words' },
    {
      header: 'CREATE_PROD_SPEC._status', type: 'status-badge', hideOnMobile: true, width: 'w-[140px]',
      getValue: (prod: any) => lifecycleStatusLabel(prod.lifecycleStatus ?? ''),
      getStatus: (prod: any) => lifecycleStatusBadgeVariant(prod.lifecycleStatus),
    },
    {
      header: 'CREATE_PROD_SPEC._type', hideOnMobile: true, width: 'w-28',
      getValue: (prod: any) => prod.isBundle ? 'CREATE_PROD_SPEC._bundle' : 'CREATE_PROD_SPEC._simple',
    },
    { header: 'CREATE_PROD_SPEC._last_update', type: 'date', hideOnMobile: true, width: 'w-[200px]', getValue: (prod: any) => prod.lastUpdate },
  ];
}
