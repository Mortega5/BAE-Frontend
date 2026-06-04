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
  value: string;
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

export type FormField = StringFormField | NumberFormField | SelectableFormField | BooleanFormField | MarkdownTextareaFormField;
