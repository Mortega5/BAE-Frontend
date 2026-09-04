import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ValidatorFn } from '@angular/forms';
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
  /** Extra validators merged with the ones `buildFormGroup` derives automatically (e.g. required, code-language checks). */
  validators?: ValidatorFn[];
  /** Maps a validator error key (e.g. 'email', 'maxlength', or a custom key set via `setErrors`)
   * to the i18n key shown under the field once it's touched+invalid. 'required' always shows
   * the shared `FORMS._required` message regardless of this map. */
  errorMessages?: Record<string, string>;
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
  placeholder?: string;
}

export interface DateFormField extends BaseFormField {
  type: 'date';
  min?: string;
  max?: string;
}

/** A prefix-dropdown (country calling code) + national-number input, combined into a
 * single dialable string value (e.g. "+34612345678") — same shape callers used to build
 * by hand as `phonePrefix.code + telephoneNumber`. */
export interface PhoneNumberFormField extends BaseFormField {
  type: 'phoneNumber';
}

export interface SelectOption {
  value: any;
  label: string;
  /** Rendered under the label in a muted, smaller style — only honored by `app-search-select`. */
  subtitle?: string;
}

export interface SelectableFormField extends BaseFormField {
  type: 'select';
  options: SelectOption[];
  multiple?: boolean;
  /** Renders as a filter-as-you-type search-select instead of a native `<select>`/`multiple-select`. */
  searchable?: boolean;
  placeholder?: string;
  /** Only honored when `searchable` — shows a "Create '<query>'" option when nothing matches. */
  allowCreate?: boolean;
  /** Resolves to the option to select on success; rejecting re-shows the create prompt. */
  onCreate?: (query: string) => Promise<SelectOption>;
}

export interface BooleanFormField extends BaseFormField {
  type: 'boolean';
}

/** Pill/bubble-style single-choice selector — same shape as `SelectableFormField` but rendered
 * as a row of clickable bubbles instead of a `<select>`. */
export interface BubbleSelectFormField extends BaseFormField {
  type: 'bubbleSelect';
  options: SelectOption[];
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

export interface AttachmentFormField extends BaseFormField {
  type: 'attachment';
  /** File type filter, e.g. "image/*" or ".pdf,.docx". Defaults to any file. */
  accept?: string;
  multiple?: boolean;
  maxFileSize?: number;
  dropLabel?: string;
  selectLabel?: string;
}

export type FormField = StringFormField | NumberFormField | DateFormField | PhoneNumberFormField | SelectableFormField | BooleanFormField | BubbleSelectFormField | MarkdownTextareaFormField | TextareaFormField | StatusPickerFormField | MultiValueStringFormField | UnitValueFormField | RangeValueFormField | TableFormField | PaginatedTableFormField | CodeFormField | AttachmentFormField;
