import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn, TableSort } from 'src/app/models/table-column.model';

interface BaseFormField {
  name: string;
  label: string;
  icon?: IconDefinition;
  required?: boolean;
  readonly?: boolean;
  colSpan?: number;
  defaultValue?: any;
  dataCy?: string;
}

interface TextBaseFormField extends BaseFormField {
  maxLength?: number;
  placeholder?: string;
}

export interface StringFormField extends TextBaseFormField {
  type: 'string';
}

export interface NumberFormField extends BaseFormField {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

export interface SelectOption {
  value: any;
  label: string;
}

export interface SelectableFormField extends BaseFormField {
  type: 'select';
  options: SelectOption[];
  multiple?: boolean;
}

export interface BooleanFormField extends BaseFormField {
  type: 'boolean';
}

export interface MarkdownTextareaFormField extends TextBaseFormField {
  type: 'markdownTextarea';
  rows?: number;
}

export interface TextareaFormField extends TextBaseFormField {
  type: 'textarea';
  rows?: number;
}

export interface StatusPickerOption {
  value: string;
  label: string;
  activeClass: string;
  dataCy?: string;
}

export interface StatusPickerFormField extends BaseFormField {
  type: 'statusPicker';
  options: StatusPickerOption[];
}

const LIFECYCLE_STATUSES = ['Active', 'Launched', 'Retired', 'Obsolete'] as const;
export type LifecycleStatus = typeof LIFECYCLE_STATUSES[number];

const LIFECYCLE_STATUS_ACTIVE_CLASSES: Record<LifecycleStatus, string> = {
  Active: 'text-blue-500',
  Launched: 'text-green-700 dark:text-green-400',
  Retired: 'text-red-700 dark:text-red-400',
  Obsolete: 'text-gray-700 dark:text-gray-400',
};

const LIFECYCLE_STATUS_LABELS: Record<LifecycleStatus, string> = {
  Active: 'UPDATE_CATALOG._active',
  Launched: 'UPDATE_CATALOG._launched',
  Retired: 'UPDATE_CATALOG._retired',
  Obsolete: 'UPDATE_CATALOG._obsolete',
};

export function buildLifecycleStatusOptions(dataCyPrefix: string = '', disabledStatuses: string[] = []): StatusPickerOption[] {
  return LIFECYCLE_STATUSES
    .filter(status => !disabledStatuses.includes(status))
    .map(status => ({
      value: status,
      label: LIFECYCLE_STATUS_LABELS[status],
      activeClass: LIFECYCLE_STATUS_ACTIVE_CLASSES[status],
      dataCy: `${dataCyPrefix}${status}`,
    }));
}

export interface MultiValueStringFormField extends TextBaseFormField {
  type: 'multiValueString';
  addLabel?: string;
}

export interface UnitValueFormField extends BaseFormField {
  type: 'unitValue';
  addLabel?: string;
  valuePlaceholder?: string;
  unitPlaceholder?: string;
}

export interface RangeValueFormField extends BaseFormField {
  type: 'rangeValue';
  fromPlaceholder?: string;
  toPlaceholder?: string;
  unitPlaceholder?: string;
  setLabel?: string;
}

export interface TableFormField extends BaseFormField {
  type: 'table';
  columns: TableColumn[];
  items: any[];
  multiple?: boolean;
  /** When provided, rows for which this returns false are disabled (no toggle, no row click). */
  isSelectable?: (item: any) => boolean;
}

export interface PaginatedTableFormField extends BaseFormField {
  type: 'paginatedTable';
  columns: TableColumn[];
  fetchPage: (params: PageRequest) => Promise<PageResult<any>>;
  multiple?: boolean;
  pageSizeOptions?: number[];
  defaultSort?: TableSort;
  /** When provided, rows for which this returns false are disabled (no toggle, no row click). */
  isSelectable?: (item: any) => boolean;
}

export type CodeLanguage = 'json' | 'yaml' | 'typescript' | 'javascript';
export type CodeTheme = 'auto' | 'oneDark';

export interface CodeFormField extends BaseFormField {
  type: 'code';
  language: CodeLanguage;
  minHeight?: string;
  placeholder?: string;
  lineNumbers?: boolean;
  theme?: CodeTheme;
}

export type FormField = StringFormField | NumberFormField | SelectableFormField | BooleanFormField | MarkdownTextareaFormField | TextareaFormField | StatusPickerFormField | MultiValueStringFormField | UnitValueFormField | RangeValueFormField | TableFormField | PaginatedTableFormField | CodeFormField;
