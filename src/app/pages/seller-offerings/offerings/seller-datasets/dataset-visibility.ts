import { FormField } from 'src/app/models/formFields/form-field.model';
import { DatasetVisibility } from 'src/app/services/dataset.service';

/** The visibility picker of a dataset, shared by every form that uploads one. */
export const DATASET_VISIBILITY_FIELD: FormField = {
  type: 'select', name: 'visibility', label: 'DATASETS._visibility', required: true, defaultValue: 'private', dataCy: 'datasetVisibility',
  options: [
    { value: 'private', label: 'DATASETS._visibility_private', subtitle: 'DATASETS._visibility_private_hint' },
    { value: 'public', label: 'DATASETS._visibility_public', subtitle: 'DATASETS._visibility_public_hint' },
    { value: 'custom', label: 'DATASETS._visibility_custom', subtitle: 'DATASETS._visibility_custom_hint' },
  ],
  searchable: true, showSearch: false,
};

/** The visibility of a dataset that is sold: a public one can be read by anyone, so there is nothing to sell. */
export const DATASET_SOLD_VISIBILITY_FIELD: FormField = {
  ...DATASET_VISIBILITY_FIELD,
  options: [
    { value: 'private', label: 'DATASETS._visibility_private', subtitle: 'DATASETS._visibility_private_hint' },
    { value: 'custom', label: 'DATASETS._visibility_custom', subtitle: 'DATASETS._visibility_custom_hint' },
  ],
} as FormField;

/** What the chosen visibility means, to show under the picker. */
export const datasetVisibilityHint = (visibility: DatasetVisibility): string => `DATASETS._visibility_${visibility}_hint`;
