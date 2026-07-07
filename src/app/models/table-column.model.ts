import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface BaseTableColumn<T = any> {
  header: string;
  /** Tailwind width class applied to the `<th>` to control column width when used with `table-fixed`. e.g. `'w-1/2'`, `'w-32'`. Columns without a width share the remaining space equally. */
  width?: string;
  cellClass?: string | ((item: T) => string);
  dataCy?: string;
  getValue?: (item: T) => any;
  /** Hides the column below the `sm` breakpoint. Defaults to always visible. */
  hideOnMobile?: boolean;
}

export interface TextTableColumn<T = any> extends BaseTableColumn<T> {
  type?: 'text';
}

export interface BadgeTableColumn<T = any> extends BaseTableColumn<T> {
  type: 'badge';
  getValue: (item: T) => string | number | boolean | null | undefined;
}

export interface IconButtonTableColumn<T = any> extends BaseTableColumn<T> {
  type: 'icon-button';
  icon: IconDefinition;
  onClick: (item: T) => void;
  /** Defaults to always visible when omitted. */
  showIf?: (item: T) => boolean;
  tooltip?: string;
}

export interface TableColumnAction<T = any> {
  icon: IconDefinition;
  onClick: (item: T) => void;
  /** Defaults to always visible when omitted. */
  showIf?: (item: T) => boolean;
  tooltip?: string;
  dataCy?: string;
  /** Tailwind classes for the button background/focus ring. Defaults to the primary color. */
  buttonClass?: string;
}

export interface ActionsTableColumn<T = any> extends BaseTableColumn<T> {
  type: 'actions';
  actions: TableColumnAction<T>[];
}

export interface DateTableColumn<T = any> extends BaseTableColumn<T> {
  type: 'date';
  getValue: (item: T) => string | number | Date | null | undefined;
  /** Angular DatePipe format string. Defaults to `'EEEE, dd/MM/yy, HH:mm'`. */
  format?: string;
}

export type TableColumn<T = any> = TextTableColumn<T> | BadgeTableColumn<T> | IconButtonTableColumn<T> | DateTableColumn<T> | ActionsTableColumn<T>;
