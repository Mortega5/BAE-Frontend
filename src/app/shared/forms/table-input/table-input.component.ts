import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { TableColumn } from 'src/app/models/table-column.model';

const DEFAULT_DATE_FORMAT = 'EEEE, dd/MM/yy, HH:mm';

@Component({
  selector: 'app-table-input',
  standalone: true,
  imports: [CommonModule, TranslateModule, FaIconComponent],
  templateUrl: './table-input.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TableInputComponent),
      multi: true,
    },
    DatePipe,
  ],
})
export class TableInputComponent implements ControlValueAccessor {
  @Input() columns: TableColumn[] = [];
  @Input() items: any[] = [];
  @Input() multiple: boolean = false;
  @Input() readonly: boolean = false;
  @Input() selectable: boolean = true;
  @Input() clickable: boolean = false;
  @Output() rowClick = new EventEmitter<any>();

  selected: any[] = [];
  tooltipText: string | null = null;
  tooltipPosition = { top: 0, left: 0 };
  private isDisabled: boolean = false;

  constructor(private datePipe: DatePipe) { }

  get isReadonly(): boolean {
    return this.readonly || this.isDisabled;
  }

  private onChange = (_: any) => { };
  private onTouched = () => { };

  writeValue(value: any): void {
    if (this.multiple) {
      this.selected = Array.isArray(value) ? value : [];
    } else {
      this.selected = value != null ? [value] : [];
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  isSelected(item: any): boolean {
    return this.selected.some(s => s === item || (s?.id != null && s.id === item?.id));
  }

  toggle(item: any): void {
    if (this.isReadonly || !this.selectable) return;
    if (this.multiple) {
      const exists = this.isSelected(item);
      this.selected = exists
        ? this.selected.filter(s => s !== item && s?.id !== item?.id)
        : [...this.selected, item];
      this.onChange(this.selected);
    } else {
      const alreadySelected = this.isSelected(item);
      this.selected = alreadySelected ? [] : [item];
      this.onChange(alreadySelected ? null : item);
    }
    this.onTouched();
  }

  onRowClick(item: any, event?: Event): void {
    if (this.isReadonly) return;
    this.toggle(item);
    if (this.clickable) {
      event?.stopPropagation();
      this.rowClick.emit(item);
    }
  }

  onColumnAction(column: TableColumn, item: any, event: Event): void {
    event.stopPropagation();
    if (column.type === 'icon-button') {
      column.onClick(item);
    }
  }

  showTooltip(event: MouseEvent, column: TableColumn): void {
    if (column.type !== 'icon-button' || !column.tooltip) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.tooltipPosition = { top: rect.top - 8, left: rect.left + rect.width / 2 };
    this.tooltipText = column.tooltip;
  }

  hideTooltip(): void {
    this.tooltipText = null;
  }

  getCellClass(column: TableColumn, item: any): string {
    if (!column.cellClass) return '';
    return typeof column.cellClass === 'function' ? column.cellClass(item) : column.cellClass;
  }

  getCellValue(column: TableColumn, item: any): string {
    if (column.type === 'icon-button' || column.type === 'date') return '';
    const value = column.getValue ? column.getValue(item) : null;
    return value == null ? '' : String(value);
  }

  getDateValue(column: TableColumn, item: any): string {
    if (column.type !== 'date') return '';
    return this.datePipe.transform(column.getValue(item), column.format ?? DEFAULT_DATE_FORMAT) ?? '-';
  }

}
