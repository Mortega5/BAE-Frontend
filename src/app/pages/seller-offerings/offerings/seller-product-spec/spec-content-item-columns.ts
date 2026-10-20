import { faEdit, faTrash } from '@fortawesome/pro-solid-svg-icons';
import { findIconByName } from 'src/app/config/popular-icons';
import { TableColumn } from 'src/app/models/table-column.model';

export type SpecContentItemType = 'feature' | 'benefit' | 'usecase';

export interface SpecContentItem {
  name: string;
  description: string;
  icon?: string | null;
}

/** Columns for the key features / business benefits / use cases tables, shared by
 * create-product-spec and update-product-spec. Only key features show their icon. */
export function buildSpecContentItemColumns(
  type: SpecContentItemType,
  onEdit: (item: SpecContentItem) => void,
  onDelete: (item: SpecContentItem) => void,
): TableColumn<SpecContentItem>[] {
  const columns: TableColumn<SpecContentItem>[] = [
    { header: 'CREATE_PROD_SPEC._item_name', getValue: item => item.name },
    { header: 'CREATE_PROD_SPEC._description', cellClass: 'break-words', getValue: item => item.description || '-' },
    {
      header: 'CREATE_PROD_SPEC._actions', type: 'actions', width: 'w-36',
      actions: [
        { icon: faEdit, tooltip: 'CREATE_PROD_SPEC._edit', dataCy: `edit-${type}`, onClick: onEdit },
        {
          icon: faTrash, tooltip: 'CREATE_PROD_SPEC._delete', dataCy: `delete-${type}`,
          buttonClass: 'bg-red-500 hover:bg-red-600 focus:ring-red-300 text-white',
          onClick: onDelete,
        },
      ],
    },
  ];

  if (type === 'feature') {
    columns.unshift({ header: 'CREATE_PROD_SPEC._icon', type: 'icon', width: 'w-20', getValue: item => findIconByName(item.icon) });
  }
  return columns;
}
