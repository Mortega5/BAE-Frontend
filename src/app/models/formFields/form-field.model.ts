interface BaseFormField {
  name: string;
  label: string;
  required?: boolean;
  readonly?: boolean;
  colSpan?: number;
  defaultValue?: any;
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
}

export interface StatusPickerFormField extends BaseFormField {
  type: 'statusPicker';
  options: StatusPickerOption[];
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

export interface TableColumn<T = any> {
  header: string;
  getValue: (item: T) => string | number | boolean | null | undefined;
  cellClass?: string | ((item: T) => string);
  /** Tailwind width class applied to the `<th>` to control column width when used with `table-fixed`. e.g. `'w-1/2'`, `'w-32'`. Columns without a width share the remaining space equally. */
  width?: string;
}

export interface TableFormField extends BaseFormField {
  type: 'table';
  columns: TableColumn[];
  items: any[];
  multiple?: boolean;
}

export type FormField = StringFormField | NumberFormField | SelectableFormField | BooleanFormField | MarkdownTextareaFormField | TextareaFormField | StatusPickerFormField | MultiValueStringFormField | UnitValueFormField | RangeValueFormField | TableFormField;
