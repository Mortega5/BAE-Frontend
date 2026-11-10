import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn } from 'src/app/models/table-column.model';
import { BadgeStatus } from 'src/app/shared/badge/badge.component';
import { Dataset, datasetFormat, datasetSize, DatasetVisibility } from 'src/app/services/dataset.service';

const hasLongWord = (text: string | undefined, threshold = 20) =>
  !!text && text.split(/\s+/).some(word => word.length > threshold);

/** An answer without visibility (an old proxy) is a private dataset. */
export const datasetVisibility = (dataset: Dataset): DatasetVisibility => dataset.visibility ?? 'private';

export const datasetVisibilityBadgeVariant = (visibility: DatasetVisibility): BadgeStatus =>
  ({ private: 'neutral', public: 'info', custom: 'warning' } as const)[visibility];

/** Columns of the datasets picker, shared by create-product-spec (selectable) and update-product-spec (read-only).
 * An incomplete dataset (file service unreachable) shows `-` for what it lacks. */
export function buildDatasetColumns(): TableColumn[] {
  return [
    { header: 'DATASETS._name', getValue: (item: Dataset) => item.name ?? '-', cellClass: (item: Dataset) => hasLongWord(item.name) ? 'break-all' : 'break-words' },
    { header: 'DATASETS._format', getValue: (item: Dataset) => datasetFormat(item), width: 'w-[100px]', hideOnMobile: true, type: 'badge' },
    { header: 'DATASETS._size', getValue: (item: Dataset) => datasetSize(item), width: 'w-[110px]', hideOnMobile: true },
    {
      header: 'DATASETS._visibility', type: 'status-badge', width: 'w-[130px]', hideOnMobile: true,
      getValue: (item: Dataset) => `DATASETS._visibility_${datasetVisibility(item)}`,
      getStatus: (item: Dataset) => datasetVisibilityBadgeVariant(datasetVisibility(item)),
    },
    { header: 'DATASETS._version', getValue: (item: Dataset) => item.version, width: 'w-[100px]' },
  ];
}

/** The datasets endpoint has no total, so the whole list is loaded and paged here. */
export function pageOfDatasets(datasets: Dataset[], params: PageRequest): PageResult<Dataset> {
  return { items: datasets.slice(params.offset, params.offset + params.limit), total: datasets.length };
}
